using Pudd.Application.Contracts;

namespace Pudd.Application.Validation;

// Inspeciona tamanho e assinatura inicial; não substitui decodificação completa ou antivírus.
internal static class ImageFileValidation
{
    public static string Validate(ImageUpload image)
    {
        if (image.Data is null || image.Data.Length == 0 || image.Data.Length > ImageUpload.MaxBytes)
            throw new AppException(ErrorCode.InvalidInput, "Envie uma imagem de até 5 MB.");

        var bytes = image.Data.AsSpan();
        string? extension = image.ContentType switch
        {
            "image/jpeg" when bytes.Length >= 3
                && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF => "jpg",
            "image/png" when bytes.StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) => "png",
            "image/webp" when bytes.Length >= 12
                && bytes[..4].SequenceEqual("RIFF"u8)
                && bytes.Slice(8, 4).SequenceEqual("WEBP"u8) => "webp",
            _ => null,
        };

        return extension ?? throw new AppException(
            ErrorCode.InvalidInput, "Arquivo incompatível: use JPG, PNG ou WebP.");
    }
}
