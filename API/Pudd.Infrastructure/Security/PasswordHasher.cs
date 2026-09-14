using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Interfaces;

namespace Pudd.Infrastructure.Security
{
    public class PasswordHasher : IPasswordHasher
    {
        public string GerarHash(string senha)
      {
          return BCrypt.Net.BCrypt.HashPassword(senha);
      }

      public bool VerificarSenha(string senha, string hash)
      {
          return BCrypt.Net.BCrypt.Verify(senha, hash);
      }
    }
}
