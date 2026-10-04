using Microsoft.Extensions.Logging;
using Pudd.Application.Interfaces;

namespace Pudd.Application.Services;

// Executa um lote; o host decide quando chamar este caso de uso.
public class ImageDeletionProcessor(
    IImageDeletionQueue queue,
    IImageStorage storage,
    ILogger<ImageDeletionProcessor> logger)
{
    public async Task ProcessPendingAsync(CancellationToken ct)
    {
        foreach (var item in await queue.GetPendingAsync(ct))
        {
            ct.ThrowIfCancellationRequested();
            var stage = "excluir arquivo no Storage";
            try
            {
                await storage.DeleteAsync(item.Bucket, item.Path, ct);
                stage = "concluir pendência no banco";
                await queue.CompleteAsync(item, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception error)
            {
                // Tipo e stack ajudam no diagnóstico sem registrar respostas ou credenciais.
                logger.LogWarning(
                    "Falha ao {Stage} para imagem {JobId}. Tipo: {ErrorType}; origem: {ErrorStack}.",
                    stage, item.ID, error.GetType().Name, error.StackTrace);
                try
                {
                    await queue.RetryLaterAsync(item, ct);
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception retryError)
                {
                    // A pendência permanece no banco e poderá ser lida novamente.
                    logger.LogError(
                        "Falha ao reagendar imagem {JobId}. Tipo: {ErrorType}; origem: {ErrorStack}.",
                        item.ID, retryError.GetType().Name, retryError.StackTrace);
                }
            }
        }
    }
}
