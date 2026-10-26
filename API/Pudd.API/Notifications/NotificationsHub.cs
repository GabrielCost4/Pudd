using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Pudd.Application.Contracts;
using Pudd.Application.Services;

namespace Pudd.API.Notifications;

[Authorize(Policy = Permissions.Community)]
public class NotificationsHub(NotificationService notifications, UserService users,
    UserPresenceTracker presence) : Hub
{
    private const string WatchedProfile = "PresenceProfile";
    private Guid ActorId => Guid.Parse(Context.User!.FindFirstValue("sub")!);

    public override async Task OnConnectedAsync()
    {
        await presence.ConnectedAsync(ActorId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await presence.DisconnectedAsync(ActorId, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task<PresenceResponse> WatchProfilePresence(Guid userId)
    {
        // Mesma autorizacao e validacao de existencia usadas pelo GET do perfil.
        await users.GetProfileAsync(ActorId, userId);
        await UnwatchProfilePresence();
        await Groups.AddToGroupAsync(Context.ConnectionId, UserPresenceTracker.Group(userId));
        Context.Items[WatchedProfile] = userId;
        return presence.Get(userId);
    }

    public async Task UnwatchProfilePresence()
    {
        if (Context.Items.Remove(WatchedProfile, out var watched) && watched is Guid userId)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, UserPresenceTracker.Group(userId));
    }

    public Task<IReadOnlyList<NotificationResponse>> GetNotifications() =>
        notifications.GetAllAsync(Guid.Parse(Context.User!.FindFirstValue("sub")!));
}

public class SubjectUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) => connection.User?.FindFirstValue("sub");
}
