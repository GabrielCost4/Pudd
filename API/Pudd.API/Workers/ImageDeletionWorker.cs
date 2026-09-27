using Pudd.Application.Interfaces;

namespace Pudd.API.Workers;

// O banco e o Storage não compartilham transação; esta fila garante novas tentativas de limpeza.
public class ImageDeletionWorker(IServiceScopeFactory scopes, ILogger<ImageDeletionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                var queue = scope.ServiceProvider.GetRequiredService<IImageDeletionQueue>();
                var storage = scope.ServiceProvider.GetRequiredService<IImageStorage>();
                foreach (var item in await queue.GetPendingAsync(stoppingToken))
                {
                    try
                    {
                        await storage.DeleteAsync(item.Bucket, item.Path, stoppingToken);
                        await queue.CompleteAsync(item, stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { throw; }
                    catch
                    {
                        logger.LogWarning("Exclusão de imagem pendente {JobId}; nova tentativa será agendada.", item.ID);
                        await queue.RetryLaterAsync(item, stoppingToken);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch
            {
                logger.LogWarning("Fila de imagens indisponível. Confira conexão e migrations.");
            }
        }
    }
}
