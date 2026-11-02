namespace Pudd.Application.Contracts;

public class ResetPasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
    public string NovaSenha { get; set; } = string.Empty;
}
