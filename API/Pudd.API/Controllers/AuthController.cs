using Pudd.API.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pudd.Application.Contracts;
using Pudd.Application.Contracts.Enums;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting(ApiRateLimiting.Login)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromServices] AuthService authService)
    {
        var resultado = await authService.AutenticarUsuario(request);

        if (resultado.Response is { } response)
        {
            return Ok(response);
        }

        return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "E-mail ou senha inválidos.");
    }

    [HttpPost("register")]
    [EnableRateLimiting(ApiRateLimiting.Registration)]
    public async Task<IActionResult> Cadastrar(
        [FromBody] RegisterRequest request,
        [FromServices] RegisterService registerService)
    {
        var resultado = await registerService.CadastrarUsuario(request);

        if (resultado.Response is { } response)
        {
            return Ok(response);
        }

        return resultado.Error switch
        {
            AuthErrors.EmailExistente =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: "Já existe um usuário com este e-mail."),

            _ => Problem(
                title: "Erro inesperado no cadastro.",
                statusCode: StatusCodes.Status500InternalServerError)
        };
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting(ApiRateLimiting.ForgotPassword)]
    public async Task<IActionResult> EsqueceuSenha(
        [FromBody] ForgotPasswordRequest request,
        [FromServices] PasswordResetService service)
    {
        await service.SolicitarResetAsync(request);
        // Sempre 200 para evitar enumeração de e-mails
        return Ok(new { message = "Se este e-mail estiver cadastrado, você receberá o código em breve." });
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting(ApiRateLimiting.ForgotPassword)]
    public async Task<IActionResult> RedefinirSenha(
        [FromBody] ResetPasswordRequest request,
        [FromServices] PasswordResetService service)
    {
        var sucesso = await service.RedefinirSenhaAsync(request);
        if (!sucesso)
            return Problem(statusCode: StatusCodes.Status400BadRequest,
                title: "Código inválido, expirado ou e-mail não encontrado.");
        return Ok(new { message = "Senha redefinida com sucesso." });
    }
}
