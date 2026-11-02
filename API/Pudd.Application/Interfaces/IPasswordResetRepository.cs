using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces;

public interface IPasswordResetRepository
{
    Task<PasswordResetToken?> ObterTokenValidoAsync(Guid userId, DateTimeOffset agora);
    Task InvalidarTodosAsync(Guid userId);
    Task AdicionarAsync(PasswordResetToken token);
    Task MarcarComoUsadoAsync(PasswordResetToken token);
}
