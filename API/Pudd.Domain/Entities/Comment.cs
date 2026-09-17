namespace Pudd.Domain.Entities;

public class Comment
{
    public Guid ID { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Guid UserID { get; set; }
    public User User { get; set; } = null!;

    public Guid PostID { get; set; }
    public Post Post { get; set; } = null!;
}
