using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Pudd.Application.Contracts
{
    public class RegisterResponse
    {
       public string AccessToken { get; set; } = string.Empty;
       public string Role { get; set; } = string.Empty;
       public int ExpiresIn { get; init; }
    }
}