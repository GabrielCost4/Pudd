using System.ComponentModel.DataAnnotations;

namespace Pudd.Application.Contracts;

public class RegisterRequest
{
    [Required, StringLength(50)]
    public string Nome { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(20)]
    public string Senha { get; set; } = string.Empty;
}
