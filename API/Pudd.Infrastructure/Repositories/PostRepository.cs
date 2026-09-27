using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Repositories
{
    public class PostRepository(
        PuddDbContext _context
    ) : IPostRepository
    {
        // Centraliza a persistência de posts; validações e permissões ficam no PostService.
        public async Task AddAsync(Post post)
        {
            await _context.posts.AddAsync(post);
            await _context.SaveChangesAsync();
        }

        public async Task<Post?> GetByIdAsync (Guid postId)
        {
            return await _context.posts
                .Include(post => post.User)
                .FirstOrDefaultAsync(p => p.ID == postId);
        }

        public async Task UpdateAsync(Post post, string? previousImagePath = null)
        {
            // A troca do caminho e a limpeza pendente são salvas na mesma transação.
            ScheduleImageDeletion(previousImagePath);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Post post)
        {
            ScheduleImageDeletion(post.ImagePath);
            _context.posts.Remove(post);
            await _context.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<Post>> GetFeedAsync(int page, int pageSize)
        {
            return await _context.posts
                .AsNoTracking()
                .Include(post => post.User)
                .OrderByDescending(post => post.CreatedAt)
                .ThenByDescending(post => post.ID)
                .Skip((page - 1) * pageSize)
                .Take(pageSize + 1)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Post>> GetByUserAsync(Guid userId, int page, int pageSize)
        {
            return await _context.posts.AsNoTracking().Include(post => post.User)
                .Where(post => post.UserID == userId)
                .OrderByDescending(post => post.CreatedAt).ThenByDescending(post => post.ID)
                .Skip((page - 1) * pageSize).Take(pageSize + 1).ToListAsync();
        }

        private void ScheduleImageDeletion(string? path)
        {
            if (path is not null)
                _context.pendingImageDeletions.Add(new PendingImageDeletion { Bucket = "posts", Path = path });
        }
    }
}
