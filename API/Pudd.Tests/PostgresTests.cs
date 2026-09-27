using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pudd.Domain.Entities;
using Pudd.Infrastructure;
using Pudd.Infrastructure.Repositories;
using Xunit;

namespace Pudd.Tests;

// Executa somente quando informado um banco descartável com nome pudd_tests_*.
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PUDD_TEST_POSTGRES")))
            Skip = "Defina PUDD_TEST_POSTGRES para um banco PostgreSQL descartável pudd_tests_*.";
    }
}

public class PostgresTests
{
    [PostgresFact]
    public async Task MigrationsLikesConcurrencyCascadeAndCleanupWorkInPostgres()
    {
        var connection = Environment.GetEnvironmentVariable("PUDD_TEST_POSTGRES")!;
        var settings = new NpgsqlConnectionStringBuilder(connection);
        Assert.StartsWith("pudd_tests_", settings.Database);
        var options = new DbContextOptionsBuilder<PuddDbContext>().UseNpgsql(connection).Options;
        await using var db = new PuddDbContext(options);
        await db.Database.MigrateAsync();
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.False(db.Database.HasPendingModelChanges());
        var user = new User { ID = Guid.NewGuid(), Name = "Teste", Email = Guid.NewGuid() + "@example.test" };
        var post = new Post { ID = Guid.NewGuid(), User = user, UserID = user.ID, Content = "teste", ImagePath = "test/image.png" };
        db.posts.Add(post);
        await db.SaveChangesAsync();

        await Task.WhenAll(Enumerable.Range(0, 8).Select(async _ =>
        {
            await using var concurrent = new PuddDbContext(options);
            await new PostLikeRepository(concurrent).SetLikedAsync(user.ID, post.ID, true);
        }));
        Assert.Equal(1, await new PostLikeRepository(db).CountAsync(post.ID));
        await new PostLikeRepository(db).SetLikedAsync(user.ID, post.ID, false);
        await new PostLikeRepository(db).SetLikedAsync(user.ID, post.ID, false);
        Assert.Equal(0, await new PostLikeRepository(db).CountAsync(post.ID));
        await new PostLikeRepository(db).SetLikedAsync(user.ID, post.ID, true);

        // Duas versões lidas antes de qualquer edição: a segunda deve detectar o conflito.
        await using (var first = new PuddDbContext(options))
        await using (var second = new PuddDbContext(options))
        {
            var a = (await new PostRepository(first).GetByIdAsync(post.ID))!;
            var b = (await new PostRepository(second).GetByIdAsync(post.ID))!;
            a.Content = "primeira edição";
            a.UpdatedAt = DateTimeOffset.UtcNow;
            await new PostRepository(first).UpdateAsync(a);
            b.Content = "edição concorrente";
            b.UpdatedAt = DateTimeOffset.UtcNow;
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => new PostRepository(second).UpdateAsync(b));
        }

        db.comments.Add(new Comment { ID = Guid.NewGuid(), UserID = user.ID, PostID = post.ID, Content = "comentário" });
        await db.SaveChangesAsync();
        await using (var restricted = new PuddDbContext(options))
        {
            var error = await Assert.ThrowsAsync<PostgresException>(() =>
                restricted.users.Where(u => u.ID == user.ID).ExecuteDeleteAsync());
            Assert.Equal(PostgresErrorCodes.RestrictViolation, error.SqlState);
        }

        // Atualiza o token de concorrência antes de apagar a postagem neste contexto.
        await db.Entry(post).ReloadAsync();
        await new PostRepository(db).DeleteAsync(post);
        Assert.False(await db.comments.AnyAsync(c => c.PostID == post.ID));
        Assert.False(await db.postLikes.AnyAsync(l => l.PostID == post.ID));
        var job = await db.pendingImageDeletions.SingleAsync(j => j.Path == "test/image.png");
        var queue = new ImageDeletionQueue(db, options);
        await queue.RetryLaterAsync(job, default);
        db.ChangeTracker.Clear();
        var postponed = await db.pendingImageDeletions.SingleAsync(j => j.ID == job.ID);
        Assert.Equal(1, postponed.Attempts);
        Assert.True(postponed.NextAttemptAt > DateTimeOffset.UtcNow);
        await queue.CompleteAsync(job, default);
        Assert.False(await db.pendingImageDeletions.AnyAsync(j => j.ID == job.ID));
    }
}
