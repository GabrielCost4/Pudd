namespace Pudd.Application.Interfaces;

public interface IEmailSender
{
    Task EnviarOtpRecuperacaoAsync(string destinatario, string otp);
}
