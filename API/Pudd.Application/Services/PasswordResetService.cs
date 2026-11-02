using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Application.Services;

public class PasswordResetService(
    IUserRepository _userRepository,
    IPasswordResetRepository _resetRepository,
    IPasswordHasher _passwordHasher,
    IEmailSender _emailSender,
    TimeProvider _clock
)
{
    private const int ExpirationMinutes = 15;

    public async Task SolicitarResetAsync(ForgotPasswordRequest request)
    {
        var user = await _userRepository.ObterPorEmail(request.Email);

        // Resposta genérica para evitar user enumeration — não revela se o e-mail existe
        if (user is null) return;

        var otp = GerarOtp();
        var hash = _passwordHasher.GerarHash(otp);
        var agora = _clock.GetUtcNow();

        // Invalida tokens anteriores não usados
        await _resetRepository.InvalidarTodosAsync(user.ID);

        var token = new PasswordResetToken
        {
            UserID = user.ID,
            OtpHash = hash,
            ExpiresAt = agora.AddMinutes(ExpirationMinutes),
            Used = false
        };

        await _resetRepository.AdicionarAsync(token);
        await _emailSender.EnviarOtpRecuperacaoAsync(user.Email, otp);
    }

    public async Task<bool> RedefinirSenhaAsync(ResetPasswordRequest request)
    {
        var user = await _userRepository.ObterPorEmail(request.Email);
        if (user is null) return false;

        var agora = _clock.GetUtcNow();
        var token = await _resetRepository.ObterTokenValidoAsync(user.ID, agora);
        if (token is null) return false;

        if (!_passwordHasher.VerificarSenha(request.Otp, token.OtpHash))
            return false;

        user.PasswordHash = _passwordHasher.GerarHash(request.NovaSenha);
        await _userRepository.UpdateAsync(user);
        await _resetRepository.MarcarComoUsadoAsync(token);

        return true;
    }

    private static string GerarOtp()
    {
        return Random.Shared.Next(100_000, 999_999).ToString();
    }
}
