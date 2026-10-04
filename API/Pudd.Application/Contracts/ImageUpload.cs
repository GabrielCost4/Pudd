namespace Pudd.Application.Contracts;

// Bytes e tipo atravessam as camadas sem depender de IFormFile/ASP.NET.
public record ImageUpload(byte[] Data, string ContentType)
{
    public const int MaxBytes = 5 * 1024 * 1024;
}
