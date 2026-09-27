using Microsoft.EntityFrameworkCore;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Repositories;

public class CommentRepository(PuddDbContext context) : ICommentRepository
{
    public Task<Comment?> GetByIdAsync(Guid id) =>
        context
            .comments.Include(comment => comment.User)
            .FirstOrDefaultAsync(comment => comment.ID == id);

    public async Task<IReadOnlyList<Comment>> GetPageAsync(Guid postId, int page, int pageSize) =>
        await context
            .comments.AsNoTracking()
            .Include(comment => comment.User)
            .Where(comment => comment.PostID == postId)
            .OrderBy(comment => comment.CreatedAt)
            .ThenBy(comment => comment.ID)
            .Skip((page - 1) * pageSize)
            .Take(pageSize + 1)
            .ToListAsync();

    public async Task AddAsync(Comment comment)
    {
        context.comments.Add(comment);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Comment comment)
    {
        context.comments.Remove(comment);
        await context.SaveChangesAsync();
    }
}
