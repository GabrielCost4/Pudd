using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;
using FluentValidation;
using Pudd.Application.Validation;

namespace Pudd.Application.Services;

public class CommentService(
    ICommentRepository comments,
    IPostRepository posts,
    AccountAccess access,
    IValidator<CreateCommentRequest> validator
)
{
    public async Task<CommentResponse> CreateAsync(
        Guid actorId,
        Guid postId,
        CreateCommentRequest request
    )
    {
        var actor = await access.RequireActiveAsync(actorId);
        await RequestValidation.ValidateAsync(validator, request);
        var content = request.Content.Trim();
        await RequirePostAsync(postId);
        var comment = new Comment
        {
            ID = Guid.NewGuid(),
            PostID = postId,
            UserID = actorId,
            User = actor,
            Content = content,
        };
        await comments.AddAsync(comment);
        return Map(comment);
    }

    public async Task<PageResponse<CommentResponse>> GetPageAsync(
        Guid actorId,
        Guid postId,
        int page,
        int pageSize
    )
    {
        await access.RequireActiveAsync(actorId);
        SocialRules.Page(page, pageSize);
        await RequirePostAsync(postId);
        return SocialRules.Slice(
            (await comments.GetPageAsync(postId, page, pageSize)).Select(Map),
            page,
            pageSize
        );
    }

    public async Task DeleteAsync(Guid actorId, Guid commentId, bool moderation = false)
    {
        if (moderation)
            await access.RequireAdminAsync(actorId);
        else
            await access.RequireActiveAsync(actorId);
        var comment =
            await comments.GetByIdAsync(commentId)
            ?? throw new AppException(ErrorCode.NotFound, "Comentário não encontrado.");
        if (!moderation)
            SocialRules.Owner(comment.UserID, actorId);
        await comments.DeleteAsync(comment);
    }

    private async Task RequirePostAsync(Guid id)
    {
        if (await posts.GetByIdAsync(id) is null)
            throw new AppException(ErrorCode.NotFound, "Postagem não encontrada.");
    }

    private static CommentResponse Map(Comment c) =>
        new(c.ID, c.PostID, c.UserID, c.User.Name, c.Content, c.CreatedAt);
}
