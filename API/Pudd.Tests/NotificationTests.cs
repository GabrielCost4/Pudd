using System.Net;
using System.Net.Http.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pudd.Application.Contracts;
using Pudd.Domain.Entities;
using Pudd.Infrastructure;
using Pudd.Infrastructure.Repositories;
using Pudd.Application.Services;
using Pudd.Application.Validation;
using Xunit;

namespace Pudd.Tests;

public partial class ApiTests
{
    [Fact]
    public async Task NotificationsArePrivatePersistOfflineAndReachTheRecipientThroughSignalR()
    {
        await using var factory = new ApiFactory();
        using var owner = await CreateAuthenticatedClient(factory);
        using var other = await CreateAuthenticatedClient(factory);
        var ownerProfile = (await owner.GetFromJsonAsync<ProfileResponse>("/api/users/me"))!;
        var otherProfile = (await other.GetFromJsonAsync<ProfileResponse>("/api/users/me"))!;
        var postId = Guid.NewGuid();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
            db.posts.Add(new Post { ID = postId, UserID = ownerProfile.ID, Content = "Post" });
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Created, (await other.PostAsJsonAsync($"/api/posts/{postId}/comments", new { Content = "Offline comment" })).StatusCode);
        var saved = Assert.Single((await owner.GetFromJsonAsync<NotificationResponse[]>("/api/notifications"))!);
        Assert.Equal(otherProfile.ID, saved.ActorID);
        Assert.Empty((await other.GetFromJsonAsync<NotificationResponse[]>("/api/notifications"))!);
        await other.PostAsJsonAsync("/api/notifications/read", new { IDs = new[] { saved.ID } });
        Assert.Single((await owner.GetFromJsonAsync<NotificationResponse[]>("/api/notifications"))!);

        var updates = Channel.CreateUnbounded<NotificationResponse[]>();
        await using var connection = new HubConnectionBuilder().WithUrl("https://localhost/api/hubs/notifications", options =>
        {
            options.Transports = HttpTransportType.LongPolling;
            options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
            options.AccessTokenProvider = () => Task.FromResult(owner.DefaultRequestHeaders.Authorization!.Parameter);
        }).Build();
        connection.On<NotificationResponse[]>("Notifications", items => updates.Writer.TryWrite(items));
        await connection.StartAsync();
        Assert.Single(await connection.InvokeAsync<NotificationResponse[]>("GetNotifications"));
        await other.PostAsJsonAsync($"/api/posts/{postId}/comments", new { Content = "Live comment" });
        var live = await updates.Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(2, live.Length);
        Assert.Equal(HttpStatusCode.NoContent, (await owner.PostAsJsonAsync("/api/notifications/read", new { IDs = new[] { saved.ID } })).StatusCode);
        var remaining = Assert.Single((await owner.GetFromJsonAsync<NotificationResponse[]>("/api/notifications"))!);
        Assert.NotEqual(saved.ID, remaining.ID);
        await owner.PostAsJsonAsync($"/api/posts/{postId}/comments", new { Content = "My own comment" });
        Assert.Single((await owner.GetFromJsonAsync<NotificationResponse[]>("/api/notifications"))!);
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PostAsJsonAsync("/api/notifications/read", new { IDs = Array.Empty<Guid>() })).StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
            (await db.users.FindAsync(ownerProfile.ID))!.IsBlocked = true;
            await db.SaveChangesAsync();
        }
        var blocked = await Record.ExceptionAsync(() => connection.InvokeAsync<NotificationResponse[]>("GetNotifications"));
        Assert.True(blocked is Microsoft.AspNetCore.SignalR.HubException or HttpRequestException { StatusCode: HttpStatusCode.Unauthorized });
        Assert.Equal(HttpStatusCode.Unauthorized, (await owner.GetAsync("/api/notifications")).StatusCode);
    }
}

public class NotificationPostgresTests
{
    [PostgresFact]
    public async Task LikesAreAtomicIdempotentAndNotificationsCascadeWithTheirSources()
    {
        var settings = new Npgsql.NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PUDD_TEST_POSTGRES")!);
        Assert.StartsWith("pudd_tests_", settings.Database);
        var options = new DbContextOptionsBuilder<PuddDbContext>().UseNpgsql(settings.ConnectionString).Options;
        await using var db = new PuddDbContext(options);
        await db.Database.MigrateAsync();
        var owner = new User { ID = Guid.NewGuid(), Name = "Owner " + Guid.NewGuid(), Email = Guid.NewGuid() + "@test.test" };
        var actor = new User { ID = Guid.NewGuid(), Name = "Actor " + Guid.NewGuid(), Email = Guid.NewGuid() + "@test.test" };
        var post = new Post { ID = Guid.NewGuid(), User = owner, UserID = owner.ID, Content = "Post" };
        db.AddRange(post, actor);
        await db.SaveChangesAsync();
        await Task.WhenAll(Enumerable.Range(0, 8).Select(async _ =>
        {
            await using var concurrent = new PuddDbContext(options);
            await new PostLikeService(new PostLikeRepository(concurrent), new PostRepository(concurrent), new AccountAccess(new UserRepository(concurrent))).SetLikedAsync(actor.ID, post.ID, true);
        }));
        var inbox = new NotificationRepository(db);
        var likes = new PostLikeService(new PostLikeRepository(db), new PostRepository(db), new AccountAccess(new UserRepository(db)));
        Assert.Equal("like", Assert.Single(await inbox.GetAllAsync(owner.ID)).Kind);
        await likes.SetLikedAsync(owner.ID, post.ID, true);
        Assert.Single(await inbox.GetAllAsync(owner.ID));
        await likes.SetLikedAsync(actor.ID, post.ID, false);
        Assert.Empty(await inbox.GetAllAsync(owner.ID));
        await likes.SetLikedAsync(actor.ID, post.ID, true);
        var comment = new Comment { ID = Guid.NewGuid(), UserID = actor.ID, PostID = post.ID, Content = "Comment" };
        await new CommentService(new CommentRepository(db), new PostRepository(db), new AccountAccess(new UserRepository(db)), new CreateCommentRequestValidator())
            .CreateAsync(actor.ID, post.ID, new() { Content = comment.Content });
        comment = await db.comments.SingleAsync(c => c.PostID == post.ID);
        Assert.Equal(2, (await inbox.GetAllAsync(owner.ID)).Count);
        await new CommentRepository(db).DeleteAsync(comment);
        Assert.Single(await inbox.GetAllAsync(owner.ID));
        var id = (await inbox.GetAllAsync(owner.ID))[0].ID;
        await inbox.DeleteAsync(actor.ID, [id]);
        Assert.Single(await inbox.GetAllAsync(owner.ID));
        await inbox.DeleteAsync(owner.ID, [id]);
        await likes.SetLikedAsync(actor.ID, post.ID, true);
        Assert.Empty(await inbox.GetAllAsync(owner.ID));
        await likes.SetLikedAsync(actor.ID, post.ID, false);
        await likes.SetLikedAsync(actor.ID, post.ID, true);
        await new PostRepository(db).DeleteAsync(post);
        Assert.Empty(await inbox.GetAllAsync(owner.ID));
    }
}
