using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.Application.Services
{
    public class AuthService(
        IUserRepository _userRepository,
        IPasswordHasher _passwordHasher
    )
    {
        public async Task<LoginResponse?> AutenticarUsuario (LoginRequest request)
        {
            var resultado = await _userRepository.ObterPorEmail(request.Email);

            if(resultado == null)
            {
                return null;
            }

            if (!_passwordHasher.VerificarSenha(request.Senha, resultado.PasswordHash))
            {
                return null;
            } 

            return new LoginResponse
            {
                Role = resultado.Role.ToString(),
                AccessToken = string.Empty,
                ExpiresIn = 0
            };
        }
    }
}
