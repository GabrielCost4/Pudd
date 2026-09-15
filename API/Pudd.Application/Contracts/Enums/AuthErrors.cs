using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Pudd.Application.Contracts.Enums
{
    public enum AuthErrors
    {
        SenhaDiferente = 0,
        EmailNaoEncontrado = 1,
        EmailExistente = 2,
        SenhaFraca = 3
    }
}