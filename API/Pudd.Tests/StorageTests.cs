using System.Net;
using System.Text;
using Microsoft.Extensions.Configuration;
using Pudd.Application.Contracts;
using Pudd.Infrastructure.Storage;
using Xunit;

namespace Pudd.Tests;

public class StorageTests
{
    [Fact]
    public async Task UploadUsesSecretInApiKeyAndGeneratedPath()
    {
        var handler = new RecordingHandler();
        var storage = Create(handler);
        await storage.UploadAsync("posts", "owner/image.png", Scenario.Png);
        Assert.Equal("https://project.example.test/storage/v1/object/posts/owner/image.png", handler.Url);
        Assert.Equal("sb_secret_testing_only", handler.Key);
        Assert.Null(handler.Authorization);
        Assert.Equal("image/png", handler.ContentType);
        Assert.Equal(Scenario.Png.Data, handler.Body);
    }

    [Theory]
    [InlineData("/object/sign/posts/file.png?token=test")]
    [InlineData("/storage/v1/object/sign/posts/file.png?token=test")]
    public async Task SigningBuildsAbsoluteUrlWithShortExpiry(string url)
    {
        var handler = new RecordingHandler { ResponseBody = "{\"signedURL\":\"" + url + "\"}" };
        var result = await Create(handler).GetSignedUrlAsync("posts", "file.png");
        Assert.Equal("https://project.example.test/storage/v1/object/sign/posts/file.png?token=test", result.Url);
        Assert.Equal(300, result.ExpiresInSeconds);
        Assert.Contains("\"expiresIn\":300", Encoding.UTF8.GetString(handler.Body!));
    }

    [Theory]
    [InlineData("../secret")]
    [InlineData("folder/../secret")]
    [InlineData("/absolute")]
    public async Task InvalidPathNeverSendsRequest(string path)
    {
        var handler = new RecordingHandler();
        await Assert.ThrowsAsync<AppException>(() => Create(handler).DeleteAsync("posts", path));
        Assert.Null(handler.Url);
    }

    [Fact]
    public async Task VendorErrorDoesNotLeakBody()
    {
        var handler = new RecordingHandler { Status = HttpStatusCode.Forbidden, ResponseBody = "sensitive-vendor-body" };
        var error = await Assert.ThrowsAsync<AppException>(() => Create(handler).UploadAsync("posts", "file.png", Scenario.Png));
        Assert.Equal(ErrorCode.StorageUnavailable, error.Code);
        Assert.DoesNotContain("sensitive-vendor-body", error.Message);
    }

    [Fact]
    public async Task MissingObjectDeletionIsIdempotent()
    {
        var handler = new RecordingHandler { Status = HttpStatusCode.NotFound };
        await Create(handler).DeleteAsync("posts", "missing.png");
    }

    private static SupabaseImageStorage Create(RecordingHandler handler) => new(new HttpClient(handler),
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Supabase:Url"] = "https://project.example.test",
            ["Supabase:SecretKey"] = "sb_secret_testing_only"
        }).Build());

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public string? Url, Key, Authorization, ContentType;
        public byte[]? Body;
        public HttpStatusCode Status = HttpStatusCode.OK;
        public string ResponseBody = "{}";
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Url = request.RequestUri!.AbsoluteUri;
            Key = request.Headers.GetValues("apikey").Single();
            Authorization = request.Headers.Authorization?.ToString();
            ContentType = request.Content?.Headers.ContentType?.MediaType;
            Body = request.Content is null ? null : await request.Content.ReadAsByteArrayAsync(ct);
            return new(Status) { Content = new StringContent(ResponseBody, Encoding.UTF8, "application/json") };
        }
    }
}
