using Pudd.API.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

[Route("api/posts/{postId:guid}/like")]
public class PostLikesController(PostLikeService likes) : SocialControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Guid postId) => Ok(await likes.GetAsync(ActorId, postId));

    [HttpPut]
    [EnableRateLimiting(ApiRateLimiting.Likes)]
    public async Task<IActionResult> Like(Guid postId) =>
        Ok(await likes.SetLikedAsync(ActorId, postId, true));

    [HttpDelete]
    [EnableRateLimiting(ApiRateLimiting.Likes)]
    public async Task<IActionResult> Unlike(Guid postId) =>
        Ok(await likes.SetLikedAsync(ActorId, postId, false));
}
