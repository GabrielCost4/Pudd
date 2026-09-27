using Pudd.Application.Contracts;

namespace Pudd.Application.Interfaces;

public interface IImageStorage
{
    Task UploadAsync(string bucket, string path, ImageUpload image, CancellationToken ct = default);
    Task DeleteAsync(string bucket, string path, CancellationToken ct = default);
    Task<ImageUrlResponse> GetSignedUrlAsync(string bucket, string path, CancellationToken ct = default);
}
