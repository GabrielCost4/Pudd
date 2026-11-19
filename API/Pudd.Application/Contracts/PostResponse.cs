namespace Pudd.Application.Contracts;

public record PostResponse(Guid ID, Guid UserID, string AuthorName, string Content,
    bool HasImage, DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt, bool AuthorHasAvatar,
    int LikeCount = 0, bool IsLikedByCurrentUser = false)
{
    public bool HasAvatar => AuthorHasAvatar;
}
