using System.Security.Claims;
using DocOS.Application.Common.Interfaces;

namespace DocOS.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public string? UserId => User?.FindFirstValue(ClaimTypes.NameIdentifier);

    public Guid? ClinicId
    {
        get
        {
            var clinicClaim = User?.FindFirstValue("ClinicId");
            if (Guid.TryParse(clinicClaim, out var clinicId))
            {
                return clinicId;
            }
            return null;
        }
    }

    public string? Role => Roles.FirstOrDefault();

    public IReadOnlyList<string> Roles => User?.FindAll(ClaimTypes.Role)
        .Select(c => c.Value)
        .Distinct()
        .ToList() ?? new List<string>();

    public bool IsInRole(string role) => User?.IsInRole(role) ?? false;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
}
