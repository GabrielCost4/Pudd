using System.Net;
using System.Net.Http.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Pudd.API.Notifications;
using Pudd.Application.Contracts;
using Xunit;

namespace Pudd.Tests;

public partial class ApiTests
{
    private static HubConnection PresenceConnection(ApiFactory factory, HttpClient client) =>
        new HubConnectionBuilder().WithUrl("https://localhost/api/hubs/notifications", options =>
        {
            options.Transports = HttpTransportType.LongPolling;
            options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
            options.AccessTokenProvider = () => Task.FromResult(client.DefaultRequestHeaders.Authorization?.Parameter);
        }).Build();

    [Fact]
    public async Task PresenceTracksAllTabsAndNotifiesTheProfileObserver()
    {
        await using var factory = new ApiFactory();
        using var owner = await CreateAuthenticatedClient(factory);
        using var viewer = await CreateAuthenticatedClient(factory);
        var profile = (await owner.GetFromJsonAsync<ProfileResponse>("/api/users/me"))!;
        Assert.Equal(UserPresence.Offline, profile.Presence);
        var json = await owner.GetStringAsync("/api/users/me");
        Assert.Contains("\"presence\":\"Offline\"", json);

        var updates = Channel.CreateUnbounded<PresenceResponse>();
        await using var observer = PresenceConnection(factory, viewer);
        observer.On<PresenceResponse>("PresenceChanged", update => updates.Writer.TryWrite(update));
        await observer.StartAsync();
        var initial = await observer.InvokeAsync<PresenceResponse>("WatchProfilePresence", profile.ID);
        Assert.Equal(UserPresence.Offline, initial.Presence);

        await using var firstTab = PresenceConnection(factory, owner);
        await using var secondTab = PresenceConnection(factory, owner);
        await firstTab.StartAsync();
        var online = await updates.Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(profile.ID, online.UserID);
        Assert.Equal(UserPresence.Online, online.Presence);
        Assert.True(online.Revision > initial.Revision);
        await secondTab.StartAsync();
        await firstTab.StopAsync();
        Assert.Equal(UserPresence.Online, (await viewer.GetFromJsonAsync<ProfileResponse>($"/api/users/{profile.ID}"))!.Presence);
        await secondTab.StopAsync();
        var offline = await updates.Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(UserPresence.Offline, offline.Presence);
        Assert.True(offline.Revision > online.Revision);
        Assert.Equal(UserPresence.Offline, (await owner.GetFromJsonAsync<ProfileResponse>("/api/users/me"))!.Presence);

        // Reconectar a mesma conta recupera o estado online e uma revisao nova.
        await firstTab.StartAsync();
        var reconnected = await updates.Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(UserPresence.Online, reconnected.Presence);
        Assert.True(reconnected.Revision > offline.Revision);
        await observer.InvokeAsync("UnwatchProfilePresence");
        var snapshot = await observer.InvokeAsync<PresenceResponse>("WatchProfilePresence", profile.ID);
        Assert.Equal(UserPresence.Online, snapshot.Presence);
        Assert.True(snapshot.Revision >= reconnected.Revision);
        await observer.InvokeAsync("UnwatchProfilePresence");
        await firstTab.StopAsync();
        Assert.Equal(UserPresence.Offline, factory.Services.GetRequiredService<UserPresenceTracker>().Get(profile.ID).Presence);
    }

    [Fact]
    public async Task PresenceRequiresAuthenticationAndAnExistingProfile()
    {
        await using var factory = new ApiFactory();
        using var anonymous = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        await using var unauthenticated = PresenceConnection(factory, anonymous);
        var error = await Assert.ThrowsAsync<HttpRequestException>(() => unauthenticated.StartAsync());
        Assert.Equal(HttpStatusCode.Unauthorized, error.StatusCode);

        using var client = await CreateAuthenticatedClient(factory);
        await using var connection = PresenceConnection(factory, client);
        await connection.StartAsync();
        await Assert.ThrowsAsync<HubException>(() => connection.InvokeAsync<PresenceResponse>("WatchProfilePresence", Guid.NewGuid()));
    }
}
