using FluentValidation;
using Pudd.Application.Contracts;

namespace Pudd.Application.Validation;

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(request => request.Email)
        .NotEmpty()
        .EmailAddress();

        RuleFor(request => request.Senha)
        .NotEmpty();
    }
}
