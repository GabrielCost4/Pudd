using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Repositories
{
    public class PostRepository(
        PuddDbContext _context
    ) : IPostRepository
    {
        public Task<int> CountByUserAsync(Guid userId) => _context.posts.CountAsync(post => post.UserID == userId);

        // Centraliza a persistência de posts; validações e permissões ficam no PostService.
        public async Task AddAsync(Post post)
        {
            await _context.posts.AddAsync(post);
            await _context.SaveChangesAsync();
        }

        public async Task<Post?> GetByIdAsync(Guid postId)
        {
            return await _context.posts
                .Include(post => post.User)
                .FirstOrDefaultAsync(p => p.ID == postId);
        }

        public Task UpdateAsync(Post post) => _context.SaveChangesAsync();

        public async Task UpdateWithImageCleanupAsync(Post post, string? previousImagePath)
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

        public Task<PostResponse?> GetResponseAsync(Guid actorId, Guid postId) =>
            Project(_context.posts.Where(post => post.ID == postId), actorId).FirstOrDefaultAsync();

        public async Task<IReadOnlyList<PostResponse>> GetFeedAsync(
            Guid actorId, int page, int pageSize, Guid? authorId = null, bool? hasImage = null)
        {
            var query = _context.posts.AsNoTracking();
            if (authorId.HasValue)
                query = query.Where(post => post.UserID == authorId.Value);
            if (hasImage.HasValue)
                query = query.Where(post => (post.ImagePath != null) == hasImage.Value);

            var pageQuery = query
                .OrderByDescending(post => post.CreatedAt)
                .ThenByDescending(post => post.ID)
                .Skip((page - 1) * pageSize)
                .Take(pageSize + 1);
            return await Project(pageQuery, actorId).ToListAsync();
        }

        private static IQueryable<PostResponse> Project(IQueryable<Post> query, Guid actorId) =>
            query.Select(post => new PostResponse(
                post.ID, post.UserID, post.User.Name, post.Content, post.ImagePath != null,
                post.CreatedAt, post.UpdatedAt, post.User.AvatarImagePath != null,
                post.Likes.Count, post.Likes.Any(like => like.UserID == actorId)));

        private void ScheduleImageDeletion(string? path)
        {
            if (path is not null)
                _context.pendingImageDeletions.Add(new PendingImageDeletion { Bucket = "posts", Path = path });
        }
    }
}
