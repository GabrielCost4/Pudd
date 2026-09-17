namespace Pudd.Domain.Entities;

public class Post
{
    public Guid ID { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ImagePath { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public Guid UserID { get; set; }
    public User User { get; set; } = null!;

    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<PostLike> Likes { get; set; } = [];
}
