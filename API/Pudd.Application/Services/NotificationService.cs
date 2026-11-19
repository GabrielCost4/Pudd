using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.Application.Services;

public class NotificationService(INotificationRepository notifications, AccountAccess access)
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
    }
}
