using System.ComponentModel.DataAnnotations;

namespace Pudd.Application.Contracts;

public class UpdatePostRequest : CreatePostRequest
{
    // Sem arquivo novo e com false, a imagem atual é preservada.
    public bool RemoveImage { get; set; }
}

public class CreateCommentRequest
{
    [Required, StringLength(2000)]
    public string Content { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    [Required, StringLength(50)]
    public string Name { get; set; } = string.Empty;
    [StringLength(500)]
    public string? Bio { get; set; }
}

public record SetBlockedRequest(bool IsBlocked);

public record PostResponse(Guid ID, Guid UserID, string AuthorName, string Content,
    bool HasImage, DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt);

public record CommentResponse(Guid ID, Guid PostID, Guid UserID, string AuthorName,
    string Content, DateTimeOffset CreatedAt);
    
public record ProfileResponse(Guid ID, string Name, string? Bio, bool HasAvatar);
public record AdminUserResponse(Guid ID, string Name, string Email, string Role, bool IsBlocked);
public record LikeResponse(bool Liked, int Count);
public record ImageUrlResponse(string Url, int ExpiresInSeconds);
public record PageResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, bool HasNextPage);

// Bytes e tipo de arquivo atravessam as camadas sem depender de IFormFile/ASP.NET.
public record ImageUpload(byte[] Data, string ContentType);
