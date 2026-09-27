using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Application.Services;

public class PostService(
    IPostRepository posts,
    IUserRepository users,
    AccountAccess access,
    ImageService images
)
{
    public async Task<PostResponse> CreateAsync(
        Guid actorId,
        CreatePostRequest request,
        ImageUpload? image = null,
        CancellationToken ct = default
    )
    {
        var actor = await access.RequireActiveAsync(actorId);
        var content = SocialRules.Text(request.Content, 5000, "Conteúdo");
        var path = image is null ? null : await images.UploadAsync("posts", actorId, image, ct);
        var post = new Post
        {
            ID = Guid.NewGuid(),
            UserID = actorId,
            User = actor,
            Content = content,
            ImagePath = path,
        };
        try
        {
            await posts.AddAsync(post);
        }
        catch
        {
            if (path is not null)
                await images.DiscardAsync("posts", path);
            throw;
        }
        return Map(post);
    }

    public async Task<PostResponse> GetAsync(Guid actorId, Guid postId)
    {
        await access.RequireActiveAsync(actorId);
        return Map(await FindAsync(postId));
    }

    public async Task<PageResponse<PostResponse>> GetFeedAsync(
        Guid actorId,
        int page,
        int pageSize,
        Guid? authorId = null
    )
    {
        await access.RequireActiveAsync(actorId);
        SocialRules.Page(page, pageSize);
        if (authorId.HasValue && await users.GetByIdAsync(authorId.Value) is null)
            throw new AppException(ErrorCode.NotFound, "Autor não encontrado.");
        var result = authorId.HasValue
            ? await posts.GetByUserAsync(authorId.Value, page, pageSize)
            : await posts.GetFeedAsync(page, pageSize);
        return SocialRules.Slice(result.Select(Map), page, pageSize);
    }

    public async Task<PostResponse> UpdateAsync(
        Guid actorId,
        Guid postId,
        UpdatePostRequest request,
        ImageUpload? image = null,
        CancellationToken ct = default
    )
    {
        await access.RequireActiveAsync(actorId);
        var post = await FindAsync(postId);
        SocialRules.Owner(post.UserID, actorId);
        var content = SocialRules.Text(request.Content, 5000, "Conteúdo");
        if (request.RemoveImage && image is not null)
            throw new AppException(
                ErrorCode.InvalidInput,
                "Escolha remover ou substituir a imagem."
            );
        var oldPath = post.ImagePath;
        var newPath = image is null ? null : await images.UploadAsync("posts", actorId, image, ct);
        post.Content = content;
        post.UpdatedAt = DateTimeOffset.UtcNow;
        if (image is not null || request.RemoveImage)
            post.ImagePath = newPath;
        try
        {
            await posts.UpdateAsync(post, oldPath != post.ImagePath ? oldPath : null);
        }
        catch
        {
            if (newPath is not null)
                await images.DiscardAsync("posts", newPath);
            throw;
        }
        return Map(post);
    }

    public async Task DeleteAsync(Guid actorId, Guid postId, bool moderation = false)
    {
        if (moderation)
            await access.RequireAdminAsync(actorId);
        else
            await access.RequireActiveAsync(actorId);
        var post = await FindAsync(postId);
        if (!moderation)
            SocialRules.Owner(post.UserID, actorId);
        // O banco remove comentários/curtidas em cascata; o worker limpa a imagem no Storage.
        await posts.DeleteAsync(post);
    }

    public async Task<ImageUrlResponse> GetImageAsync(
        Guid actorId,
        Guid postId,
        CancellationToken ct = default
    )
    {
        await access.RequireActiveAsync(actorId);
        return await images.GetUrlAsync("posts", (await FindAsync(postId)).ImagePath, ct);
    }

    private async Task<Post> FindAsync(Guid id) =>
        await posts.GetByIdAsync(id)
        ?? throw new AppException(ErrorCode.NotFound, "Postagem não encontrada.");

    private static PostResponse Map(Post post) =>
        new(
            post.ID,
            post.UserID,
            post.User.Name,
            post.Content,
            post.ImagePath is not null,
            post.CreatedAt,
            post.UpdatedAt
        );
}
