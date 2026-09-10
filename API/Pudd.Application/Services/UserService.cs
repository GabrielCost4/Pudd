using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Contracts;

namespace Pudd.Application.Services
{
    public class UserService(
    )
    {
        public async Task<LoginResponse?> ObterPorEmail(string email)
        {
            var emailExistente = await _userRepository.ObterEmailUsuario(email)

        }
    }
}