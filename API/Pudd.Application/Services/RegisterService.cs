using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;
using Pudd.Domain.Enums.Roles;

namespace Pudd.Application.Services
{
    public class RegisterService(
        IUserRepository _userRepository,
        IPasswordHasher _passwordHasher
    )
    {
        public async Task<LoginResponse?> CadastrarUsuario(RegisterRequest request)
        {
            var resultado = await _userRepository.ObterPorEmail(request.Email);

            if(resultado is not null)
            {
                return null;
            }

            var senhaValida = 
            request.Senha.Length >= 8 &&
            request.Senha.Any(char.IsUpper) &&
            request.Senha.Any(char.IsDigit) &&
            request.Senha.Any(c => !char.IsLetterOrDigit(c));

            if (!senhaValida)
            {
                return null;
            }
         
  
            var senha = _passwordHasher.GerarHash(request.Senha);

            User user = new User
            {
                Name = request.Nome,
                Email = request.Email,
                PasswordHash = senha,
                Role = UserRole.User
            };

            var novoUsuario = await _userRepository.AdicionarUsuario(user);

            return new LoginResponse
            {
                Role = novoUsuario.Role.ToString(),
                AccessToken = string.Empty,
                ExpiresIn = 0
            };
        }
    }
}