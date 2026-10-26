using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;
using Xunit;

namespace Pudd.Tests;

public partial class ApiTests
{
    [Fact]
    public async Task QueryStringTokenIsAcceptedOnlyForTheNotificationsHub()
    {
        await using var factory = new ApiFactory();
        using var authenticated = await CreateAuthenticatedClient(factory);
        var token = Uri.EscapeDataString(authenticated.DefaultRequestHeaders.Authorization!.Parameter!);
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

        using var hub = await client.PostAsync(
            $"/api/hubs/notifications/negotiate?negotiateVersion=1&access_token={token}", null);
        Assert.Equal(HttpStatusCode.OK, hub.StatusCode);

        using var profile = await client.GetAsync($"/api/users/me?access_token={token}");
        Assert.Equal(HttpStatusCode.Unauthorized, profile.StatusCode);
    }

    [Fact]
    public async Task TokenForAMissingAccountIsRejected()
    {
        await using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var user = new User { ID = Guid.NewGuid(), Name = "Missing account", Email = "missing@example.test" };
        var token = scope.ServiceProvider.GetRequiredService<IJwtService>().GerarToken(user).AccessToken;
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var result = await client.GetAsync("/api/users/me");
        Assert.Equal(HttpStatusCode.Unauthorized, result.StatusCode);
    }
}
