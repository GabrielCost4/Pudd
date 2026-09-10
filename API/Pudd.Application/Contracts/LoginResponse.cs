namespace Pudd.Application.Contracts;

public class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int ExpiresIn { get; init; }
}
