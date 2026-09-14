using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pudd.Domain.Entities;

namespace Pudd.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> ObterPorEmail(string email);
        Task<User> AdicionarUsuario(User user);
    }
}