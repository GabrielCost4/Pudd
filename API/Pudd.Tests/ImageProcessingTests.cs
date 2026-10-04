using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Pudd.Application.Contracts;
using Pudd.Application.Services;
using Pudd.Application.Validation;
using Pudd.Domain.Entities;
using Xunit;

namespace Pudd.Tests;

public class ImageProcessingTests
{
    [Fact]
    public async Task SuccessfulDeletionCompletesThePendingJob()
    {
        var queue = new FakeQueue();
        var job = new PendingImageDeletion { Bucket = "posts", Path = "owner/image.png" };
        queue.Pending.Add(job);
        var storage = new FakeStorage();
        var processor = new ImageDeletionProcessor(queue, storage, NullLogger<ImageDeletionProcessor>.Instance);

        await processor.ProcessPendingAsync(default);

        Assert.Equal((job.Bucket, job.Path), Assert.Single(storage.Deletions));
        Assert.Same(job, Assert.Single(queue.Completed));
        Assert.Empty(queue.Retried);
    }

    [Fact]
    public async Task StorageFailureSchedulesRetryWithoutCompletingJob()
    {
        var queue = new FakeQueue();
        var job = new PendingImageDeletion { Bucket = "posts", Path = "owner/image.png" };
        queue.Pending.Add(job);
        var processor = new ImageDeletionProcessor(queue, new FakeStorage { FailDelete = true },
            NullLogger<ImageDeletionProcessor>.Instance);

        await processor.ProcessPendingAsync(default);

        Assert.Same(job, Assert.Single(queue.Retried));
        Assert.Empty(queue.Completed);
    }

    [Fact]
    public async Task RetryFailureDoesNotStopRemainingJobs()
    {
        var queue = new FakeQueue { FailRetry = true };
        queue.Pending.AddRange([
            new PendingImageDeletion { Bucket = "posts", Path = "owner/first.png" },
            new PendingImageDeletion { Bucket = "posts", Path = "owner/second.png" }
        ]);
        var storage = new FakeStorage { FailDelete = true };
        var processor = new ImageDeletionProcessor(queue, storage, NullLogger<ImageDeletionProcessor>.Instance);

        await processor.ProcessPendingAsync(default);

        Assert.Equal(2, storage.Deletions.Count);
        Assert.Empty(queue.Completed);
    }

    [Fact]
    public async Task CancellationStopsTheBatchBeforeDeletingFiles()
    {
        var queue = new FakeQueue();
        queue.Pending.Add(new PendingImageDeletion { Bucket = "posts", Path = "owner/image.png" });
        var storage = new FakeStorage();
        var processor = new ImageDeletionProcessor(queue, storage, NullLogger<ImageDeletionProcessor>.Instance);
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => processor.ProcessPendingAsync(cancellation.Token));

        Assert.Empty(storage.Deletions);
        Assert.Empty(queue.Retried);
    }

    [Fact]
    public async Task QueueFailureDoesNotReplaceTheOriginalUploadError()
    {
        var service = new ImageService(new FakeStorage { FailUpload = true },
            new FakeQueue { FailEnqueue = true }, NullLogger<ImageService>.Instance);

        var error = await Assert.ThrowsAsync<AppException>(() =>
            service.UploadAsync("posts", Guid.NewGuid(), Scenario.Png));

        Assert.Equal(ErrorCode.StorageUnavailable, error.Code);
    }

    [Fact]
    public async Task StorageAndQueueFailuresDoNotReplaceTheOriginalDatabaseError()
    {
        await using var scenario = new Scenario();
        scenario.Storage.FailDelete = true;
        scenario.Queue.FailEnqueue = true;
        var service = new PostService(new FailingPosts(), scenario.Users, scenario.Access, scenario.Images,
            new CreatePostRequestValidator(), new UpdatePostRequestValidator());

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(scenario.Owner.ID, new() { Content = "texto" }, Scenario.Png));

        Assert.Equal("falha simulada", error.Message);
    }

    [Fact]
    public async Task ProcessorLogsFailureTypeAndStackWithoutSensitiveMessage()
    {
        var queue = new FakeQueue();
        queue.Pending.Add(new PendingImageDeletion { Bucket = "posts", Path = "owner/image.png" });
        var logger = new RecordingLogger<ImageDeletionProcessor>();
        var processor = new ImageDeletionProcessor(queue, new SecretFailureStorage(), logger);

        await processor.ProcessPendingAsync(default);

        var log = Assert.Single(logger.Messages);
        Assert.Contains(nameof(IOException), log);
        Assert.Contains(nameof(SecretFailureStorage.DeleteAsync), log);
        Assert.DoesNotContain("secret-credential", log);
    }

    private sealed class SecretFailureStorage : Pudd.Application.Interfaces.IImageStorage
    {
        public Task DeleteAsync(string bucket, string path, CancellationToken ct = default) =>
            throw new IOException("secret-credential");
        public Task UploadAsync(string bucket, string path, ImageUpload image, CancellationToken ct = default) =>
            throw new NotSupportedException();
        public Task<ImageUrlResponse> GetSignedUrlAsync(string bucket, string path, CancellationToken ct = default) =>
            throw new NotSupportedException();
    }

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state,
            Exception? exception, Func<TState, Exception?, string> formatter) =>
            Messages.Add(formatter(state, exception));
    }
}
