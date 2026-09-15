using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure.Security;

public class JwtService(IConfiguration configuration) : IJwtService
{
    public LoginResponse GerarToken(User user)
    {
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("A chave JWT não foi configurada.");
        var issuer = configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("O emissor JWT não foi configurado.");
        var audience = configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("O público JWT não foi configurado.");

        if (!int.TryParse(configuration["Jwt:ExpirationMinutes"], out var expiresIn) || expiresIn <= 0)
        {
            throw new InvalidOperationException("O tempo de expiração do JWT é inválido.");
        }

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.ID.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var expiresAt = DateTime.UtcNow.AddMinutes(expiresIn);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256));

        return new LoginResponse
        {
            AccessToken = new JwtSecurityTokenHandler().WriteToken(token),
            Role = user.Role.ToString(),
            ExpiresIn = expiresIn
        };
    }
}
