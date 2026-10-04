using System.ComponentModel.DataAnnotations;

namespace Pudd.API.Contracts;

public class AvatarForm
{
    [Required]
    public IFormFile Image { get; set; } = null!;
}
