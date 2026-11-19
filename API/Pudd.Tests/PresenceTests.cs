using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Pudd.Application.Contracts;
using Pudd.Infrastructure;
using Xunit;

namespace Pudd.Tests;

public partial class ApiTests
{
    [Fact]
    public async Task PresenceReflectsRecentHttpActivityAndExpires()
    {
        await using var factory = new ApiFactory();
        using var owner = await CreateAuthenticatedClient(factory);
        using var viewer = await CreateAuthenticatedClient(factory);
        var profile = (await owner.GetFromJsonAsync<ProfileResponse>("/api/users/me"))!;
        var path = $"/api/users/{profile.ID}";
        Assert.Equal(UserPresence.Offline, profile.Presence);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PuddDbContext>();
            var user = (await db.users.FindAsync(profile.ID))!;
            user.LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-7);
            await db.SaveChangesAsync();
        }

        var offline = (await viewer.GetFromJsonAsync<ProfileResponse>(path))!;
        Assert.Equal(UserPresence.Offline, offline.Presence);
        using var poll = await owner.GetAsync("/api/notifications");
        Assert.Equal(HttpStatusCode.OK, poll.StatusCode);
        var online = (await viewer.GetFromJsonAsync<ProfileResponse>(path))!;
        Assert.Equal(UserPresence.Online, online.Presence);
        Assert.True(online.PresenceRevision > offline.PresenceRevision);
    }

    [Fact]
    public async Task ProfileRequiresAuthenticationAndAnExistingUser()
    {
        await using var factory = new ApiFactory();
        using var anonymous = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        using var client = await CreateAuthenticatedClient(factory);
        var path = $"/api/users/{Guid.NewGuid()}";
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(path)).StatusCode);
    }
}
