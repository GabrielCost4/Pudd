using Pudd.Application.Contracts;

namespace Pudd.API.Uploads;

// Converte o arquivo HTTP para bytes; limites e formato também são verificados na Application.
internal static class UploadedImage
{
    public static async Task<ImageUpload?> ReadAsync(IFormFile? file, CancellationToken ct)
    {
        if (file is null)
            return null;
        if (file.Length < 1 || file.Length > ImageUpload.MaxBytes)
            throw new AppException(ErrorCode.InvalidInput, "Envie uma imagem de até 5 MB.");

        // Um único buffer para o arquivo, sem MemoryStream + cópia por ToArray.
        var bytes = new byte[(int)file.Length];
        await using var stream = file.OpenReadStream();
        try
        {
            await stream.ReadExactlyAsync(bytes.AsMemory(), ct);
        }
        catch (EndOfStreamException)
        {
            throw new AppException(ErrorCode.InvalidInput, "Arquivo incompleto.");
        }

        var extraByte = new byte[1];
        if (await stream.ReadAsync(extraByte.AsMemory(), ct) != 0)
            throw new AppException(ErrorCode.InvalidInput, "Tamanho do arquivo incompatível.");

        return new ImageUpload(bytes, file.ContentType);
    }
}
