using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.Application.Services;

public class PostLikeService(IPostLikeRepository likes, IPostRepository posts, AccountAccess access)
{
    public async Task<LikeResponse> GetAsync(Guid actorId, Guid postId)
    {
        await access.RequireActiveAsync(actorId);
        if (await posts.GetByIdAsync(postId) is null)
            throw new AppException(ErrorCode.NotFound, "Postagem não encontrada.");
        return new(await likes.IsLikedAsync(actorId, postId), await likes.CountAsync(postId));
    }

    public async Task<LikeResponse> SetLikedAsync(Guid actorId, Guid postId, bool liked)
    {
        await access.RequireActiveAsync(actorId);
        if (await posts.GetByIdAsync(postId) is null)
            throw new AppException(ErrorCode.NotFound, "Postagem não encontrada.");
        // PUT define curtida e DELETE remove; repetir a requisição não inverte o estado.
        await likes.SetLikedAsync(actorId, postId, liked);
        return new(liked, await likes.CountAsync(postId));
    }
}
