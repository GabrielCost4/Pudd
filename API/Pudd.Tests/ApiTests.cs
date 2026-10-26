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
using Pudd.Domain.Enums.Roles;
using Pudd.Infrastructure;
using Xunit;

namespace Pudd.Tests;

public partial class ApiTests
{
    [Fact]
    public async Task RegistrationNormalizesNameAndRecordsTheInitialSession()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new { Nome = "  Nova   Pessoa  ", Email = "new@example.test", Senha = "Valid!1234" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<PuddDbContext>().users.SingleAsync();
        Assert.Equal("Nova Pessoa", user.Name);
        Assert.NotNull(user.LastLoginAt);
        Assert.Equal(user.LastLoginAt, user.LastSeenAt);
    }

    [Fact]
    public async Task SearchOnlyExposesPublicSuggestionsAndProtectsAdminEndpoints()
    {
        await using var factory = new ApiFactory();
        using var client = await CreateAuthenticatedClient(factory);
        Guid memberId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
            var member = new User { ID = Guid.NewGuid(), Name = "Search Person", Email = "private@example.test" };
            memberId = member.ID;
            db.users.Add(member);
            await db.SaveChangesAsync();
        }
        var response = await client.GetAsync("/api/users/search?q=search");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("email", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("role", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("lastSeenAt", json, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(memberId, Assert.Single((await response.Content.ReadFromJsonAsync<UserSuggestionResponse[]>())!).ID);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/users/search?q=search")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/admin/users/{memberId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/auth/register",
            new { Nome = " search  person ", Email = "new@example.test", Senha = "Valid!1234" })).StatusCode);
    }

    [Fact]
    public async Task SuccessfulLoginRecordsDatesAndFailedLoginDoesNotChangeThem()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        Guid id;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
            var user = new User { ID = Guid.NewGuid(), Name = "Login test", Email = "login@example.test",
                PasswordHash = scope.ServiceProvider.GetRequiredService<IPasswordHasher>().GerarHash("Valid!1234") };
            id = user.ID;
            db.users.Add(user);
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login",
            new { Email = "login@example.test", Senha = "Wrong!1234" })).StatusCode);
        using (var scope = factory.Services.CreateScope())
            Assert.Null((await scope.ServiceProvider.GetRequiredService<PuddDbContext>().users.FindAsync(id))!.LastLoginAt);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login",
            new { Email = "login@example.test", Senha = "Valid!1234" })).StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var user = (await scope.ServiceProvider.GetRequiredService<PuddDbContext>().users.FindAsync(id))!;
            Assert.NotNull(user.LastLoginAt);
            Assert.Equal(user.LastLoginAt, user.LastSeenAt);
        }
    }

    [Fact]
    public async Task CurrentRoleOverridesPermissionsInAnAlreadyIssuedToken()
    {
        await using var factory = new ApiFactory();
        using var client = await CreateAuthenticatedClient(factory, UserRole.Admin);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/users")).StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
            var user = await db.users.SingleAsync();
            user.Role = UserRole.User;
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/users/me")).StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
            var user = await db.users.SingleAsync();
            user.IsBlocked = true;
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/users/me")).StatusCode);
    }

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
        using var rejected = await client.PutAsync(url, null);
        await AssertRateLimited(rejected);
        // Ler curtidas não consome a cota de curtir/descurtir.
        for (int i = 0; i < 35; i++)
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.DeleteAsync(url)).StatusCode);
        using var otherClient = await CreateAuthenticatedClient(factory);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.PutAsync(url, null)).StatusCode);
    }

    [Theory]
    [InlineData("login", 10, "register")]
    [InlineData("register", 5, "login")]
    public async Task AuthenticationLimitsCountInvalidRequestsAndKeepPoliciesSeparate(
        string action, int limit, string otherAction)
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        for (var i = 0; i < limit; i++)
        {
            // Um cabeçalho enviado pelo cliente não pode trocar o IP confiável da conexão.
            client.DefaultRequestHeaders.Remove("X-Forwarded-For");
            client.DefaultRequestHeaders.Add("X-Forwarded-For", $"192.0.2.{i + 1}");
            using var response = await client.PostAsJsonAsync($"/api/auth/{action}", new { });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
        using var rejected = await client.PostAsJsonAsync($"/api/auth/{action}", new { });
        await AssertRateLimited(rejected);
        using var independent = await client.PostAsJsonAsync($"/api/auth/{otherAction}", new { });
        Assert.Equal(HttpStatusCode.BadRequest, independent.StatusCode);
    }

    [Fact]
    public async Task LoginQuotaDoesNotBlockAnotherConnectionIp()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        async Task<int> Send(string ip)
        {
            var context = await factory.Server.SendAsync(context =>
            {
                context.Connection.RemoteIpAddress = IPAddress.Parse(ip);
                context.Request.Scheme = "https";
                context.Request.Method = "POST";
                context.Request.Path = "/api/auth/login";
                context.Request.ContentType = "application/json";
                context.Request.ContentLength = 2;
                context.Request.Body = new MemoryStream("{}"u8.ToArray());
            });
            return context.Response.StatusCode;
        }
        for (var i = 0; i < 10; i++)
            Assert.Equal(400, await Send("192.0.2.1"));
        Assert.Equal(429, await Send("192.0.2.1"));
        Assert.Equal(400, await Send("192.0.2.2"));
    }

    [Theory]
    [InlineData("POST", "/api/posts", 10, true, 400)]
    [InlineData("PUT", "/api/posts/11111111-1111-4111-8111-111111111111", 10, true, 400)]
    [InlineData("DELETE", "/api/posts/11111111-1111-4111-8111-111111111111", 10, false, 404)]
    [InlineData("POST", "/api/posts/11111111-1111-4111-8111-111111111111/comments", 30, false, 400)]
    [InlineData("DELETE", "/api/comments/11111111-1111-4111-8111-111111111111", 30, false, 404)]
    [InlineData("PUT", "/api/users/me", 20, false, 400)]
    [InlineData("PUT", "/api/users/me/avatar", 5, true, 400)]
    [InlineData("DELETE", "/api/users/me/avatar", 5, false, 204)]
    [InlineData("PUT", "/api/admin/users/11111111-1111-4111-8111-111111111111/blocked", 30, false, 404)]
    [InlineData("DELETE", "/api/admin/posts/11111111-1111-4111-8111-111111111111", 30, false, 404)]
    [InlineData("DELETE", "/api/admin/comments/11111111-1111-4111-8111-111111111111", 30, false, 404)]
    public async Task WriteRoutesHaveTheirOwnLimits(
        string method, string url, int limit, bool multipart, int expectedStatus)
    {
        await using var factory = new ApiFactory();
        using var client = await CreateAuthenticatedClient(factory, UserRole.Admin);
        for (var i = 0; i < limit; i++)
        {
            using var request = CreateRequest(method, url, multipart);
            using var response = await client.SendAsync(request);
            Assert.Equal((HttpStatusCode)expectedStatus, response.StatusCode);
        }
        using var excess = CreateRequest(method, url, multipart);
        using var rejected = await client.SendAsync(excess);
        await AssertRateLimited(rejected);
        // Esgotar uma ação não impede o usuário de ler o próprio perfil.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/users/me")).StatusCode);
    }

    [Fact]
    public async Task ReadQuotaIsPerUserAndDoesNotConsumeWriteQuota()
    {
        await using var factory = new ApiFactory();
        using var client = await CreateAuthenticatedClient(factory);
        for (var i = 0; i < 180; i++)
        {
            using var response = await client.GetAsync("/api/users/me");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
        using var rejected = await client.GetAsync("/api/posts");
        await AssertRateLimited(rejected);
        using var update = await client.PutAsJsonAsync("/api/users/me", new { });
        Assert.Equal(HttpStatusCode.BadRequest, update.StatusCode);
        using var otherClient = await CreateAuthenticatedClient(factory);
        Assert.Equal(HttpStatusCode.OK, (await otherClient.GetAsync("/api/users/me")).StatusCode);
    }

    private static HttpRequestMessage CreateRequest(string method, string url, bool multipart)
    {
        HttpContent content;
        if (multipart)
        {
            var form = new MultipartFormDataContent();
            form.Add(new StringContent(""), "Content");
            content = form;
        }
        else content = JsonContent.Create(new { });
        return new HttpRequestMessage(new HttpMethod(method), url) { Content = content };
    }

    private static async Task<HttpClient> CreateAuthenticatedClient(ApiFactory factory, UserRole role = UserRole.User)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
        var user = new User { ID = Guid.NewGuid(), Name = "Rate test", Email = $"{Guid.NewGuid()}@example.test", Role = role };
        db.users.Add(user);
        await db.SaveChangesAsync();
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            scope.ServiceProvider.GetRequiredService<IJwtService>().GerarToken(user).AccessToken);
        return client;
    }

    private static async Task AssertRateLimited(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var retryAfter = response.Headers.RetryAfter?.Delta;
        Assert.NotNull(retryAfter);
        Assert.InRange(retryAfter.Value.TotalSeconds, 1, 60);
        var problem = await response.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>();
        Assert.Equal(429, problem?.Status);
        Assert.Equal("Muitas tentativas em pouco tempo.", problem?.Title);
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
