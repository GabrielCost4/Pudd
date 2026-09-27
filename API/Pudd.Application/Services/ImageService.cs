using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.Application.Services;

public class ImageService(IImageStorage storage, IImageDeletionQueue deletions)
{
    public const int MaxBytes = 5 * 1024 * 1024;

    public async Task<string> UploadAsync(
        string bucket,
        Guid ownerId,
        ImageUpload image,
        CancellationToken ct = default
    )
    {
        var extension = Validate(image);
        // Cada versão recebe um nome novo; a imagem anterior só é limpa após salvar no banco.
        var path = $"{ownerId:D}/{Guid.NewGuid():N}.{extension}";
        try
        {
            await storage.UploadAsync(bucket, path, image, ct);
            return path;
        }
        catch
        {
            // Um timeout pode ocorrer depois de o servidor receber o arquivo.
            await deletions.EnqueueAsync(bucket, path);
            throw;
        }
    }

    public async Task DiscardAsync(string bucket, string path)
    {
        try
        {
            await storage.DeleteAsync(bucket, path);
        }
        catch (AppException)
        {
            await deletions.EnqueueAsync(bucket, path);
        }
    }

    public Task<ImageUrlResponse> GetUrlAsync(
        string bucket,
        string? path,
        CancellationToken ct = default
    )
    {
        if (path is null)
            throw new AppException(ErrorCode.NotFound, "Nenhuma imagem cadastrada.");
        return storage.GetSignedUrlAsync(bucket, path, ct);
    }

    private static string Validate(ImageUpload image)
    {
        if (image.Data is null || image.Data.Length == 0 || image.Data.Length > MaxBytes)
            throw new AppException(ErrorCode.InvalidInput, "Envie uma imagem de até 5 MB.");

        // Confere os bytes iniciais, pois a extensão e o Content-Type podem ser falsificados.
        var bytes = image.Data.AsSpan();
        string? extension = image.ContentType switch
        {
            "image/jpeg"
                when bytes.Length >= 3
                    && bytes[0] == 0xFF
                    && bytes[1] == 0xD8
                    && bytes[2] == 0xFF => "jpg",
            "image/png" when bytes.StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) =>
                "png",
            "image/webp"
                when bytes.Length >= 12
                    && bytes[..4].SequenceEqual("RIFF"u8)
                    && bytes.Slice(8, 4).SequenceEqual("WEBP"u8) => "webp",
            _ => null,
        };
        return extension
            ?? throw new AppException(
                ErrorCode.InvalidInput,
                "Arquivo incompatível: use JPG, PNG ou WebP."
            );
    }
}
