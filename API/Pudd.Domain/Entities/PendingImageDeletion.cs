namespace Pudd.Domain.Entities;

// Guarda a limpeza pendente mesmo se a API reiniciar ou o Supabase ficar fora do ar.
public class PendingImageDeletion
{
    public Guid ID { get; set; } = Guid.NewGuid();
    public string Bucket { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public DateTimeOffset NextAttemptAt { get; set; } = DateTimeOffset.UtcNow;
    public int Attempts { get; set; }
}
