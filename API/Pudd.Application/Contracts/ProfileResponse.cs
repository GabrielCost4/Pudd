namespace Pudd.Application.Contracts;

public record ProfileResponse(Guid ID, string Name, string? Bio, bool HasAvatar,
    UserPresence Presence = UserPresence.Offline, long PresenceRevision = 0, int PublicationCount = 0, bool HasBanner = false);
