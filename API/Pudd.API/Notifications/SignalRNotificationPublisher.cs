using Microsoft.AspNetCore.SignalR;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.API.Notifications;

public class SignalRNotificationPublisher(IHubContext<NotificationsHub> hub) : INotificationPublisher
{
    public Task SendAsync(Guid recipientId, IReadOnlyList<NotificationResponse> notifications) =>
        hub.Clients.User(recipientId.ToString()).SendAsync("Notifications", notifications);
}
