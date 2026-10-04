using FluentValidation;
using Pudd.Application.Contracts;

namespace Pudd.Application.Validation;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(request => request.Nome)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(request => request.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(request => request.Senha)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(20)
            .Must(password => password.Any(char.IsUpper)
                && password.Any(char.IsDigit)
                && password.Any(character => !char.IsLetterOrDigit(character)))
            .WithMessage("A senha precisa conter letra maiúscula, número e símbolo.");
    }
}
