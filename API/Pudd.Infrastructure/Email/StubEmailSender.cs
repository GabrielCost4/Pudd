using Microsoft.Extensions.Logging;
using Pudd.Application.Interfaces;

namespace Pudd.Infrastructure.Email;

/// <summary>
/// Implementação de desenvolvimento — loga o OTP no console.
/// Substitua por ResendEmailSender em produção.
/// </summary>
public class StubEmailSender(ILogger<StubEmailSender> logger) : IEmailSender
{
    public Task EnviarOtpRecuperacaoAsync(string destinatario, string otp)
    {
        logger.LogWarning("[DEV] OTP de recuperação para {Email}: {Otp}", destinatario, otp);
        return Task.CompletedTask;
    }
}
