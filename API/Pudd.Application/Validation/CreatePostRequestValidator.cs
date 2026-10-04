using FluentValidation;
using Pudd.Application.Contracts;

namespace Pudd.Application.Validation;

public sealed class CreatePostRequestValidator : AbstractValidator<CreatePostRequest>
{
    public CreatePostRequestValidator()
    {
        RuleFor(request => request.Content)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().Must(content => content.Trim().Length <= 5000)
            .WithMessage("Conteúdo deve ter até 5.000 caracteres.");
    }
}
