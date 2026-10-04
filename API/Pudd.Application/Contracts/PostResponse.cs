namespace Pudd.Application.Contracts;

public record PostResponse(Guid ID, Guid UserID, string AuthorName, string Content,
    bool HasImage, DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt);
