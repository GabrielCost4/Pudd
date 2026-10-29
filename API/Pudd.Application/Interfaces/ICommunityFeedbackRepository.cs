using Pudd.Application.Contracts;
using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces;

public interface ICommunityFeedbackRepository
{
    Task AddAsync(CommunityFeedback feedback, CancellationToken ct);
    Task<IReadOnlyList<CommunityFeedbackResponse>> ListAsync(int page, int pageSize, CancellationToken ct);
}