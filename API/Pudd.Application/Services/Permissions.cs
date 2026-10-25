using Pudd.Domain.Enums.Roles;

namespace Pudd.Application.Services;

public static class Permissions
{
    public const string ClaimType = "permission";
    public const string Community = "community.use";
    public const string UsersRead = "users.read";
    public const string UsersBlock = "users.block";
    public const string PostsModerate = "posts.moderate";
    public const string CommentsModerate = "comments.moderate";
    public static IReadOnlyList<string> All { get; } = Array.AsReadOnly(
        new[] { Community, UsersRead, UsersBlock, PostsModerate, CommentsModerate });

    public static IReadOnlyList<string> ForRole(UserRole role) => role switch
    {
        UserRole.Admin => All,
        UserRole.User => [Community],
        _ => []
    };
}
