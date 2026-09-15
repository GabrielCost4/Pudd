using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Application.Contracts.Enums;

namespace Pudd.Application.Contracts
{
    public class LoginResult
    {
        public LoginResponse? Response { get; init; }
        public AuthErrors? Error { get; init; }
    }
}