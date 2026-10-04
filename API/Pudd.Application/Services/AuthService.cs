using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Contracts;
using Pudd.Application.Contracts.Enums;
using Pudd.Application.Interfaces;
using FluentValidation;
using Pudd.Application.Validation;

namespace Pudd.Application.Services
{
    public class AuthService(
        IUserRepository _userRepository,
        IPasswordHasher _passwordHasher,
        IJwtService _jwtService,
        IValidator<LoginRequest> validator
    )
    {
        public async Task<LoginResult> AutenticarUsuario(LoginRequest request)
        {
            await RequestValidation.ValidateAsync(validator, request);
            var resultado = await _userRepository.ObterPorEmail(request.Email);

            if (resultado == null)
            {
                return new LoginResult
                {
                    Error = AuthErrors.EmailNaoEncontrado
                };
            }

            if (!_passwordHasher.VerificarSenha(request.Senha, resultado.PasswordHash))
            {
                return new LoginResult
                {
                    Error = AuthErrors.SenhaDiferente
                };
            }

            if (resultado.IsBlocked)
                return new LoginResult { Error = AuthErrors.ContaBloqueada };

            return new LoginResult
            {
                Response = _jwtService.GerarToken(resultado)
            };
        }
    }
}
