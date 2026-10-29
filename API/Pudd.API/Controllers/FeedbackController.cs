using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pudd.API.RateLimiting;
using Pudd.Application.Contracts;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

[Route("api/feedbacks")]
public class FeedbackController(CommunityFeedbackService feedbacks) : SocialControllerBase
{
    [HttpPost]
    [EnableRateLimiting(ApiRateLimiting.Profile)]
    public async Task<IActionResult> Create([FromBody] CreateFeedbackRequest request, CancellationToken ct)
    {
        await feedbacks.CreateAsync(ActorId, request, ct);
        return NoContent();
    }

    [HttpGet("/api/admin/feedbacks")]
    [Authorize(Policy = Permissions.UsersRead)]
    public async Task<IActionResult> List(CancellationToken ct, int page = 1, int pageSize = 20) =>
        Ok(await feedbacks.ListAsync(ActorId, page, pageSize, ct));
}