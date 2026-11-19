using Microsoft.EntityFrameworkCore;
using Pudd.Domain.Entities;
using Pudd.Infrastructure;
using Pudd.Infrastructure.Repositories;
using Xunit;

namespace Pudd.Tests;

public class ProfilePostsTests
{
    [Fact]
    public async Task FiltersBeforePaginationAndKeepsAuthorsSeparate()
    {
        await using var db = new PuddDbContext(new DbContextOptionsBuilder<PuddDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var author = new User { ID = Guid.NewGuid(), Name = "Author", Email = "author@test.test", AvatarImagePath = "avatar.png" };
        var other = new User { ID = Guid.NewGuid(), Name = "Other", Email = "other@test.test" };
        for (var i = 0; i < 7; i++)
            db.posts.Add(new Post
            {
                ID = Guid.NewGuid(),
                User = author,
                UserID = author.ID,
                Content = "Post " + i,
                ImagePath = i % 2 == 0 ? "image.png" : null,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-i)
            });
        db.posts.Add(new Post { ID = Guid.NewGuid(), User = other, UserID = other.ID, Content = "Other image", ImagePath = "other.png" });
        await db.SaveChangesAsync();
        var first = await db.posts.SingleAsync(post => post.Content == "Post 0");
        db.AddRange(
            new PostLike { PostID = first.ID, UserID = other.ID },
            new PostLike { PostID = first.ID, UserID = author.ID });
        await db.SaveChangesAsync();
        var repository = new PostRepository(db);
        var images = await repository.GetFeedAsync(other.ID, 1, 2, author.ID, true);
        Assert.Equal(3, images.Count); // Extra record determines hasNextPage.
        Assert.All(images, post => { Assert.Equal(author.ID, post.UserID); Assert.True(post.HasImage); });
        Assert.Equal(author.Name, images[0].AuthorName);
        Assert.True(images[0].AuthorHasAvatar);
        Assert.True(images[0].HasAvatar);
        Assert.Equal(2, images[0].LikeCount);
        Assert.True(images[0].IsLikedByCurrentUser);
        Assert.False(images[1].IsLikedByCurrentUser);
        var detail = await repository.GetResponseAsync(Guid.NewGuid(), first.ID);
        Assert.NotNull(detail);
        Assert.Equal(2, detail.LikeCount);
        Assert.False(detail.IsLikedByCurrentUser);
        var texts = await repository.GetFeedAsync(other.ID, 1, 12, author.ID, false);
        Assert.Equal(3, texts.Count);
        Assert.All(texts, post => Assert.False(post.HasImage));
        Assert.Equal(7, (await repository.GetFeedAsync(other.ID, 1, 12, author.ID)).Count);
    }
}
