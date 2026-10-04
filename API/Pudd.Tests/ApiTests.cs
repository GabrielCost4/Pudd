using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Pudd.API.Workers;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;
using Pudd.Infrastructure;
using Xunit;

namespace Pudd.Tests;

public class ApiTests
{
    [Fact]
    public async Task RegistrationValidationReturnsFieldErrorsAndDoesNotPersistUser()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

        var result = await client.PostAsJsonAsync("/api/auth/register",
            new { Nome = "   ", Email = "invalid", Senha = "weak" });

        Assert.Equal(HttpStatusCode.BadRequest, result.StatusCode);
        Assert.Equal("application/problem+json", result.Content.Headers.ContentType?.MediaType);
        var problem = await result.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains("Nome", problem.Errors.Keys);
        Assert.Contains("Email", problem.Errors.Keys);
        Assert.Contains("Senha", problem.Errors.Keys);
        using var scope = factory.Services.CreateScope();
        Assert.Empty(scope.ServiceProvider.GetRequiredService<PuddDbContext>().users);
    }

    [Fact]
    public async Task InvalidCredentialsReturnProblemDetails()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

        var result = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = "missing@example.test", Senha = "Valid!1234" });

        Assert.Equal(HttpStatusCode.Unauthorized, result.StatusCode);
        Assert.Equal("application/problem+json", result.Content.Headers.ContentType?.MediaType);
        var problem = await result.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>();
        Assert.Equal(401, problem?.Status);
    }

    [Fact]
    public async Task AnonymousRequestsAreRejected()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        var result = await client.GetAsync("/api/posts");
        Assert.Equal(HttpStatusCode.Unauthorized, result.StatusCode);
    }

    [Fact]
    public async Task MultipartCreationProfileAndBlockingWorkThroughHttp()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
        var user = new User { ID = Guid.NewGuid(), Name = "Teste", Email = "http@example.test" };
        db.users.Add(user);
        await db.SaveChangesAsync();
        var token = scope.ServiceProvider.GetRequiredService<IJwtService>().GerarToken(user).AccessToken;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Post pela API"), "Content");
        var image = new ByteArrayContent(Scenario.Png.Data);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(image, "Image", "avatar.png");
        var created = await client.PostAsync("/api/posts", form);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var post = await created.Content.ReadFromJsonAsync<PostResponse>();
        Assert.NotNull(post);
        Assert.True(post.HasImage);
        Assert.Equal(user.ID, post.UserID);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(created.Headers.Location)).StatusCode);
        var signed = await client.GetAsync($"/api/posts/{post.ID}/image");
        Assert.Equal(HttpStatusCode.OK, signed.StatusCode);
        Assert.True(signed.Headers.CacheControl?.NoStore);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/users")).StatusCode);
        var profile = await client.PutAsJsonAsync("/api/users/me", new { Name = "Nome novo", Bio = "C#" });
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);
        var payload = await profile.Content.ReadAsStringAsync();
        Assert.DoesNotContain("password", payload, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("email", payload, StringComparison.OrdinalIgnoreCase);

        // O JWT continua assinado e dentro da validade, mas o bloqueio já deve valer.
        user.IsBlocked = true;
        await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/posts")).StatusCode);
    }

    [Fact]
    public async Task LoginDoesNotIssueTokenForBlockedAccount()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        db.users.Add(new User { ID = Guid.NewGuid(), Name = "Bloqueado", Email = "blocked@example.test",
            IsBlocked = true, PasswordHash = hasher.GerarHash("Valid!1234") });
        await db.SaveChangesAsync();
        var result = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = "blocked@example.test", Senha = "Valid!1234" });
        Assert.Equal(HttpStatusCode.Unauthorized, result.StatusCode);
    }

    [Fact]
    public async Task LikeRoutesLimitRequestsPerAuthenticatedUser()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
        var user = new User { ID = Guid.NewGuid(), Name = "Teste", Email = "rate@example.test" };
        db.users.Add(user);
        await db.SaveChangesAsync();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            scope.ServiceProvider.GetRequiredService<IJwtService>().GerarToken(user).AccessToken);
        // Um ID inexistente ainda passa pelo limitador antes de o service responder 404.
        var url = $"/api/posts/{Guid.NewGuid()}/like";
        for (int i = 0; i < 30; i++)
            Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsync(url, null)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PutAsync(url, null)).StatusCode);
    }

    private sealed class ApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureLogging(logging => logging.ClearProviders().AddConsole());
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=127.0.0.1;Database=unused");
            builder.UseSetting("Jwt:Key", "testing-only-signing-key-longer-than-thirty-two-bytes");
            builder.UseSetting("Jwt:Issuer", "PuddTests");
            builder.UseSetting("Jwt:Audience", "PuddTests");
            builder.UseSetting("Jwt:ExpirationMinutes", "30");
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<PuddDbContext>();
                services.RemoveAll<DbContextOptions<PuddDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<PuddDbContext>>();
                // Usa um banco em memória compartilhado por todos os escopos desta API de teste.
                var dbName = Guid.NewGuid().ToString();
                services.AddDbContext<PuddDbContext>(options => options.UseInMemoryDatabase(dbName));
                services.RemoveAll<IImageStorage>();
                services.AddSingleton<IImageStorage, FakeStorage>();
                foreach (var service in services.Where(s => s.ImplementationType == typeof(ImageDeletionWorker)).ToArray())
                    services.Remove(service);
            });
        }
    }
}
