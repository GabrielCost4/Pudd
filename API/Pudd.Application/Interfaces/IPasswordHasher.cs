using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Pudd.Application.Interfaces
{
    public interface IPasswordHasher
    {
        string GerarHash(string senha);
        bool VerificarSenha(string senha, string hash);
    }
}