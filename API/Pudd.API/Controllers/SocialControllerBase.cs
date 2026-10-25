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
    // Apenas claims de um JWT já validado podem identificar quem faz a requisição.
    protected Guid ActorId =>
        Guid.TryParse(User.FindFirstValue("sub"), out var id)
            ? id
            : throw new AppException(ErrorCode.Unauthenticated, "Identidade inválida.");
}
