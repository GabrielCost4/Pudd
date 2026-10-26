using Pudd.Application.Contracts;

namespace Pudd.Application.Interfaces;

public interface INotificationPublisher
{
    Task SendAsync(Guid recipientId, IReadOnlyList<NotificationResponse> notifications);
}
