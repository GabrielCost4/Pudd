using Pudd.Application.Contracts;

namespace Pudd.Application.Interfaces;

public interface INotificationRepository
{
    Task<IReadOnlyList<NotificationResponse>> GetAllAsync(Guid recipientId);
    Task DeleteAsync(Guid recipientId, IReadOnlyCollection<Guid> ids);
}
