using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http.HttpResults;

public class RegisterRequest
{
    [Required]
    [StringLength(50)]
    public string Nome {get; set;} = string.Empty;

    [Required]
    [EmailAddress(ErrorMessage = "Formato de email inválido!")]
    public string Email {get; set;} = string.Empty;
    
    [Required]
    [StringLength(20)]

    public string Senha { get; set; } = string.Empty;

}
