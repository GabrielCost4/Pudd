using Microsoft.EntityFrameworkCore;
using Pudd.Application.Contracts;
using Pudd.Application.Services;
using Pudd.Domain.Enums.Roles;
using Pudd.Infrastructure.Repositories;
using Xunit;

namespace Pudd.Tests;

public class CommunityFeedbackTests
{
    [Fact]
    public async Task FeedbackKeepsAuthenticatedAuthorAndIsVisibleOnlyToAdmin()
    {
        await using var s = new Scenario();
        var service = new CommunityFeedbackService(new CommunityFeedbackRepository(s.Db), s.Access, TimeProvider.System);
        await service.CreateAsync(s.Owner.ID, new("Suggestion", "  Quero comunidades por assunto.  "), default);
        var stored = await s.Db.feedbacks.SingleAsync();
        Assert.Equal(s.Owner.ID, stored.UserID);
        Assert.Equal("Quero comunidades por assunto.", stored.Description);
        Assert.Equal("Suggestion", stored.Kind);
        var error = await Assert.ThrowsAsync<AppException>(() => service.ListAsync(s.Other.ID, 1, 20, default));
        Assert.Equal(ErrorCode.Forbidden, error.Code);
        s.Other.Role = UserRole.Admin;
        await s.Db.SaveChangesAsync();
        var page = await service.ListAsync(s.Other.ID, 1, 20, default);
        Assert.Equal(stored.ID, Assert.Single(page.Items).ID);
        Assert.Equal(s.Owner.Name, page.Items[0].AuthorName);
    }

    [Theory]
    [InlineData("Other", "Uma mensagem suficientemente longa")]
    [InlineData("Bug", "curto")]
    [InlineData("Suggestion", "          ")]
    public async Task InvalidFeedbackDoesNotPersist(string kind, string description)
    {
        await using var s = new Scenario();
        var service = new CommunityFeedbackService(new CommunityFeedbackRepository(s.Db), s.Access, TimeProvider.System);
        var error = await Assert.ThrowsAsync<AppException>(() => service.CreateAsync(s.Owner.ID, new(kind, description), default));
        Assert.Equal(ErrorCode.InvalidInput, error.Code);
        Assert.Empty(s.Db.feedbacks);
    }
}
