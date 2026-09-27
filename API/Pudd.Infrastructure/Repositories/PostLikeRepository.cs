using Microsoft.EntityFrameworkCore;
using Pudd.Application.Interfaces;

namespace Pudd.Infrastructure.Repositories;

public class PostLikeRepository(PuddDbContext context) : IPostLikeRepository
{
    public async Task SetLikedAsync(Guid userId, Guid postId, bool liked)
    {
        if (liked)
        {
            // O índice único e ON CONFLICT protegem inclusive requisições simultâneas.
            // ExecuteSqlInterpolated transforma os valores em parâmetros SQL.
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"""
                INSERT INTO "postLikes" ("ID", "UserID", "PostID", "CreatedAt")
                VALUES ({Guid.NewGuid()}, {userId}, {postId}, {DateTimeOffset.UtcNow})
                ON CONFLICT ("UserID", "PostID") DO NOTHING
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
