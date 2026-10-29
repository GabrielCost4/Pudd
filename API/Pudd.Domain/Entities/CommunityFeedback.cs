namespace Pudd.Domain.Entities;

public class CommunityFeedback
{
    public Guid ID { get; set; }
    public Guid UserID { get; set; }
    public User User { get; set; } = null!;
    public string Kind { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}