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

internal static class SocialRules
{
    public static string Text(string? text, int maxLength, string label)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Trim().Length > maxLength)
            throw new AppException(ErrorCode.InvalidInput, $"{label} deve ter de 1 a {maxLength} caracteres.");
        return text.Trim();
    }

    public static void Page(int page, int size)
    {
        if (page < 1 || size < 1 || size > 50 || (long)(page - 1) * size > int.MaxValue)
            throw new AppException(ErrorCode.InvalidInput, "Página deve ser positiva e tamanho deve estar entre 1 e 50.");
    }

    public static PageResponse<T> Slice<T>(IEnumerable<T> items, int page, int size)
    {
        // O repository lê um item extra para saber se há próxima página, sem COUNT adicional.
        var list = items.ToList();
        return new(list.Take(size).ToList(), page, size, list.Count > size);
    }

    public static void Owner(Guid ownerId, Guid actorId)
    {
        if (ownerId != actorId)
            throw new AppException(ErrorCode.Forbidden, "Apenas o autor pode alterar este conteúdo.");
    }
}
