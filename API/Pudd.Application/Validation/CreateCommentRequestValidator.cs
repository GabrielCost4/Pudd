using FluentValidation;
using Pudd.Application.Contracts;

namespace Pudd.Application.Validation;

public sealed class CreateCommentRequestValidator : AbstractValidator<CreateCommentRequest>
{
    public CreateCommentRequestValidator()
    {
        RuleFor(request => request.Content)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(content => content.Trim().Length <= 2000)
            .WithMessage("Comentário deve ter até 2.000 caracteres.");
    }
}
