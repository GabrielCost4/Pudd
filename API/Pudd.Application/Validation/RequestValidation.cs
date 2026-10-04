using FluentValidation;
using Pudd.Application.Contracts;

namespace Pudd.Application.Validation;

public static class RequestValidation
{
    public static async Task ValidateAsync<T>(IValidator<T> validator, T request, CancellationToken ct = default)
    {
        var result = await validator.ValidateAsync(request, ct);
        if (result.IsValid)
            return;

        var errors = result.Errors.GroupBy(error => error.PropertyName)
            .ToDictionary(group => group.Key,
                group => group.Select(error => error.ErrorMessage)
                .Distinct()
                .ToArray());
                
        throw new AppException(ErrorCode.InvalidInput, "Verifique os dados informados.", errors);
    }
}
