using Microsoft.EntityFrameworkCore;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Repositories;

public class CommunityFeedbackRepository(PuddDbContext context) : ICommunityFeedbackRepository
{
    public async Task AddAsync(CommunityFeedback feedback, CancellationToken ct)
    {
        context.feedbacks.Add(feedback);
        await context.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<CommunityFeedbackResponse>> ListAsync(int page, int pageSize, CancellationToken ct) =>
        await context.feedbacks.AsNoTracking().OrderByDescending(f => f.CreatedAt).ThenByDescending(f => f.ID)
            .Skip((page - 1) * pageSize).Take(pageSize + 1)
            .Select(f => new CommunityFeedbackResponse(f.ID, f.User.Name, f.Kind, f.Description, f.CreatedAt))
            .ToListAsync(ct);
}