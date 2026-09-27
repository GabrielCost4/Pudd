using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Repositories
{
    public class UserRepository(
        PuddDbContext _context
    ) : IUserRepository
    {
        public Task<User?> GetByIdAsync(Guid id) =>
            _context.users.FirstOrDefaultAsync(user => user.ID == id);

        public async Task UpdateAsync(User user, string? previousAvatarPath = null)
        {
            if (previousAvatarPath is not null)
                _context.pendingImageDeletions.Add(new PendingImageDeletion
                {
                    Bucket = "avatars", Path = previousAvatarPath
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
