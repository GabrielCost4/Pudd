using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Application.Services;

public class CommunityFeedbackService(ICommunityFeedbackRepository feedbacks, AccountAccess access, TimeProvider clock)
{
    public async Task CreateAsync(Guid actorId, CreateFeedbackRequest request, CancellationToken ct)
    {
        await access.RequireActiveAsync(actorId);
        if (request.Kind is not ("Suggestion" or "Bug"))
            throw new AppException(ErrorCode.InvalidInput, "Selecione sugestão ou bug.");
        var description = request.Description?.Trim() ?? string.Empty;
        if (description.Length is < 10 or > 3000)
            throw new AppException(ErrorCode.InvalidInput, "Descreva seu feedback usando entre 10 e 3000 caracteres.");
        await feedbacks.AddAsync(new CommunityFeedback {
            ID = Guid.NewGuid(), UserID = actorId, Kind = request.Kind,
            Description = description, CreatedAt = clock.GetUtcNow()
        }, ct);
    }

    public async Task<PageResponse<CommunityFeedbackResponse>> ListAsync(Guid actorId, int page, int pageSize, CancellationToken ct)
    {
        await access.RequireAdminAsync(actorId);
        SocialRules.Page(page, pageSize);
        return SocialRules.Slice(await feedbacks.ListAsync(page, pageSize, ct), page, pageSize);
    }
}