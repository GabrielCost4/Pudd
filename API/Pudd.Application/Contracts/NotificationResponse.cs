namespace Pudd.Application.Contracts;

public record NotificationResponse(Guid ID, Guid ActorID, string ActorName, Guid PostID,
    string Kind, DateTimeOffset CreatedAt);

public record ReadNotificationsRequest(Guid[] IDs);
