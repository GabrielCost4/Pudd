using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Contracts;
using Pudd.Application.Contracts.Enums;
using Pudd.Application.Interfaces;

namespace Pudd.Application.Services
{
    public class AuthService(
        IUserRepository _userRepository,
        IPasswordHasher _passwordHasher,
        IJwtService _jwtService
    )
    {
        public async Task<LoginResult> AutenticarUsuario (LoginRequest request)
        {
            var resultado = await _userRepository.ObterPorEmail(request.Email);

            if(resultado == null)
            {
                return new LoginResult
                {
                   Error = AuthErrors.EmailNaoEncontrado 
                } ;
            }

            if (!_passwordHasher.VerificarSenha(request.Senha, resultado.PasswordHash))
            {
                return new LoginResult
                {
                    Error = AuthErrors.SenhaDiferente
                };
            } 

            return new LoginResult 
            {
                Response = _jwtService.GerarToken(resultado)
            };
        }
    }
}
