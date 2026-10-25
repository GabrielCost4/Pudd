using Pudd.API.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Pudd.Application.Contracts;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

// Os services conferem a role atual no banco, além da autenticação exigida pelo controller.
[Route("api/admin")]
public class AdminController(
    UserService users, 
    PostService posts, 
    CommentService comments) : SocialControllerBase
{
    [HttpGet("users")]
    [Authorize(Policy = Permissions.UsersRead)]
    public async Task<IActionResult> ListUsers(int page = 1, int pageSize = 20) =>
        Ok(await users.GetUsersAsync(ActorId, page, pageSize));

    [HttpGet("users/search")]
    [Authorize(Policy = Permissions.UsersRead)]
    public async Task<IActionResult> Search(string? q) => Ok(await users.SearchAsync(ActorId, q, administrative: true));

    [HttpGet("users/{id:guid}")]
    [Authorize(Policy = Permissions.UsersRead)]
    public async Task<IActionResult> Member(Guid id) => Ok(await users.GetAdminUserAsync(ActorId, id));

    [HttpPut("users/{id:guid}/blocked")]
    [Authorize(Policy = Permissions.UsersBlock)]
    [EnableRateLimiting(ApiRateLimiting.Moderation)]
    public async Task<IActionResult> SetBlocked(Guid id, [FromBody] SetBlockedRequest request)
    {
        await users.SetBlockedAsync(ActorId, id, request.IsBlocked);
        return NoContent();
    }

    [HttpDelete("posts/{id:guid}")]
    [Authorize(Policy = Permissions.PostsModerate)]
    [EnableRateLimiting(ApiRateLimiting.Moderation)]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        await posts.DeleteAsync(ActorId, id, moderation: true);
        return NoContent();
    }

    [HttpDelete("comments/{id:guid}")]
    [Authorize(Policy = Permissions.CommentsModerate)]
    [EnableRateLimiting(ApiRateLimiting.Moderation)]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        await comments.DeleteAsync(ActorId, id, moderation: true);
        return NoContent();
    }
}
