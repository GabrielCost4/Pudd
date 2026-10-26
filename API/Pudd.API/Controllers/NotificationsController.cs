using Microsoft.AspNetCore.Mvc;
using Pudd.Application.Contracts;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

[Route("api/notifications")]
public class NotificationsController(
    NotificationService notifications) : SocialControllerBase
{
    [HttpGet]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Get() => Ok(await notifications.GetAllAsync(ActorId));

    [HttpPost("read")]
    public async Task<IActionResult> Read(ReadNotificationsRequest request)
    {
        await notifications.ReadAsync(ActorId, request);
        return NoContent();
    }
}
