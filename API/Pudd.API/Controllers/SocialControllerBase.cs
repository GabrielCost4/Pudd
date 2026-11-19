using Pudd.API.RateLimiting;
using Pudd.Application.Services;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pudd.Application.Contracts;

namespace Pudd.API.Controllers;

[ApiController]
[Authorize(Policy = Permissions.Community)]
[EnableRateLimiting(ApiRateLimiting.Reads)]
public abstract class SocialControllerBase : ControllerBase
{
    protected IActionResult PrivateImageUrl(ImageUrlResponse image)
    {
        // The JSON contains a signed URL issued after authorization. Cache it only in the browser.
        var remaining = image.ExpiresAt is { } expiry
            ? (int)Math.Floor((expiry - DateTimeOffset.UtcNow).TotalSeconds)
            : image.ExpiresInSeconds;
        var maxAge = Math.Clamp(remaining - 15, 0, 60);
        Response.Headers.CacheControl = $"private, max-age={maxAge}, must-revalidate";
        Response.Headers.Append("Vary", "Authorization, Origin");
        return Ok(image);
    }

    // Apenas claims de um JWT já validado podem identificar quem faz a requisição.
    protected Guid ActorId =>
        Guid.TryParse(User.FindFirstValue("sub"), out var id)
            ? id
            : throw new AppException(ErrorCode.Unauthenticated, "Identidade inválida.");
}
