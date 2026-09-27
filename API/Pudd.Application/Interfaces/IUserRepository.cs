using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> ObterPorEmail(string email);
        Task AdicionarUsuario(User user);
        Task<User?> GetByIdAsync(Guid id);
        Task UpdateAsync(User user, string? previousAvatarPath = null);
        Task<IReadOnlyList<User>> GetPageAsync(int page, int pageSize);
    }
}
