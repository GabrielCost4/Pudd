using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Pudd.Application.Services;

namespace Pudd.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class UserController(
        UserService _userService
    ) : ControllerBase
    {

        [HttpPost("entrar")]
        public async Task<IActionResult> Entrar([FromBody]LoginRequest request)
        {
            var resultado = await _userService.ObterPorEmail(request.Email);

            if(resultado == null)
            {
                return Unauthorized();
            }

            return Ok(resultado);
        }
    }
}