using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;

namespace Pudd.API.RateLimiting;

public static class ApiRateLimiting
{
    public const string Login = "login";
    public const string Registration = "registration";
    public const string Reads = "reads";
    public const string Posts = "posts";
    public const string Comments = "comments";
    public const string Profile = "profile";
    public const string Avatar = "avatar";
    public const string Likes = "likes";
    public const string Moderation = "moderation";

    public static IServiceCollection AddApiRateLimiting(this IServiceCollection services)
    {
        return services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, _) =>
            {
                var seconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
                    ? Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds))
                    : 60;
                context.HttpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
                await Results.Problem(
                    statusCode: StatusCodes.Status429TooManyRequests,
                    title: "Muitas tentativas em pouco tempo.",
                    detail: "Aguarde o tempo indicado em Retry-After e tente novamente."
                ).ExecuteAsync(context.HttpContext);
            };

            (string Name, int Limit, bool ByIp)[] policies =
            [
                (Login, 10, true),
                (Registration, 5, true),
                (Reads, 180, false),
                (Posts, 10, false),
                (Comments, 30, false),
                (Profile, 20, false),
                (Avatar, 5, false),
                (Likes, 30, false),
                (Moderation, 30, false),
            ];

            foreach (var policy in policies)
            {
                options.AddPolicy(policy.Name, context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        !policy.ByIp && context.User.FindFirstValue("sub") is { } userId
                            ? "user:" + userId
                            : "ip:" + (context.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "unknown"),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = policy.Limit,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true,
                        }
                    ));
            }
        });
    }
}
