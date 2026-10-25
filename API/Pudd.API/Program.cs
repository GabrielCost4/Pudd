using Pudd.API.Authentication;
using Pudd.API.Activity;
using Pudd.API.RateLimiting;
using Pudd.API.Errors;
using Pudd.API.Workers;
using Pudd.Application.DependencyInjection;
using Pudd.Infrastructure.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddApplication();
builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:4200"])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithExposedHeaders("Retry-After"));
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddApiRateLimiting();

builder.Services.AddHostedService<ImageDeletionWorker>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseExceptionHandler();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseMiddleware<AccountActivityMiddleware>();
app.MapControllers();

app.Run();

// Permite hospedar a API em memória nos testes de integração.
public partial class Program { }
