using Pudd.Application.Contracts;

namespace Pudd.API.Contracts;

public class UpdatePostForm : UpdatePostRequest
{
    public IFormFile? Image { get; set; }
}
