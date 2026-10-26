using Microsoft.Extensions.Logging;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.Application.Services;

public class NotificationService(INotificationRepository notifications,
       INotificationPublisher publisher,
       IUserRepository users,
       IPostRepository posts,
       AccountAccess access,
       ILogger<NotificationService> logger)
{
    public async Task<IReadOnlyList<NotificationResponse>> GetAllAsync(Guid actorId)
    {
        await access.RequireActiveAsync(actorId);
        return await notifications.GetAllAsync(actorId);
    }

    public async Task ReadAsync(Guid actorId, ReadNotificationsRequest request)
    {
        await access.RequireActiveAsync(actorId);
        if (request.IDs is null || request.IDs.Length is < 1 or > 500)
            throw new AppException(ErrorCode.InvalidInput, "Selecione de 1 a 500 notificações.");
        // IDs belong to the displayed snapshot: arrivals during this request are preserved.
        await notifications.DeleteAsync(actorId, request.IDs.Distinct().ToArray());
        await PublishAsync(actorId);
    }

    public async Task PublishForPostAsync(Guid postId)
    {
        try
        {
            var post = await posts.GetByIdAsync(postId);
            if (post is not null) await PublishAsync(post.UserID);
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "Notification recipient lookup failed for {PostId}", postId);
        }
    }

    private async Task PublishAsync(Guid recipientId)
    {
        try
        {
            var user = await users.GetByIdAsync(recipientId);
            if (user is null || user.IsBlocked) return;
            await publisher.SendAsync(recipientId, await notifications.GetAllAsync(recipientId));
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "Realtime notification delivery failed for {RecipientId}", recipientId);
        }
    }
}
