using System.ComponentModel.DataAnnotations;
using Pudd.Application.Contracts;
using Pudd.Application.Services;

namespace Pudd.API.Contracts;

// IFormFile fica na API. Os services recebem somente texto e ImageUpload.
public class CreatePostForm : CreatePostRequest
{
    public IFormFile? Image { get; set; }
}

public class UpdatePostForm : UpdatePostRequest
{
    public IFormFile? Image { get; set; }
}

public class AvatarForm
{
    [Required]
    public IFormFile Image { get; set; } = null!;
}

internal static class UploadedImage
{
    public static async Task<ImageUpload?> ReadAsync(IFormFile? file, CancellationToken ct)
    {
        if (file is null) return null;
        if (file.Length < 1 || file.Length > ImageService.MaxBytes)
            throw new AppException(ErrorCode.InvalidInput, "Envie uma imagem de até 5 MB.");
        await using var stream = file.OpenReadStream();
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + read > ImageService.MaxBytes)
                throw new AppException(ErrorCode.InvalidInput, "A imagem excede 5 MB.");
            buffer.Write(chunk, 0, read);
        }
        return new(buffer.ToArray(), file.ContentType);
    }
}
