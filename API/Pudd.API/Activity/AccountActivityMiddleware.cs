using System.Security.Claims;
using Pudd.Application.Interfaces;

namespace Pudd.API.Activity;

public sealed class AccountActivityMiddleware(RequestDelegate next, ILogger<AccountActivityMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, IUserRepository users, TimeProvider clock)
    {
        var now = clock.GetUtcNow();
        await next(context);
        var path = context.Request.Path.Value ?? "";
        // Only successful interactive API operations count. Media and future background feeds do not.
        if (context.Response.StatusCode is < 200 or >= 300 ||
            context.User.Identity?.IsAuthenticated != true ||
            !(path.StartsWith("/api/posts", StringComparison.OrdinalIgnoreCase) ||
              path.StartsWith("/api/users", StringComparison.OrdinalIgnoreCase) ||
              path.StartsWith("/api/admin", StringComparison.OrdinalIgnoreCase)) ||
            (HttpMethods.IsGet(context.Request.Method) &&
             (path.EndsWith("/avatar", StringComparison.OrdinalIgnoreCase) ||
              path.EndsWith("/image", StringComparison.OrdinalIgnoreCase))) ||
            !Guid.TryParse(context.User.FindFirstValue("sub"), out var id)) return;
        try
        {
            await users.RecordAccessAsync(id, now);
        }
        catch (Exception error)
        {
            // Activity is informational: never turn an already completed operation into an error.
            logger.LogWarning("Activity update failed for {UserId}: {ErrorType}", id, error.GetType().Name);
        }
    }
}
