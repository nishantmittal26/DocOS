using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DocOS.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace DocOS.Infrastructure.Identity;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(string userId, string email, string fullName, Guid? clinicId, IEnumerable<string> roles)
    {
        var secretKey = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException("JWT Secret is not configured in application settings. Hardened auth prevents running without secret.");
        }

        var issuer = _configuration["Jwt:Issuer"] ?? "DocOS.API";
        var audience = _configuration["Jwt:Audience"] ?? "DocOS.Client";
        
        // Staff session token lifetime: default to 12 hours (configurable via Jwt:ExpiryHours)
        var expiryHours = int.TryParse(_configuration["Jwt:ExpiryHours"], out var hours) && hours > 0 ? hours : 12;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Name, fullName)
        };

        if (clinicId.HasValue)
        {
            claims.Add(new Claim("ClinicId", clinicId.Value.ToString()));
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
