using Pudd.Application.Services;
using Pudd.Application.Validation;
using Pudd.Infrastructure.Repositories;
using Xunit;

namespace Pudd.Tests;

public class AvatarAvailabilityTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Posts_ReportAuthorAvatarWithoutSigningImageUrls(bool hasAvatar)
    {
        await using var s = new Scenario();
        s.Owner.AvatarImagePath = hasAvatar ? "owner/avatar.png" : null;
        await s.Db.SaveChangesAsync();

        var created = await s.Posts.CreateAsync(s.Owner.ID, new() { Content = "Post" });
        Assert.Equal(hasAvatar, created.AuthorHasAvatar);
        Assert.Equal(hasAvatar, (await s.Posts.GetAsync(s.Other.ID, created.ID)).AuthorHasAvatar);
        Assert.Equal(hasAvatar, Assert.Single((await s.Posts.GetFeedAsync(s.Other.ID, 1, 10)).Items).AuthorHasAvatar);
        Assert.Equal(hasAvatar, Assert.Single((await s.Posts.GetFeedAsync(s.Other.ID, 1, 10, s.Owner.ID)).Items).AuthorHasAvatar);
        Assert.Equal(hasAvatar, (await s.Posts.UpdateAsync(s.Owner.ID, created.ID, new() { Content = "Editado" })).AuthorHasAvatar);
        Assert.Empty(s.Storage.Uploads);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Comments_ReportAuthorAvatarOnCreationAndPagination(bool hasAvatar)
    {
        await using var s = new Scenario();
        s.Other.AvatarImagePath = hasAvatar ? "other/avatar.png" : null;
        await s.Db.SaveChangesAsync();
        var post = await s.AddPost();
        var comments = new CommentService(new CommentRepository(s.Db), new PostRepository(s.Db),
            s.Access, new CreateCommentRequestValidator());

        var created = await comments.CreateAsync(s.Other.ID, post.ID, new() { Content = "Comentário" });
        Assert.Equal(hasAvatar, created.AuthorHasAvatar);
        Assert.Equal(hasAvatar, Assert.Single((await comments.GetPageAsync(s.Owner.ID, post.ID, 1, 10)).Items).AuthorHasAvatar);
        Assert.Empty(s.Storage.Uploads);
    }
}
