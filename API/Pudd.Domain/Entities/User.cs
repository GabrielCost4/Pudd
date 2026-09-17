using Pudd.Domain.Enums.Roles;

namespace Pudd.Domain.Entities
{
    public class User
    {
        public Guid ID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;   
        public string PasswordHash { get; set;} = string.Empty;
        public UserRole Role { get; set;} = UserRole.User;
        public string? Bio { get; set; }
        public string? AvatarImagePath { get; set; }
        public bool IsBlocked { get; set; }

        public ICollection<Post> Posts { get; set; } = [];
        public ICollection<Comment> Comments { get; set; } = [];
        public ICollection<PostLike> PostLikes { get; set; } = [];
    }
}
