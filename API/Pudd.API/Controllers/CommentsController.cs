using Microsoft.AspNetCore.Mvc;
using Pudd.Application.Contracts;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

[Route("api")]
public class CommentsController(CommentService comments) : SocialControllerBase
{
    [HttpGet("posts/{postId:guid}/comments")]
    public async Task<IActionResult> List(Guid postId, int page = 1, int pageSize = 20) =>
        Ok(await comments.GetPageAsync(ActorId, postId, page, pageSize));

    [HttpPost("posts/{postId:guid}/comments")]
    public async Task<IActionResult> Create(Guid postId, [FromBody] CreateCommentRequest request)
    {
        var comment = await comments.CreateAsync(ActorId, postId, request);
        return StatusCode(StatusCodes.Status201Created, comment);
    }

    [HttpDelete("comments/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await comments.DeleteAsync(ActorId, id);
        return NoContent();
    }
}
