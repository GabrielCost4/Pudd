using System.ComponentModel.DataAnnotations;

// Classe feita para seguir o contrato de request do front

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Senha { get; set; } = string.Empty;
}