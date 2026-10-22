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
        Task UpdateAsync(User user);
        Task RecordAccessAsync(Guid id, DateTimeOffset now);
        Task RecordLoginAsync(Guid id, DateTimeOffset now);
        // Salva o perfil e agenda a limpeza anterior na mesma transação.
        Task UpdateWithAvatarCleanupAsync(User user, string? previousAvatarPath);
        Task<IReadOnlyList<User>> GetPageAsync(int page, int pageSize);
    }
}
