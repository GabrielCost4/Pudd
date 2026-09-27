namespace Pudd.Application.Contracts;

public enum ErrorCode
{
    InvalidInput,
    NotFound,
    Forbidden,
    Unauthenticated,
    Conflict,
    StorageUnavailable,
}

// O service descreve a falha; a API decide qual status HTTP representa essa falha.
public sealed class AppException(ErrorCode code, string message) : Exception(message)
{
    public ErrorCode Code { get; } = code;
}
