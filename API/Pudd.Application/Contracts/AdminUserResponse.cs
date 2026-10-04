namespace Pudd.Application.Contracts;

public record AdminUserResponse(Guid ID, string Name, string Email, string Role, bool IsBlocked);
