using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using API.Features.Auth;
using API.Features.Auth.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace API.Pudd.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(
        AuthService authService
    ) : ControllerBase

    {
       [HttpPost("login")]
       public async Task<IActionResult> Login([FromBody]LoginRequest request)
        {
            var resultado = await authService.AutenticarUsuario(request);

            if(resultado == null)
            {
                return Unauthorized("Email ou senha inválidos!");
            }

            return Ok(resultado);
        }
    }
}