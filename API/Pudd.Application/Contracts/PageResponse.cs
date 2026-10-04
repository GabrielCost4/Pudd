namespace Pudd.Application.Contracts;

public record PageResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, bool HasNextPage);
