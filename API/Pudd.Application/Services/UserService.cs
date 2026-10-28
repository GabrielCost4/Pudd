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
                IValidator<UpdateProfileRequest> validator, TimeProvider clock,
                IUserPresenceReader presence, IPostRepository posts)
    {
        public async Task<ProfileResponse> GetProfileAsync(Guid actorId, Guid userId)
        {
            await access.RequireActiveAsync(actorId);
            return await MapAsync(await FindAsync(userId));
        }

        public async Task<ProfileResponse> UpdateProfileAsync(Guid actorId, UpdateProfileRequest request)
        {
            var user = await access.RequireActiveAsync(actorId);
            await RequestValidation.ValidateAsync(validator, request);
            var name = ProfileNames.Display(request.Name);
            if (await users.NameExistsAsync(ProfileNames.Key(name), actorId))
                throw new AppException(ErrorCode.Conflict, "Este nome de perfil já está em uso.");
            user.Name = name;
            user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
            await users.UpdateAsync(user);
            return await MapAsync(user);
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
                .Select(u => new AdminUserResponse(u.ID, u.Name, u.Email, u.Role.ToString(), u.IsBlocked, u.LastLoginAt, u.LastSeenAt, AccountActivity.IsActive(u.LastSeenAt, clock.GetUtcNow()))), page, pageSize);
        }

        public async Task<IReadOnlyList<UserSuggestionResponse>> SearchAsync(Guid actorId, string? query, bool administrative = false)
        {
            if (administrative) await access.RequireAdminAsync(actorId);
            else await access.RequireActiveAsync(actorId);
            var normalized = ProfileNames.Key(query ?? "");
            if (normalized.Length < 2) return [];
            if (normalized.Length > 50)
                throw new AppException(ErrorCode.InvalidInput, "Pesquisa deve ter até 50 caracteres.");
            return await users.SearchAsync(normalized, administrative);
        }

        public async Task<AdminUserResponse> GetAdminUserAsync(Guid actorId, Guid userId)
        {
            await access.RequireAdminAsync(actorId);
            var user = await FindAsync(userId);
            return new(user.ID, user.Name, user.Email, user.Role.ToString(), user.IsBlocked,
                user.LastLoginAt, user.LastSeenAt, AccountActivity.IsActive(user.LastSeenAt, clock.GetUtcNow()));
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
        private async Task<ProfileResponse> MapAsync(User u)
        {
            var state = presence.Get(u.ID);
            return new(u.ID, u.Name, u.Bio, u.AvatarImagePath is not null, state.Presence, state.Revision, await posts.CountByUserAsync(u.ID));
        }
    }
}
