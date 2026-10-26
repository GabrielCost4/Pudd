namespace Pudd.Application.Contracts;

public record ProfileResponse(Guid ID, string Name, string? Bio, bool HasAvatar,
    UserPresence Presence = UserPresence.Offline, long PresenceRevision = 0);
