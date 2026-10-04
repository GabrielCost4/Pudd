namespace Pudd.Application.Contracts;

public class UpdatePostRequest : CreatePostRequest
{
    // Sem arquivo novo e com false, a imagem atual é preservada.
    public bool RemoveImage { get; set; }
}
