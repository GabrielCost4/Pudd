using Pudd.Application.Contracts;

namespace Pudd.Application.Interfaces;

public interface IUserPresenceReader
{
    PresenceResponse Get(Guid userId);
}
