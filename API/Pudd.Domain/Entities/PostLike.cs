namespace Pudd.Domain.Entities;

public class PostLike
{
    public Guid ID { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Guid UserID { get; set; }
    public User User { get; set; } = null!;

    public Guid PostID { get; set; }
    public Post Post { get; set; } = null!;
}
