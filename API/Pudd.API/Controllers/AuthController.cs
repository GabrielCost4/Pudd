using Microsoft.AspNetCore.Mvc;
using Pudd.Application.Contracts;
using Pudd.Application.Contracts.Enums;
using Pudd.Application.Services;

namespace Pudd.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AuthService authService,
    RegisterService registerService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var resultado = await authService.AutenticarUsuario(request);

        if (resultado.Response is { } response)
        {
            return Ok(response);
        }

        return Unauthorized("E-mail ou senha inválidos.");
    }

    [HttpPost("register")]
    public async Task<IActionResult> Cadastrar([FromBody] RegisterRequest request)
    {
        var resultado = await registerService.CadastrarUsuario(request);

        if (resultado.Response is { } response)
        {
            return Ok(response);
        }

        return resultado.Error switch
        {
            AuthErrors.EmailExistente =>
                Conflict("Já existe um usuário com este e-mail."),

            AuthErrors.SenhaFraca =>
                BadRequest("A senha precisa ter ao menos 8 caracteres, letra maiúscula, número e símbolo."),

            _ => Problem(
                title: "Erro inesperado no cadastro.",
                statusCode: StatusCodes.Status500InternalServerError)
        };
    }
}
