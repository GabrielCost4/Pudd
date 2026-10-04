using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Pudd.Application.Validation;

namespace Pudd.Application.Services;

public class ImageService(
    IImageStorage storage,
    IImageDeletionQueue deletions,
    ILogger<ImageService> logger)
{
    public async Task<string> UploadAsync(
        string bucket,
        Guid ownerId,
        ImageUpload image,
        CancellationToken ct = default
    )
    {
        var extension = ImageFileValidation.Validate(image);
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
            await ScheduleCleanupAsync(bucket, path);
            throw;
        }
    }

    public async Task DiscardAsync(string bucket, string path)
    {
        try
        {
            await storage.DeleteAsync(bucket, path);
        }
        catch (Exception error)
        {
            logger.LogWarning(
                "Falha ao compensar upload em {Bucket}/{Path}. Tipo: {ErrorType}; origem: {ErrorStack}.",
                bucket, path, error.GetType().Name, error.StackTrace);
            await ScheduleCleanupAsync(bucket, path);
        }
    }

    private async Task ScheduleCleanupAsync(string bucket, string path)
    {
        try
        {
            // A limpeza deve sobreviver ao cancelamento da requisição que fez o upload.
            await deletions.EnqueueAsync(bucket, path);
        }
        catch (Exception error)
        {
            // Preserva o erro original do upload/salvamento. Sem banco e Storage disponíveis,
            // a reconciliação do arquivo órfão ainda exigirá intervenção posterior.
            logger.LogError(
                "Limpeza não registrada para {Bucket}/{Path}. Tipo: {ErrorType}; origem: {ErrorStack}.",
                bucket, path, error.GetType().Name, error.StackTrace);
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

}
