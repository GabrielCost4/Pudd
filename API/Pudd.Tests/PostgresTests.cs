using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
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
    public async Task DuplicateNamesStopMigrationWithoutRenamingExistingAccounts()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PUDD_TEST_POSTGRES")!);
        Assert.StartsWith("pudd_tests_", settings.Database);
        settings.Database = "pudd_tests_duplicates_" + Guid.NewGuid().ToString("N");
        var options = new DbContextOptionsBuilder<PuddDbContext>().UseNpgsql(settings.ConnectionString).Options;
        await using var db = new PuddDbContext(options);
        try
        {
            await db.GetService<IMigrator>().MigrateAsync("AddAccountActivity");
            foreach (var name in new[] { "Ana Silva", "  ANA  SILVA  " })
                await db.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO "users" ("ID", "Name", "Email", "PasswordHash", "Role", "IsBlocked")
                    VALUES ({Guid.NewGuid()}, {name}, {Guid.NewGuid() + "@example.test"}, {"unused"}, {0}, {false})
                    """);
            var error = await Assert.ThrowsAsync<PostgresException>(() => db.Database.MigrateAsync());
            Assert.Contains("Duplicate profile names", error.MessageText);
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand("SELECT COUNT(*) FROM \"users\" WHERE \"Name\" IN ('Ana Silva', '  ANA  SILVA  ')", connection);
            Assert.Equal(2L, await command.ExecuteScalarAsync());
        }
        finally
        {
            // This database is created by this test and always has the explicit disposable prefix.
            Assert.StartsWith("pudd_tests_duplicates_", settings.Database);
            await db.Database.EnsureDeletedAsync();
        }
    }

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
        var user = new User { ID = Guid.NewGuid(), Name = "Teste " + Guid.NewGuid().ToString("N"), Email = Guid.NewGuid() + "@example.test" };
        var post = new Post { ID = Guid.NewGuid(), User = user, UserID = user.ID, Content = "teste", ImagePath = "test/image.png" };
        db.posts.Add(post);
        await db.SaveChangesAsync();

        var uniqueName = "Race " + Guid.NewGuid().ToString("N");
        var inserted = await Task.WhenAll(Enumerable.Range(0, 2).Select(async index =>
        {
            await using var concurrent = new PuddDbContext(options);
            concurrent.users.Add(new User { ID = Guid.NewGuid(),
                Name = index == 0 ? uniqueName : "  " + uniqueName.ToUpperInvariant() + "  ",
                Email = Guid.NewGuid() + "@example.test" });
            try { await concurrent.SaveChangesAsync(); return true; }
            catch (DbUpdateException error) when (error.InnerException is PostgresException
                { SqlState: "23505", ConstraintName: "IX_users_NormalizedName" }) { return false; }
        }));
        Assert.Single(inserted, success => success);

        var searchUsers = new UserRepository(db);
        var term = "Busca" + Guid.NewGuid().ToString("N")[..8];
        db.users.AddRange(new[] { term, term + " B", term + " C", "X " + term }.Select(name =>
            new User { ID = Guid.NewGuid(), Name = name, Email = Guid.NewGuid() + "@example.test" }));
        await db.SaveChangesAsync();
        Assert.Equal(new[] { term, term + " B", term + " C" },
            (await searchUsers.SearchAsync(term.ToLowerInvariant(), false)).Select(result => result.Name));

        var accessTime = DateTimeOffset.Parse("2026-10-20T12:00:00Z");
        var users = new UserRepository(db);
        await users.RecordLoginAsync(user.ID, accessTime);
        await Task.WhenAll(Enumerable.Range(0, 8).Select(async _ =>
        {
            await using var concurrent = new PuddDbContext(options);
            await new UserRepository(concurrent).RecordAccessAsync(user.ID, accessTime.AddMinutes(5));
        }));
        await db.Entry(user).ReloadAsync();
        Assert.Equal(accessTime.AddMinutes(5), user.LastSeenAt);
        Assert.Equal(accessTime, user.LastLoginAt);

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
