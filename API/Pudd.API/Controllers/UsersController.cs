using Microsoft.AspNetCore.Mvc;
using Pudd.API.Contracts;
using Pudd.API.Uploads;
using Pudd.Application.Contracts;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

[Route("api/users")]
public class UsersController(UserService users) : SocialControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me() => Ok(await users.GetProfileAsync(ActorId, ActorId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Profile(Guid id) =>
        Ok(await users.GetProfileAsync(ActorId, id));

    [HttpPut("me")]
    public async Task<IActionResult> Update([FromBody] UpdateProfileRequest request) =>
        Ok(await users.UpdateProfileAsync(ActorId, request));

    [HttpPut("me/avatar")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Avatar([FromForm] AvatarForm form, CancellationToken ct)
    {
        var image =
            await UploadedImage.ReadAsync(form.Image, ct)
            ?? throw new AppException(ErrorCode.InvalidInput, "Envie uma imagem.");
        await users.SetAvatarAsync(ActorId, image, ct);
        return NoContent();
    }

    [HttpDelete("me/avatar")]
    public async Task<IActionResult> RemoveAvatar()
    {
        await users.RemoveAvatarAsync(ActorId);
        return NoContent();
    }

    [HttpGet("{id:guid}/avatar")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetAvatar(Guid id, CancellationToken ct) =>
        Ok(await users.GetAvatarAsync(ActorId, id, ct));
}
