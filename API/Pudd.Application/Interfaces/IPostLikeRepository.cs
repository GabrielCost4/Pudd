using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces;

public interface IPostLikeRepository
{
    Task SetLikedAsync(Guid userId, Guid postId, bool liked, Notification? notification = null);
    Task<int> CountAsync(Guid postId);
    Task<bool> IsLikedAsync(Guid userId, Guid postId);
}
