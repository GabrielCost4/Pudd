namespace Pudd.Application.Contracts;

public record CommentResponse(Guid ID, Guid PostID, Guid UserID, string AuthorName,
    string Content, DateTimeOffset CreatedAt);
