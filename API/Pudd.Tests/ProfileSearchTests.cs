using Pudd.Application.Contracts;
using Pudd.Domain.Entities;
using Xunit;

namespace Pudd.Tests;

public class ProfileSearchTests
{
    [Fact]
    public async Task ProfileNamesAreNormalizedUniqueAndCanBeKeptByTheirOwner()
    {
        await using var s = new Scenario();
        var result = await s.Profiles.UpdateProfileAsync(s.Owner.ID, new() { Name = "  Ana   Silva  " });
        Assert.Equal("Ana Silva", result.Name);
        Assert.Equal("ana silva", s.Owner.NormalizedName);
        await s.Profiles.UpdateProfileAsync(s.Owner.ID, new() { Name = "ANA SILVA" });
        var error = await Assert.ThrowsAsync<AppException>(() =>
            s.Profiles.UpdateProfileAsync(s.Other.ID, new() { Name = " ana  silva " }));
        Assert.Equal(ErrorCode.Conflict, error.Code);
        Assert.Equal("Outro", s.Other.Name);
        Assert.Equal(ProfileNames.Key("João"), ProfileNames.Key("JOA\u0303O"));
        Assert.NotEqual(ProfileNames.Key("João"), ProfileNames.Key("Joao"));
    }

    [Fact]
    public async Task SearchRanksExactPrefixAndSubstringLimitsThreeAndHidesBlockedProfiles()
    {
        await using var s = new Scenario();
        var names = new[] { "Ana", "Anabela", "Mariana", "Ana Carolina", "Anastasia" };
        s.Db.users.AddRange(names.Select(name => new User { ID = Guid.NewGuid(), Name = name,
            Email = name + "@example.test", IsBlocked = name == "Anastasia", AvatarImagePath = name == "Ana" ? "avatar.png" : null }));
        await s.Db.SaveChangesAsync();
        var results = await s.Profiles.SearchAsync(s.Owner.ID, " ANA ");
        Assert.Equal(new[] { "Ana", "Ana Carolina", "Anabela" }, results.Select(user => user.Name));
        Assert.True(results[0].HasAvatar);
        Assert.Empty(await s.Profiles.SearchAsync(s.Owner.ID, "a"));
        Assert.Empty(await s.Profiles.SearchAsync(s.Owner.ID, "Anastasia"));
        var error = await Assert.ThrowsAsync<AppException>(() => s.Profiles.SearchAsync(s.Owner.ID, new string('a', 51)));
        Assert.Equal(ErrorCode.InvalidInput, error.Code);
    }
}
