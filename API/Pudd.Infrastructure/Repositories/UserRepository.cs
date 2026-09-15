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