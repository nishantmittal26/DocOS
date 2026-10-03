namespace DocOS.Application.Common.Interfaces;

public interface ICurrentUserService
{
    string? UserId { get; }
    Guid? ClinicId { get; }
    string? Role { get; } // Primary/first role for backward compatibility
    IReadOnlyList<string> Roles { get; }
    bool IsInRole(string role);
    bool IsAuthenticated { get; }
}
