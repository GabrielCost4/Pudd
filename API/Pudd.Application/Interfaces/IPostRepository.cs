using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Contracts;
using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces
{
    public interface IPostRepository
    {
        Task AddAsync(Post post);
        Task<int> CountByUserAsync(Guid userId);
        Task<Post?> GetByIdAsync(Guid postID);
        Task UpdateAsync(Post post);
        // Salva o post e agenda a limpeza anterior na mesma transação.
        Task UpdateWithImageCleanupAsync(Post post, string? previousImagePath);
        Task DeleteAsync(Post post);
        Task<PostResponse?> GetResponseAsync(Guid actorId, Guid postId);
        Task<IReadOnlyList<PostResponse>> GetFeedAsync(Guid actorId, int page, int pageSize,
            Guid? authorId = null, bool? hasImage = null);
    }
}
