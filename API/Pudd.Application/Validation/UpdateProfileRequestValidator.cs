using FluentValidation;
using Pudd.Application.Contracts;

namespace Pudd.Application.Validation;

public sealed class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(request => request.Name).Cascade(CascadeMode.Stop)
            .NotEmpty().Must(name => name.Trim().Length <= 50)
            .WithMessage("Nome deve ter até 50 caracteres.");
        RuleFor(request => request.Bio).Must(bio => bio is null || bio.Trim().Length <= 500)
            .WithMessage("A bio deve ter até 500 caracteres.");
    }
}
