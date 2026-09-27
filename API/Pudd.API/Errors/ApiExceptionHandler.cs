using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pudd.Application.Contracts;

namespace Pudd.API.Errors;

public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken ct
    )
    {
        var (status, message) = exception switch
        {
            AppException e => (
                e.Code switch
                {
                    ErrorCode.InvalidInput => 400,
                    ErrorCode.Unauthenticated => 401,
                    ErrorCode.Forbidden => 403,
                    ErrorCode.NotFound => 404,
                    ErrorCode.Conflict => 409,
                    ErrorCode.StorageUnavailable => 503,
                    _ => 500,
                },
                e.Message
            ),
            BadHttpRequestException e => (
                e.StatusCode,
                "Requisição inválida ou arquivo muito grande."
            ),
            DbUpdateConcurrencyException => (
                409,
                "O registro foi alterado ou removido. Atualize a página."
            ),
            DbUpdateException { InnerException: PostgresException { SqlState: "23505" } } => (
                409,
                "Este registro já existe."
            ),
            DbUpdateException { InnerException: PostgresException { SqlState: "23503" } } => (
                409,
                "Um registro relacionado foi removido. Atualize a página."
            ),
            PostgresException { SqlState: "23503" } => (
                409,
                "A postagem foi removida. Atualize a página."
            ),
            DbUpdateException { InnerException: PostgresException { SqlState: "23001" } } => (
                409,
                "O registro possui dependências e não pode ser excluído."
            ),
            _ => (500, "Não foi possível concluir a operação."),
        };
        if (status >= 500)
            logger.LogError(
                "Falha {ExceptionType}, referência {TraceId}.",
                exception.GetType().Name,
                context.TraceIdentifier
            );
        // Não devolve exceções, SQL, chaves ou respostas internas do Supabase ao cliente.
        await Results
            .Problem(
                statusCode: status,
                title: message,
                extensions: new Dictionary<string, object?>
                {
                    ["traceId"] = context.TraceIdentifier,
                }
            )
            .ExecuteAsync(context);
        return true;
    }
}
