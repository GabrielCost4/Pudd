using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;
using FluentValidation;
using Pudd.Application.Validation;

namespace Pudd.Application.Services
{
    public class UserService(
        IUserRepository users,
                AccountAccess access,
                ImageService images,
                IValidator<UpdateProfileRequest> validator)
    {
        public async Task<ProfileResponse> GetProfileAsync(Guid actorId, Guid userId)
        {
            await access.RequireActiveAsync(actorId);
            return Map(await FindAsync(userId));
        }

        public async Task<ProfileResponse> UpdateProfileAsync(Guid actorId, UpdateProfileRequest request)
        {
            var user = await access.RequireActiveAsync(actorId);
            await RequestValidation.ValidateAsync(validator, request);
            var name = request.Name.Trim();
            user.Name = name;
            user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
            await users.UpdateAsync(user);
            return Map(user);
        }

        public async Task SetAvatarAsync(Guid actorId, ImageUpload image, CancellationToken ct = default)
        {
            var user = await access.RequireActiveAsync(actorId);
            var oldPath = user.AvatarImagePath;
            var path = await images.UploadAsync("avatars", actorId, image, ct);
            user.AvatarImagePath = path;
            try
            {
                await users.UpdateWithAvatarCleanupAsync(user, oldPath);
            }
            catch
            {
                await images.DiscardAsync("avatars", path);
                throw;
            }
        }

        public async Task RemoveAvatarAsync(Guid actorId)
        {
            var user = await access.RequireActiveAsync(actorId);
            var oldPath = user.AvatarImagePath;
            user.AvatarImagePath = null;
            await users.UpdateWithAvatarCleanupAsync(user, oldPath);
        }

        public async Task<ImageUrlResponse> GetAvatarAsync(Guid actorId, Guid userId, CancellationToken ct = default)
        {
            await access.RequireActiveAsync(actorId);
            return await images.GetUrlAsync("avatars", (await FindAsync(userId)).AvatarImagePath, ct);
        }

        public async Task<PageResponse<AdminUserResponse>> GetUsersAsync(Guid actorId, int page, int pageSize)
        {
            await access.RequireAdminAsync(actorId);
            SocialRules.Page(page, pageSize);
            return SocialRules.Slice((await users.GetPageAsync(page, pageSize))
                .Select(u => new AdminUserResponse(u.ID, u.Name, u.Email, u.Role.ToString(), u.IsBlocked)), page, pageSize);
        }

        public async Task SetBlockedAsync(Guid actorId, Guid userId, bool blocked)
        {
            await access.RequireAdminAsync(actorId);
            if (actorId == userId && blocked)
                throw new AppException(ErrorCode.Conflict, "O administrador não pode bloquear a própria conta.");
            var user = await FindAsync(userId);
            user.IsBlocked = blocked;
            await users.UpdateAsync(user);
        }

        private async Task<User> FindAsync(Guid id) => await users.GetByIdAsync(id)
            ?? throw new AppException(ErrorCode.NotFound, "Usuário não encontrado.");

        // O perfil público da comunidade não expõe e-mail, hash, role ou estado de bloqueio.
        private static ProfileResponse Map(User u) => new(u.ID, u.Name, u.Bio, u.AvatarImagePath is not null);
    }
}
