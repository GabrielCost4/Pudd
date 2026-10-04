using Microsoft.EntityFrameworkCore;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Application.Services;
using Pudd.Domain.Entities;
using Pudd.Domain.Enums.Roles;
using Pudd.Infrastructure;
using Pudd.Infrastructure.Repositories;
using Xunit;
using Microsoft.Extensions.Logging.Abstractions;
using Pudd.Application.Validation;

namespace Pudd.Tests;

public class ServiceTests
{
    [Fact]
    public async Task Create_UsesAuthenticatedAuthorAndTrimsText()
    {
        await using var s = new Scenario();
        var result = await s.Posts.CreateAsync(s.Owner.ID, new() { Content = "  meu post  " }, Scenario.Png);
        Assert.Equal(s.Owner.ID, result.UserID);
        Assert.Equal("meu post", result.Content);
        Assert.True(result.HasImage);
        Assert.StartsWith(s.Owner.ID.ToString(), (await s.Db.posts.SingleAsync()).ImagePath);
        Assert.Single(s.Storage.Uploads);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task EmptyText_IsRejectedBeforeUpload(string text)
    {
        await using var s = new Scenario();
        await AssertError(ErrorCode.InvalidInput,
            () => s.Posts.CreateAsync(s.Owner.ID, new() { Content = text }, Scenario.Png));
        Assert.Empty(s.Storage.Uploads);
    }

    [Fact]
    public async Task AnotherUser_CannotEditOrDeletePost()
    {
        await using var s = new Scenario();
        var post = await s.AddPost();
        await AssertError(ErrorCode.Forbidden,
            () => s.Posts.UpdateAsync(s.Other.ID, post.ID, new() { Content = "alterado" }, Scenario.Png));
        await AssertError(ErrorCode.Forbidden, () => s.Posts.DeleteAsync(s.Other.ID, post.ID));
        Assert.Empty(s.Storage.Uploads);
        Assert.Equal("original", post.Content);
    }

    [Fact]
    public async Task UpdateWithoutFile_PreservesImage_AndRemoveSchedulesCleanup()
    {
        await using var s = new Scenario();
        var post = await s.AddPost("owner/old.png");
        await s.Posts.UpdateAsync(s.Owner.ID, post.ID, new() { Content = "editado" });
        Assert.Equal("owner/old.png", post.ImagePath);
        Assert.Empty(s.Db.pendingImageDeletions);
        await s.Posts.UpdateAsync(s.Owner.ID, post.ID, new() { Content = "editado", RemoveImage = true });
        Assert.Null(post.ImagePath);
        Assert.Equal("owner/old.png", (await s.Db.pendingImageDeletions.SingleAsync()).Path);
    }

    [Fact]
    public async Task ReplaceAndRemoveTogether_IsRejected()
    {
        await using var s = new Scenario();
        var post = await s.AddPost();
        await AssertError(ErrorCode.InvalidInput, () => s.Posts.UpdateAsync(s.Owner.ID, post.ID,
            new() { Content = "editado", RemoveImage = true }, Scenario.Png));
        Assert.Empty(s.Storage.Uploads);
    }

    [Fact]
    public async Task FailedSave_DeletesNewUpload()
    {
        await using var s = new Scenario();
        var service = new PostService(new FailingPosts(), s.Users, s.Access, s.Images,
            new CreatePostRequestValidator(), new UpdatePostRequestValidator());
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(s.Owner.ID, new() { Content = "texto" }, Scenario.Png));
        Assert.Single(s.Storage.Deletions);
        Assert.Equal(s.Storage.Uploads[0], s.Storage.Deletions[0]);
    }

    [Fact]
    public async Task FailedCleanup_EnqueuesRetry()
    {
        await using var s = new Scenario();
        s.Storage.FailDelete = true;
        await s.Images.DiscardAsync("posts", "some/file.png");
        Assert.Equal(("posts", "some/file.png"), Assert.Single(s.Queue.Items));
    }

    [Fact]
    public async Task FailedUpload_EnqueuesPotentialOrphan()
    {
        await using var s = new Scenario();
        s.Storage.FailUpload = true;
        await AssertError(ErrorCode.StorageUnavailable, () =>
            s.Posts.CreateAsync(s.Owner.ID, new() { Content = "texto" }, Scenario.Png));
        Assert.Single(s.Queue.Items);
        Assert.Empty(s.Db.posts);
    }

    [Fact]
    public async Task ForgedImageAndOversize_AreRejected()
    {
        await using var s = new Scenario();
        await AssertError(ErrorCode.InvalidInput, () => s.Images.UploadAsync("posts", s.Owner.ID,
            new("this is text"u8.ToArray(), "image/png")));
        await AssertError(ErrorCode.InvalidInput, () => s.Images.UploadAsync("posts", s.Owner.ID,
            new(new byte[ImageUpload.MaxBytes + 1], "image/png")));
        Assert.Empty(s.Storage.Uploads);
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(1, 0)]
    [InlineData(1, 51)]
    [InlineData(int.MaxValue, 50)]
    public async Task InvalidPagination_IsRejected(int page, int size)
    {
        await using var s = new Scenario();
        await AssertError(ErrorCode.InvalidInput, () => s.Posts.GetFeedAsync(s.Owner.ID, page, size));
    }

    [Fact]
    public async Task Feed_ReturnsOnlyRequestedPageAndHasNext()
    {
        await using var s = new Scenario();
        for (int i = 0; i < 3; i++) await s.AddPost();
        var first = await s.Posts.GetFeedAsync(s.Owner.ID, 1, 2);
        var second = await s.Posts.GetFeedAsync(s.Owner.ID, 2, 2);
        Assert.Equal(2, first.Items.Count);
        Assert.True(first.HasNextPage);
        Assert.Single(second.Items);
        Assert.False(second.HasNextPage);
        Assert.Empty(first.Items.Select(p => p.ID).Intersect(second.Items.Select(p => p.ID)));
    }

    [Fact]
    public async Task BlockedAccount_CannotReadCreateOrGetSignedImage()
    {
        await using var s = new Scenario();
        var post = await s.AddPost("some/path.png");
        s.Owner.IsBlocked = true;
        await s.Db.SaveChangesAsync();
        await AssertError(ErrorCode.Forbidden, () => s.Posts.GetFeedAsync(s.Owner.ID, 1, 20));
        await AssertError(ErrorCode.Forbidden, () => s.Posts.CreateAsync(s.Owner.ID, new() { Content = "texto" }));
        await AssertError(ErrorCode.Forbidden, () => s.Posts.GetImageAsync(s.Owner.ID, post.ID));
    }

    [Fact]
    public async Task AdminCanModerate_ButCannotEditOthersOrBlockSelf()
    {
        await using var s = new Scenario();
        var post = await s.AddPost();
        var admin = s.Other;
        admin.Role = UserRole.Admin;
        await s.Db.SaveChangesAsync();
        await AssertError(ErrorCode.Forbidden, () => s.Posts.UpdateAsync(admin.ID, post.ID, new() { Content = "editado" }));
        await AssertError(ErrorCode.Conflict, () => s.Profiles.SetBlockedAsync(admin.ID, admin.ID, true));
        await s.Posts.DeleteAsync(admin.ID, post.ID, moderation: true);
        Assert.Empty(s.Db.posts);
    }

    [Fact]
    public async Task RegularUserCannotUseModeration()
    {
        await using var s = new Scenario();
        var post = await s.AddPost();
        await AssertError(ErrorCode.Forbidden, () => s.Posts.DeleteAsync(s.Other.ID, post.ID, moderation: true));
        await AssertError(ErrorCode.Forbidden, () => s.Profiles.SetBlockedAsync(s.Owner.ID, s.Other.ID, true));
    }

    [Fact]
    public async Task CommentCreationAndDeletion_EnforceOwnership()
    {
        await using var s = new Scenario();
        var post = await s.AddPost();
        var service = new CommentService(new CommentRepository(s.Db), new PostRepository(s.Db), s.Access,
            new CreateCommentRequestValidator());
        var comment = await service.CreateAsync(s.Other.ID, post.ID, new() { Content = " legal " });
        Assert.Equal("legal", comment.Content);
        await AssertError(ErrorCode.Forbidden, () => service.DeleteAsync(s.Owner.ID, comment.ID));
        await service.DeleteAsync(s.Other.ID, comment.ID);
        Assert.Empty(s.Db.comments);
    }

    [Fact]
    public async Task ProfileAndAvatar_KeepOptionalFieldsAndQueuePreviousImage()
    {
        await using var s = new Scenario();
        s.Owner.AvatarImagePath = "some/old.png";
        await s.Db.SaveChangesAsync();
        var result = await s.Profiles.UpdateProfileAsync(s.Owner.ID, new() { Name = " Gabriel ", Bio = "  " });
        Assert.Equal("Gabriel", result.Name);
        Assert.Null(result.Bio);
        await s.Profiles.SetAvatarAsync(s.Owner.ID, Scenario.Png);
        Assert.Equal("some/old.png", (await s.Db.pendingImageDeletions.SingleAsync()).Path);
        Assert.NotEqual("some/old.png", s.Owner.AvatarImagePath);
    }

    private static async Task AssertError(ErrorCode code, Func<Task> action) =>
        Assert.Equal(code, (await Assert.ThrowsAsync<AppException>(action)).Code);
}

internal sealed class Scenario : IAsyncDisposable
{
    public static readonly ImageUpload Png = new(Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="), "image/png");
    public PuddDbContext Db { get; } = new(new DbContextOptionsBuilder<PuddDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    public User Owner { get; } = new() { ID = Guid.NewGuid(), Name = "Autor", Email = "autor@example.test" };
    public User Other { get; } = new() { ID = Guid.NewGuid(), Name = "Outro", Email = "outro@example.test" };
    public FakeStorage Storage { get; } = new();
    public FakeQueue Queue { get; } = new();
    public UserRepository Users { get; }
    public AccountAccess Access { get; }
    public ImageService Images { get; }
    public PostService Posts { get; }
    public UserService Profiles { get; }
    public Scenario()
    {
        Db.users.AddRange(Owner, Other);
        Db.SaveChanges();
        Users = new(Db);
        Access = new(Users);
        Images = new(Storage, Queue, NullLogger<ImageService>.Instance);
        Posts = new(new PostRepository(Db), Users, Access, Images,
            new CreatePostRequestValidator(), new UpdatePostRequestValidator());
        Profiles = new(Users, Access, Images, new UpdateProfileRequestValidator());
    }
    public async Task<Post> AddPost(string? path = null)
    {
        var post = new Post { ID = Guid.NewGuid(), UserID = Owner.ID, User = Owner, Content = "original", ImagePath = path };
        Db.posts.Add(post);
        await Db.SaveChangesAsync();
        return post;
    }
    public ValueTask DisposeAsync() => Db.DisposeAsync();
}

internal class FakeStorage : IImageStorage
{
    public List<(string Bucket, string Path)> Uploads { get; } = [];
    public List<(string Bucket, string Path)> Deletions { get; } = [];
    public bool FailUpload { get; set; }
    public bool FailDelete { get; set; }
    public Task UploadAsync(string bucket, string path, ImageUpload image, CancellationToken ct = default)
    {
        Uploads.Add((bucket, path));
        if (FailUpload) throw new AppException(ErrorCode.StorageUnavailable, "indisponível");
        return Task.CompletedTask;
    }
    public Task DeleteAsync(string bucket, string path, CancellationToken ct = default)
    {
        Deletions.Add((bucket, path));
        if (FailDelete) throw new AppException(ErrorCode.StorageUnavailable, "indisponível");
        return Task.CompletedTask;
    }
    public Task<ImageUrlResponse> GetSignedUrlAsync(string bucket, string path, CancellationToken ct = default) =>
        Task.FromResult(new ImageUrlResponse("https://storage.example.test/signed", 300));
}

internal class FakeQueue : IImageDeletionQueue
{
    public List<(string, string)> Items { get; } = [];
    public List<PendingImageDeletion> Pending { get; } = [];
    public List<PendingImageDeletion> Completed { get; } = [];
    public List<PendingImageDeletion> Retried { get; } = [];
    public bool FailEnqueue { get; set; }
    public bool FailRetry { get; set; }
    public Task EnqueueAsync(string bucket, string path, CancellationToken ct = default)
    {
        if (FailEnqueue) throw new InvalidOperationException("fila indisponível");
        Items.Add((bucket, path)); return Task.CompletedTask;
    }
    public Task<IReadOnlyList<PendingImageDeletion>> GetPendingAsync(CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PendingImageDeletion>>(Pending);
    public Task CompleteAsync(PendingImageDeletion item, CancellationToken ct)
    {
        Completed.Add(item);
        return Task.CompletedTask;
    }
    public Task RetryLaterAsync(PendingImageDeletion item, CancellationToken ct)
    {
        if (FailRetry) throw new InvalidOperationException("fila indisponível");
        Retried.Add(item);
        return Task.CompletedTask;
    }
}

internal class FailingPosts : IPostRepository
{
    public Task AddAsync(Post post) => throw new InvalidOperationException("falha simulada");
    public Task<Post?> GetByIdAsync(Guid id) => Task.FromResult<Post?>(null);
    public Task UpdateAsync(Post post) => Task.CompletedTask;
    public Task UpdateWithImageCleanupAsync(Post post, string? previousImagePath) => Task.CompletedTask;
    public Task DeleteAsync(Post post) => Task.CompletedTask;
    public Task<IReadOnlyList<Post>> GetFeedAsync(int page, int pageSize) => Task.FromResult<IReadOnlyList<Post>>([]);
    public Task<IReadOnlyList<Post>> GetByUserAsync(Guid userId, int page, int pageSize) => GetFeedAsync(page, pageSize);
}
