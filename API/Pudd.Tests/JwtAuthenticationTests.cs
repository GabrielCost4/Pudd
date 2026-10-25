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
