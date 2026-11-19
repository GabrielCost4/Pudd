using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Pudd.Application.Interfaces;
using Pudd.Application.Services;

namespace Pudd.API.Authentication;

public sealed class JwtBearerEventsHandler(
    IUserRepository users) : JwtBearerEvents
{
    public override async Task TokenValidated(TokenValidatedContext context)
    {
        if (!Guid.TryParse(context.Principal?.FindFirstValue("sub"), out var userId))
        {
            context.Fail("Identidade inválida.");
            return;
        }

        var user = await users.GetByIdAsync(userId);
        if (user is null || user.IsBlocked)
        {
            context.Fail("Conta indisponível.");
            return;
        }

        var identity = (ClaimsIdentity)context.Principal!.Identity!;
        foreach (var claim in identity.FindAll(Permissions.ClaimType).ToArray())
            identity.RemoveClaim(claim);
        foreach (var permission in Permissions.ForRole(user.Role))
            identity.AddClaim(new Claim(Permissions.ClaimType, permission));
    }
}
