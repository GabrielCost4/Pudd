using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pudd.Domain.Entities;
using Pudd.Infrastructure;
using Pudd.Infrastructure.Repositories;
using Xunit;

namespace Pudd.Tests;

public class SqlInjectionTests
{
    [PostgresFact]
    public async Task SqlInjectionPayloadsAreTreatedAsData()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PUDD_TEST_POSTGRES")!);
        Assert.StartsWith("pudd_tests_", settings.Database);
        settings.Database = "pudd_tests_injection_" + Guid.NewGuid().ToString("N");
        var options = new DbContextOptionsBuilder<PuddDbContext>().UseNpgsql(settings.ConnectionString).Options;
        await using var db = new PuddDbContext(options);
        try
        {
            await db.Database.MigrateAsync();
            var user = new User { ID = Guid.NewGuid(), Name = "Pessoa segura", Email = "safe@example.test" };
            db.users.Add(user);
            await db.SaveChangesAsync();
            var repository = new UserRepository(db);
            foreach (var payload in new[] { "' OR 1=1 --", "'; DROP TABLE \"users\"; --", "' UNION SELECT NULL --" })
            {
                Assert.Null(await repository.ObterPorEmail(payload));
                Assert.Empty(await repository.SearchAsync(payload, includeBlocked: true));
                var post = new Post { ID = Guid.NewGuid(), UserID = user.ID, Content = payload };
                db.posts.Add(post);
                await db.SaveChangesAsync();
                db.ChangeTracker.Clear();
                Assert.Equal(payload, await db.posts.Where(p => p.ID == post.ID).Select(p => p.Content).SingleAsync());
                Assert.Equal(user.ID, (await repository.ObterPorEmail(user.Email))!.ID);
            }
            Assert.Equal(1, await db.users.CountAsync());
        }
        finally
        {
            Assert.StartsWith("pudd_tests_injection_", settings.Database);
            await db.Database.EnsureDeletedAsync();
        }
    }
}
