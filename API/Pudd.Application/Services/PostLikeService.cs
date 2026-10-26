using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Application.Services;

public class PostLikeService(
       IPostLikeRepository likes,
       IPostRepository posts,
       AccountAccess access,
       NotificationService? notifications = null)
{
    public async Task<LikeResponse> GetAsync(Guid actorId, Guid postId)
    {
        await access.RequireActiveAsync(actorId);
        if (await posts.GetByIdAsync(postId) is null)
            throw new AppException(ErrorCode.NotFound, "Postagem não encontrada.");
        return new(await likes.IsLikedAsync(actorId, postId), await likes.CountAsync(postId));
    }

    public async Task<LikeResponse> SetLikedAsync(Guid actorId, Guid postId, bool liked)
    {
        await access.RequireActiveAsync(actorId);
        var post = await posts.GetByIdAsync(postId)
            ?? throw new AppException(ErrorCode.NotFound, "Postagem não encontrada.");
        var notification = !liked || post.UserID == actorId ? null : new Notification
        {
            RecipientID = post.UserID,
            ActorID = actorId,
            PostID = postId,
            Kind = "like",
        };

        await likes.SetLikedAsync(actorId, postId, liked, notification);

        if (notifications is not null)
        await notifications.PublishForPostAsync(postId);

        return new(liked, await likes.CountAsync(postId));
    }
}
