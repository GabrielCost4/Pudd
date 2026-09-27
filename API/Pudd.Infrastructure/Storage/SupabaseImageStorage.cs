using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.Infrastructure.Storage;

// Usa a API HTTP do Storage; nenhuma entidade depende do SDK ou banco do Supabase.
public class SupabaseImageStorage(
    HttpClient client, 
    IConfiguration configuration
) : IImageStorage
{
    private const int UrlLifetimeSeconds = 300;

    public async Task UploadAsync(
        string bucket,
        string path,
        ImageUpload image,
        CancellationToken ct = default
    )
    {
        using var request = Create(HttpMethod.Post, $"object/{ObjectKey(bucket, path)}");
        request.Headers.Add("x-upsert", "false");
        request.Content = new ByteArrayContent(image.Data);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(image.ContentType);
        using var response = await SendAsync(request, ct);
        EnsureSuccess(response);
    }

    public async Task DeleteAsync(string bucket, string path, CancellationToken ct = default)
    {
        _ = ObjectKey(bucket, path);
        // A remoção em lote aceita uma lista com um arquivo e é segura para novas tentativas.
        using var request = Create(HttpMethod.Delete, $"object/{bucket}");
        request.Content = JsonContent.Create(new { prefixes = new[] { path } });
        using var response = await SendAsync(request, ct);
        if (response.StatusCode == HttpStatusCode.NotFound)
            return;
        EnsureSuccess(response);
    }

    public async Task<ImageUrlResponse> GetSignedUrlAsync(
        string bucket,
        string path,
        CancellationToken ct = default
    )
    {
        using var request = Create(HttpMethod.Post, $"object/sign/{ObjectKey(bucket, path)}");
        request.Content = JsonContent.Create(new { expiresIn = UrlLifetimeSeconds });
        using var response = await SendAsync(request, ct);
        EnsureSuccess(response);
        try
        {
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var relative = body.RootElement.GetProperty("signedURL").GetString();
            if (string.IsNullOrWhiteSpace(relative))
                throw Unavailable();
            var root = ProjectUri();
            var url = relative.StartsWith("/storage/v1/", StringComparison.Ordinal)
                ? new Uri(root, relative)
                : new Uri(new Uri(root, "storage/v1/"), relative.TrimStart('/'));
            if (url.Host != root.Host || url.Scheme != root.Scheme)
                throw Unavailable();
            return new(url.AbsoluteUri, UrlLifetimeSeconds);
        }
        catch (Exception ex)
            when (ex
                    is JsonException
                        or KeyNotFoundException
                        or UriFormatException
                        or InvalidOperationException
            )
        {
            throw Unavailable();
        }
    }

    private HttpRequestMessage Create(HttpMethod method, string relative)
    {
        var key = configuration["Supabase:SecretKey"];
        if (string.IsNullOrWhiteSpace(key))
            throw Unavailable();
        var request = new HttpRequestMessage(
            method,
            new Uri(ProjectUri(), "storage/v1/" + relative)
        );
        // sb_secret usa apikey. Apenas a chave legada service_role também é um JWT Bearer.
        request.Headers.Add("apikey", key);
        if (!key.StartsWith("sb_secret_", StringComparison.Ordinal))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        return request;
    }

    private Uri ProjectUri()
    {
        var value = configuration["Supabase:Url"];
        if (
            !Uri.TryCreate(value?.TrimEnd('/') + "/", UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || uri.AbsolutePath != "/"
            || uri.Query.Length > 0
            || uri.Fragment.Length > 0
            || uri.UserInfo.Length > 0
        )
            throw Unavailable();
        return uri;
    }

    private static string ObjectKey(string bucket, string path)
    {
        if (
            bucket is not ("posts" or "avatars")
            || string.IsNullOrWhiteSpace(path)
            || path.Split('/').Any(part => part is "" or "." or "..")
            || path.Contains('\\')
        )
            throw new AppException(ErrorCode.InvalidInput, "Referência de imagem inválida.");
        return bucket + "/" + string.Join('/', path.Split('/').Select(Uri.EscapeDataString));
    }

    private async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken ct
    )
    {
        try
        {
            return await client.SendAsync(request, ct);
        }
        catch (HttpRequestException)
        {
            throw Unavailable();
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            throw Unavailable();
        }
    }

    private static void EnsureSuccess(HttpResponseMessage response)
    {
        // Não repassa corpo/headers do fornecedor: podem conter detalhes internos.
        if (!response.IsSuccessStatusCode)
            throw Unavailable();
    }

    private static AppException Unavailable() =>
        new(
            ErrorCode.StorageUnavailable,
            "Não foi possível acessar o armazenamento de imagens. Tente novamente mais tarde."
        );
}
