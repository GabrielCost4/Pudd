using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;
using Pudd.Application.Contracts;

namespace Pudd.Infrastructure.Repositories
{
    public class UserRepository(
        PuddDbContext _context
    ) : IUserRepository
    {
        public Task<User?> GetByIdAsync(Guid id) =>
            _context.users.FirstOrDefaultAsync(user => user.ID == id);

        public Task<bool> NameExistsAsync(string normalizedName, Guid? exceptId = null) =>
            _context.users.AnyAsync(user => user.NormalizedName == normalizedName &&
                (!exceptId.HasValue || user.ID != exceptId.Value));

        public async Task<IReadOnlyList<UserSuggestionResponse>> SearchAsync(string normalizedQuery, bool includeBlocked) =>
            await _context.users.AsNoTracking()
                .Where(user => (includeBlocked || !user.IsBlocked) && user.NormalizedName.Contains(normalizedQuery))
                .OrderBy(user => user.NormalizedName == normalizedQuery ? 0 : user.NormalizedName.StartsWith(normalizedQuery) ? 1 : 2)
                .ThenBy(user => user.NormalizedName).ThenBy(user => user.ID).Take(3)
                .Select(user => new UserSuggestionResponse(user.ID, user.Name, user.AvatarImagePath != null)).ToListAsync();

        public async Task RecordLoginAsync(Guid id, DateTimeOffset now)
        {
            if (_context.Database.IsRelational())
            {
                await _context.users.Where(user => user.ID == id).ExecuteUpdateAsync(setters => setters
                    .SetProperty(user => user.LastLoginAt, now).SetProperty(user => user.LastSeenAt, now));
                return;
            }
            var user = await GetByIdAsync(id);
            if (user is null) return;
            user.LastLoginAt = now;
            user.LastSeenAt = now;
            await _context.SaveChangesAsync();
        }

        public async Task RecordAccessAsync(Guid id, DateTimeOffset now)
        {
            var threshold = now.AddMinutes(-5);
            // Authentication already loaded this account in the request's DbContext.
            // Skip the round trip when that observation is recent; SQL still protects concurrent updates.
            var observed = _context.users.Local.FirstOrDefault(user => user.ID == id)?.LastSeenAt;
            if (observed > threshold) return;
            var query = _context.users.Where(user => user.ID == id &&
                (user.LastSeenAt == null || user.LastSeenAt <= threshold));
            if (_context.Database.IsRelational())
            {
                await query.ExecuteUpdateAsync(setters => setters.SetProperty(user => user.LastSeenAt, now));
                return;
            }
            var user = await query.SingleOrDefaultAsync();
            if (user is null) return;
            user.LastSeenAt = now;
            await _context.SaveChangesAsync();
        }

        public Task UpdateAsync(User user) => _context.SaveChangesAsync();

        public async Task UpdateWithAvatarCleanupAsync(User user, string? previousAvatarPath)
        {
            if (previousAvatarPath is not null)
                _context.pendingImageDeletions.Add(new PendingImageDeletion
                {
                    Bucket = "avatars",
                    Path = previousAvatarPath
                });
            await _context.SaveChangesAsync();
        }

        public async Task UpdateWithBannerCleanupAsync(User user, string? previousBannerPath)
        {
            if (previousBannerPath is not null)
                _context.pendingImageDeletions.Add(new PendingImageDeletion
                {
                    Bucket = "banners",
                    Path = previousBannerPath
                });
            await _context.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<User>> GetPageAsync(int page, int pageSize) =>
            await _context.users.AsNoTracking().OrderBy(user => user.ID)
                .Skip((page - 1) * pageSize).Take(pageSize + 1).ToListAsync();

        public async Task<User?> ObterPorEmail(string email)
        {
            return await _context.users
            .FirstOrDefaultAsync(user => user.Email == email);
        }

        public async Task AdicionarUsuario(User user)
        {
            await _context.users.AddAsync(user);
            await _context.SaveChangesAsync();
        }
    }
}
