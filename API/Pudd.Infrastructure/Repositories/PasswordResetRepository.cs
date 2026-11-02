using Microsoft.EntityFrameworkCore;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Repositories;

public class PasswordResetRepository(PuddDbContext _context) : IPasswordResetRepository
{
    public Task<PasswordResetToken?> ObterTokenValidoAsync(Guid userId, DateTimeOffset agora) =>
        _context.passwordResetTokens
            .FirstOrDefaultAsync(t => t.UserID == userId && !t.Used && t.ExpiresAt > agora);

    public async Task InvalidarTodosAsync(Guid userId)
    {
        if (_context.Database.IsRelational())
        {
            await _context.passwordResetTokens
                .Where(t => t.UserID == userId && !t.Used)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.Used, true));
            return;
        }
        var tokens = await _context.passwordResetTokens
            .Where(t => t.UserID == userId && !t.Used).ToListAsync();
        foreach (var t in tokens) t.Used = true;
        await _context.SaveChangesAsync();
    }

    public async Task AdicionarAsync(PasswordResetToken token)
    {
        _context.passwordResetTokens.Add(token);
        await _context.SaveChangesAsync();
    }

    public async Task MarcarComoUsadoAsync(PasswordResetToken token)
    {
        token.Used = true;
        await _context.SaveChangesAsync();
    }
}
