using Pudd.Application.Contracts;
using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces;

public interface IJwtService
{
    LoginResponse GerarToken(User user);
}
