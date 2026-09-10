using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Services;
using Pudd.Application.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Pudd.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(
        AuthService _authService,
        RegisterService _registerService
    ) : ControllerBase

    {
       [HttpPost("login")]
       public async Task<IActionResult> Login([FromBody]LoginRequest request)
        {
            var resultado = await _authService.AutenticarUsuario(request);

            if(resultado == null)
            {
                return Unauthorized("Email ou senha inválidos!");
            }

            return Ok(resultado);
        }

       [HttpPost("register")]
       public async Task<IActionResult> Cadastrar([FromBody]RegisterRequest request)
        {
            var resultado = await _registerService.CadastrarUsuario(request);

            if(resultado == null)
            {
                return BadRequest("Dados inválidos!");
            } 

            return Ok(resultado);
        }
    }
}
