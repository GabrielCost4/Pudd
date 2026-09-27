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
    public async Task<IActionResult> ListUsers(int page = 1, int pageSize = 20) =>
        Ok(await users.GetUsersAsync(ActorId, page, pageSize));

    [HttpPut("users/{id:guid}/blocked")]
    public async Task<IActionResult> SetBlocked(Guid id, [FromBody] SetBlockedRequest request)
    {
        await users.SetBlockedAsync(ActorId, id, request.IsBlocked);
        return NoContent();
    }

    [HttpDelete("posts/{id:guid}")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        await posts.DeleteAsync(ActorId, id, moderation: true);
        return NoContent();
    }

    [HttpDelete("comments/{id:guid}")]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        await comments.DeleteAsync(ActorId, id, moderation: true);
        return NoContent();
    }
}
