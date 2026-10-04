using Microsoft.Extensions.DependencyInjection;
using Pudd.Application.Services;

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
        services.AddScoped<PostService>();
        services.AddScoped<CommentService>();
        services.AddScoped<PostLikeService>();
        services.AddScoped<UserService>();

        return services;
    }
}