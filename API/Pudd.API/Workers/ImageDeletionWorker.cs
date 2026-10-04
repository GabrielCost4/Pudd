using Pudd.Application.Services;

namespace Pudd.API.Workers;

// Agenda o trabalho e cria um escopo. O processamento do lote pertence à Application.
public class ImageDeletionWorker(
    IServiceScopeFactory scopes,
    ILogger<ImageDeletionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var processor = scope.ServiceProvider.GetRequiredService<ImageDeletionProcessor>();
                    await processor.ProcessPendingAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception error)
                {
                    logger.LogError(
                        "Falha ao executar lote de limpeza. Tipo: {ErrorType}; origem: {ErrorStack}.",
                        error.GetType().Name, error.StackTrace);
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Encerramento normal solicitado pelo host, inclusive durante a espera do timer.
        }
    }
}
