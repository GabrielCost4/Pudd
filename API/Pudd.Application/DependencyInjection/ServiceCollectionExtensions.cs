using Microsoft.Extensions.DependencyInjection;
using Pudd.Application.Services;
using FluentValidation;
using Pudd.Application.Contracts;
using Pudd.Application.Validation;

namespace Pudd.Application.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(
        this IServiceCollection services)
    {
        services.AddScoped<AuthService>();
        services.AddScoped<RegisterService>();
        services.AddScoped<AccountAccess>();
        services.AddScoped<ImageService>();
        services.AddScoped<ImageDeletionProcessor>();
        services.AddScoped<PostService>();
        services.AddScoped<CommentService>();
        services.AddScoped<PostLikeService>();
        services.AddScoped<UserService>();
        services.AddTransient<IValidator<LoginRequest>, LoginRequestValidator>();
        services.AddTransient<IValidator<RegisterRequest>, RegisterRequestValidator>();
        services.AddTransient<IValidator<CreatePostRequest>, CreatePostRequestValidator>();
        services.AddTransient<IValidator<UpdatePostRequest>, UpdatePostRequestValidator>();
        services.AddTransient<IValidator<CreateCommentRequest>, CreateCommentRequestValidator>();
        services.AddTransient<IValidator<UpdateProfileRequest>, UpdateProfileRequestValidator>();

        return services;
    }
}
