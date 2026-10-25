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
        var author = new User { ID = Guid.NewGuid(), Name = "Author", Email = "author@test.test" };
        var other = new User { ID = Guid.NewGuid(), Name = "Other", Email = "other@test.test" };
        for (var i = 0; i < 7; i++)
            db.posts.Add(new Post { ID = Guid.NewGuid(), User = author, UserID = author.ID,
                Content = "Post " + i, ImagePath = i % 2 == 0 ? "image.png" : null,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-i) });
        db.posts.Add(new Post { ID = Guid.NewGuid(), User = other, UserID = other.ID, Content = "Other image", ImagePath = "other.png" });
        await db.SaveChangesAsync();
        var repository = new PostRepository(db);
        var images = await repository.GetByUserAsync(author.ID, 1, 2, true);
        Assert.Equal(3, images.Count); // Extra record determines hasNextPage.
        Assert.All(images, post => { Assert.Equal(author.ID, post.UserID); Assert.NotNull(post.ImagePath); });
        var texts = await repository.GetByUserAsync(author.ID, 1, 12, false);
        Assert.Equal(3, texts.Count);
        Assert.All(texts, post => Assert.Null(post.ImagePath));
        Assert.Equal(7, (await repository.GetByUserAsync(author.ID, 1, 12)).Count);
    }
}
