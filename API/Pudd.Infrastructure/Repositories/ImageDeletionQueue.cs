using Microsoft.EntityFrameworkCore;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Repositories;

public class ImageDeletionQueue(PuddDbContext context, DbContextOptions<PuddDbContext> options)
    : IImageDeletionQueue
{
    public async Task EnqueueAsync(string bucket, string path, CancellationToken ct = default)
    {
        // Contexto separado: não tenta salvar novamente a operação que acabou de falhar.
        await using var cleanupContext = new PuddDbContext(options);
        cleanupContext.pendingImageDeletions.Add(
            new PendingImageDeletion { Bucket = bucket, Path = path }
        );
        await cleanupContext.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<PendingImageDeletion>> GetPendingAsync(CancellationToken ct) =>
        await context
            .pendingImageDeletions.AsNoTracking()
            .Where(item => item.NextAttemptAt <= DateTimeOffset.UtcNow)
            .OrderBy(item => item.NextAttemptAt)
            .Take(20)
            .ToListAsync(ct);

    public async Task CompleteAsync(PendingImageDeletion item, CancellationToken ct)
    {
        await context.pendingImageDeletions.Where(row => row.ID == item.ID).ExecuteDeleteAsync(ct);
    }

    public async Task RetryLaterAsync(PendingImageDeletion item, CancellationToken ct)
    {
        var next = DateTimeOffset.UtcNow.AddMinutes(Math.Min(60, (item.Attempts + 1) * 2));
        await context
            .pendingImageDeletions.Where(row => row.ID == item.ID)
            .ExecuteUpdateAsync(
                update =>
                    update
                        .SetProperty(row => row.Attempts, row => row.Attempts + 1)
                        .SetProperty(row => row.NextAttemptAt, next),
                ct
            );
    }
}
