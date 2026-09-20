using DocOS.Application.Auth;

namespace DocOS.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<(bool Success, string? Error, string UserId)> CreateUserAsync(string email, string password, string fullName, Guid clinicId, string role);
    Task<(bool Success, string? Error, string UserId, string FullName, Guid ClinicId, string Role)> ValidateCredentialsAsync(string email, string password);
}
