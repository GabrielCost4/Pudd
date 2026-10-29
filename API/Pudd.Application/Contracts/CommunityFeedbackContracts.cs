namespace Pudd.Application.Contracts;

public record CreateFeedbackRequest(string? Kind, string? Description);
public record CommunityFeedbackResponse(Guid ID, string AuthorName, string Kind, string Description, DateTimeOffset CreatedAt);