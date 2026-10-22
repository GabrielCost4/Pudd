namespace Pudd.Application.Services;

public static class AccountActivity
{
    public static bool IsActive(DateTimeOffset? lastSeenAt, DateTimeOffset now) =>
        lastSeenAt.HasValue && lastSeenAt.Value >= now.AddDays(-30);
}
