using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces
{
    public interface IPostRepository
    {
        Task AddAsync(Post post);
        Task<Post?> GetByIdAsync (Guid postID);
        Task UpdateAsync(Post post);
        // Salva o post e agenda a limpeza anterior na mesma transação.
        Task UpdateWithImageCleanupAsync(Post post, string? previousImagePath);
        Task DeleteAsync (Post post);
        Task<IReadOnlyList<Post>> GetFeedAsync (int page, int pageSize);
        Task<IReadOnlyList<Post>> GetByUserAsync(Guid userId, int page, int pageSize);
    }
}
