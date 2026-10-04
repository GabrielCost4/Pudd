using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Contracts;
using Pudd.Application.Contracts.Enums;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;
using Pudd.Domain.Enums.Roles;
using FluentValidation;
using Pudd.Application.Validation;

namespace Pudd.Application.Services
{
    public class RegisterService(
        IUserRepository _userRepository,
        IPasswordHasher _passwordHasher,
        IJwtService _jwtService,
        IValidator<RegisterRequest> validator
    )
    {
        public async Task<LoginResult> CadastrarUsuario(RegisterRequest request)
        {
            await RequestValidation.ValidateAsync(validator, request);
            var resultado = await _userRepository.ObterPorEmail(request.Email);

            if (resultado is not null)
            {
                return new LoginResult
                {
                    Error = AuthErrors.EmailExistente
                };
            }


            var senha = _passwordHasher.GerarHash(request.Senha);

            User user = new User
            {
                Name = request.Nome,
                Email = request.Email,
                PasswordHash = senha,
                Role = UserRole.User
            };

            await _userRepository.AdicionarUsuario(user);

            return new LoginResult
            {
                Response = _jwtService.GerarToken(user)
            };
        }
    }
}
