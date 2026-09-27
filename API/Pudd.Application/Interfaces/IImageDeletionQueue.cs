using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces;

public interface IImageDeletionQueue
{
    // Compensa uploads quando salvar o post/perfil falha.
    Task EnqueueAsync(string bucket, string path, CancellationToken ct = default);
    Task<IReadOnlyList<PendingImageDeletion>> GetPendingAsync(CancellationToken ct);
    Task CompleteAsync(PendingImageDeletion item, CancellationToken ct);
    Task RetryLaterAsync(PendingImageDeletion item, CancellationToken ct);
}
