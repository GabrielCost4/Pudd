using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces;

public interface ICommentRepository
{
    Task<Comment?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Comment>> GetPageAsync(Guid postId, int page, int pageSize);
    Task AddAsync(Comment comment);
    Task DeleteAsync(Comment comment);
}
