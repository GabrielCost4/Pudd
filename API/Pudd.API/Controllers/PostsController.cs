using Microsoft.AspNetCore.Mvc;
using Pudd.API.Contracts;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

[Route("api/posts")]
public class PostsController(PostService posts) : SocialControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Feed(int page = 1, int pageSize = 20, Guid? authorId = null) =>
        Ok(await posts.GetFeedAsync(ActorId, page, pageSize, authorId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id) => Ok(await posts.GetAsync(ActorId, id));

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Create([FromForm] CreatePostForm form, CancellationToken ct)
    {
        var post = await posts.CreateAsync(ActorId,form,await UploadedImage.ReadAsync(form.Image, ct),ct);
        
        return CreatedAtAction(nameof(Get), new { id = post.ID }, post);
    }

    [HttpPut("{id:guid}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromForm] UpdatePostForm form,
        CancellationToken ct
    ) =>
        Ok(
            await posts.UpdateAsync(
                ActorId,
                id,
                form,
                await UploadedImage.ReadAsync(form.Image, ct),
                ct
            )
        );

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await posts.DeleteAsync(ActorId, id);
        return NoContent();
    }

    [HttpGet("{id:guid}/image")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Image(Guid id, CancellationToken ct) =>
        Ok(await posts.GetImageAsync(ActorId, id, ct));
}
