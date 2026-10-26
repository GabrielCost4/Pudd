using Microsoft.EntityFrameworkCore;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Repositories;

public class PostLikeRepository(PuddDbContext context) : IPostLikeRepository
{
    public async Task SetLikedAsync(Guid userId, Guid postId, bool liked, Notification? notification = null)
    {
        if (liked)
        {
            // Mantenha a interpolacao nesta API: o EF transforma os valores em parametros SQL.
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"""
                WITH inserted AS (
                    INSERT INTO "postLikes" ("ID", "UserID", "PostID", "CreatedAt")
                    VALUES ({Guid.NewGuid()}, {userId}, {postId}, {DateTimeOffset.UtcNow})
                    ON CONFLICT ("UserID", "PostID") DO NOTHING
                    RETURNING "ID", "UserID", "PostID", "CreatedAt"
                )
                INSERT INTO "notifications" ("ID", "RecipientID", "ActorID", "PostID", "PostLikeID", "Kind", "CreatedAt")
                SELECT {notification?.ID ?? Guid.Empty}, {notification?.RecipientID ?? Guid.Empty}, i."UserID", i."PostID", i."ID", 'like', i."CreatedAt"
                FROM inserted i WHERE {notification is not null}
                """
            );
        }
        else
        {
            await context
                .postLikes.Where(like => like.UserID == userId && like.PostID == postId)
                .ExecuteDeleteAsync();
        }
    }

    public Task<int> CountAsync(Guid postId) =>
        context.postLikes.CountAsync(like => like.PostID == postId);

    public Task<bool> IsLikedAsync(Guid userId, Guid postId) =>
        context.postLikes.AnyAsync(like => like.UserID == userId && like.PostID == postId);
}
