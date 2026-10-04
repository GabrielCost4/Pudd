using Pudd.Application.Contracts;

namespace Pudd.API.Contracts;

public class CreatePostForm : CreatePostRequest
{
    public IFormFile? Image { get; set; }
}
