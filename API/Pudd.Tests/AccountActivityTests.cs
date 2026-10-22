using Microsoft.EntityFrameworkCore;
using Pudd.Application.Services;
using Xunit;

namespace Pudd.Tests;

public class AccountActivityTests
{
    [Fact]
    public void ThirtyDayBoundaryIsInclusiveAndMissingAccessIsInactive()
    {
        var now = DateTimeOffset.Parse("2026-10-20T12:00:00Z");
        Assert.True(AccountActivity.IsActive(now.AddDays(-30), now));
        Assert.False(AccountActivity.IsActive(now.AddDays(-30).AddTicks(-1), now));
        Assert.False(AccountActivity.IsActive(null, now));
    }

    [Fact]
    public async Task AccessUpdatesAreThrottledAndDoNotChangeLastLogin()
    {
        await using var scenario = new Scenario();
        var now = DateTimeOffset.Parse("2026-10-20T12:00:00Z");
        await scenario.Users.RecordLoginAsync(scenario.Owner.ID, now);
        await scenario.Users.RecordAccessAsync(scenario.Owner.ID, now.AddMinutes(4));
        Assert.Equal(now, scenario.Owner.LastSeenAt);
        await scenario.Users.RecordAccessAsync(scenario.Owner.ID, now.AddMinutes(5));
        Assert.Equal(now.AddMinutes(5), scenario.Owner.LastSeenAt);
        Assert.Equal(now, scenario.Owner.LastLoginAt);
        Assert.Equal(now, (await scenario.Db.users.SingleAsync(u => u.ID == scenario.Owner.ID)).LastLoginAt);
    }
}
