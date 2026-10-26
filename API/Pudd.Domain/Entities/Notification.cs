namespace Pudd.Domain.Entities;

public class Notification
{
    public Guid ID { get; set; } = Guid.NewGuid();
    public Guid RecipientID { get; set; }
    public User Recipient { get; set; } = null!;
    public Guid ActorID { get; set; }
    public User Actor { get; set; } = null!;
    public Guid PostID { get; set; }
    public Post Post { get; set; } = null!;
    public Guid? CommentID { get; set; }
    public Comment? Comment { get; set; }
    public Guid? PostLikeID { get; set; }
    public PostLike? PostLike { get; set; }
    public string Kind { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
