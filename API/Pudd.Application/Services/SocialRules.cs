using Pudd.Application.Contracts;

namespace Pudd.Application.Services;

internal static class SocialRules
{
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
