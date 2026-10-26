using Microsoft.AspNetCore.SignalR;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.API.Notifications;

// Estado exclusivo desta instancia. O ultimo disconnect remove a conta da memoria.
public sealed class UserPresenceTracker(
    IHubContext<NotificationsHub> hub,
    ILogger<UserPresenceTracker> logger) : IUserPresenceReader
{
    private readonly object gate = new();
    private readonly Dictionary<Guid, HashSet<string>> connections = new();
    private long revision;

    public static string Group(Guid userId) => $"presence:{userId:D}";

    public PresenceResponse Get(Guid userId)
    {
        lock (gate)
            return new(userId, connections.ContainsKey(userId) ? UserPresence.Online : UserPresence.Offline, revision);
    }

    public Task ConnectedAsync(Guid userId, string connectionId) => ChangeAsync(userId, connectionId, true);
    public Task DisconnectedAsync(Guid userId, string connectionId) => ChangeAsync(userId, connectionId, false);

    private async Task ChangeAsync(Guid userId, string connectionId, bool connected)
    {
        PresenceResponse? update = null;
        lock (gate)
        {
            if (connected)
            {
                if (!connections.TryGetValue(userId, out var ids))
                {
                    connections[userId] = ids = new HashSet<string>();
                    update = new(userId, UserPresence.Online, ++revision);
                }
                ids.Add(connectionId);
            }
            else if (connections.TryGetValue(userId, out var ids) && ids.Remove(connectionId) && ids.Count == 0)
            {
                connections.Remove(userId);
                update = new(userId, UserPresence.Offline, ++revision);
            }
        }
        if (update is null) return;
        try
        {
            // Revisoes permitem descartar envios que chegam fora de ordem.
            await hub.Clients.Group(Group(userId)).SendAsync("PresenceChanged", update);
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "Presence delivery failed for {UserId}", userId);
        }
    }
}
