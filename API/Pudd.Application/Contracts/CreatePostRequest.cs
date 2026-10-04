namespace Pudd.Application.Contracts
{
    public class CreatePostRequest
    {
        // Autor e caminho da imagem são definidos pela API, nunca pelo cliente.
        public string Content { get; set; } = string.Empty;
    }
}
