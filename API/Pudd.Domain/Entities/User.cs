using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Pudd.Domain.Entities
{
    public class User
    {
        public Guid ID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;   
        public string PasswordHash { get; set;} = string.Empty;
        public string Role { get; set;} = string.Empty;
    }
}