using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;
using Pudd.Domain.Enums.Roles;

namespace Pudd.Application.Services;

public class AccountAccess(IUserRepository users)
{
    public async Task<User> RequireActiveAsync(Guid userId)
    {
        var user = await users.GetByIdAsync(userId)
            ?? throw new AppException(ErrorCode.Unauthenticated, "Usuário não encontrado.");
        if (user.IsBlocked)
            throw new AppException(ErrorCode.Forbidden, "Esta conta está bloqueada.");
        return user;
    }

    public async Task<User> RequireAdminAsync(Guid userId)
    {
        var user = await RequireActiveAsync(userId);
        if (user.Role != UserRole.Admin)
            throw new AppException(ErrorCode.Forbidden, "Esta ação exige um administrador.");
        return user;
    }
}
