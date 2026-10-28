using Microsoft.EntityFrameworkCore;
using Pudd.Application.Contracts;
using Xunit;

namespace Pudd.Tests;

public class BannerTests
{
    [Fact]
    public async Task ReplaceAndRemoveBannerPreservesAvatarAndQueuesOldFiles()
    {
        await using var s = new Scenario();
        s.Owner.AvatarImagePath = "owner/avatar.png";
        s.Owner.BannerImagePath = "owner/old.png";
        await s.Db.SaveChangesAsync();
        await s.Profiles.SetBannerAsync(s.Owner.ID, Scenario.Png);
        var path = s.Owner.BannerImagePath;
        Assert.NotNull(path);
        Assert.Equal(("banners", path), Assert.Single(s.Storage.Uploads));
        Assert.Equal("banners", (await s.Db.pendingImageDeletions.SingleAsync()).Bucket);
        Assert.True((await s.Profiles.GetProfileAsync(s.Other.ID, s.Owner.ID)).HasBanner);
        await s.Profiles.RemoveBannerAsync(s.Owner.ID);
        Assert.Null(s.Owner.BannerImagePath);
        Assert.Equal("owner/avatar.png", s.Owner.AvatarImagePath);
        Assert.False((await s.Profiles.GetProfileAsync(s.Other.ID, s.Owner.ID)).HasBanner);
        Assert.Contains(await s.Db.pendingImageDeletions.ToListAsync(), x => x.Bucket == "banners" && x.Path == path);
    }

    [Fact]
    public async Task InvalidImageLeavesPreviousBannerUntouched()
    {
        await using var s = new Scenario();
        s.Owner.BannerImagePath = "owner/old.png";
        await s.Db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<AppException>(() => s.Profiles.SetBannerAsync(s.Owner.ID, new ImageUpload([1, 2, 3], "image/png")));
        Assert.Equal(ErrorCode.InvalidInput, error.Code);
        Assert.Equal("owner/old.png", s.Owner.BannerImagePath);
        Assert.Empty(s.Storage.Uploads);
        Assert.Empty(s.Db.pendingImageDeletions);
    }
}
