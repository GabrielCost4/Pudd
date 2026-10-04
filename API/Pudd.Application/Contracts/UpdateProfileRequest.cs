namespace Pudd.Application.Contracts;

public class UpdateProfileRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Bio { get; set; }
}
