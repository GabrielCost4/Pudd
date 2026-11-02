namespace Pudd.Domain.Entities;

public class PasswordResetToken
{
    public Guid ID { get; set; }
    public Guid UserID { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Hash BCrypt do OTP de 6 dígitos. Nunca armazenar o OTP em claro.</summary>
    public string OtpHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }
    public bool Used { get; set; }
}
