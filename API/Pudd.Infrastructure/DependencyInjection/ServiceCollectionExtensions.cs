using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pudd.Application.Interfaces;
using Pudd.Infrastructure.Repositories;
using Pudd.Infrastructure.Security;
using Pudd.Infrastructure.Storage;

namespace Pudd.Infrastructure.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var connectionString =
            configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "A string de conexão 'DefaultConnection' não foi configurada."
            );

        services.AddDbContext<PuddDbContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IPostRepository, PostRepository>();
        services.AddScoped<ICommentRepository, CommentRepository>();
        services.AddScoped<IPostLikeRepository, PostLikeRepository>();
        services.AddScoped<IImageDeletionQueue, ImageDeletionQueue>();

        services
            .AddHttpClient<IImageStorage, SupabaseImageStorage>(client =>
                client.Timeout = TimeSpan.FromSeconds(30)
            )
            .RemoveAllLoggers();

        return services;
    }
}
