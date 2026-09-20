using DocOS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace DocOS.Infrastructure.Identity;

public class IdentityService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public IdentityService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<(bool Success, string? Error, string UserId)> CreateUserAsync(
        string email, string password, string fullName, Guid clinicId, string role)
    {
        var existing = await _userManager.FindByEmailAsync(email);
        if (existing != null)
        {
            return (false, "An account with this email address already exists.", string.Empty);
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = fullName,
            ClinicId = clinicId,
            Role = role
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return (false, errors, string.Empty);
        }

        return (true, null, user.Id);
    }

    public async Task<(bool Success, string? Error, string UserId, string FullName, Guid ClinicId, string Role)>
        ValidateCredentialsAsync(string email, string password)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            return (false, "Invalid email or password", string.Empty, string.Empty, Guid.Empty, string.Empty);
        }

        var isValid = await _userManager.CheckPasswordAsync(user, password);
        if (!isValid)
        {
            return (false, "Invalid email or password", string.Empty, string.Empty, Guid.Empty, string.Empty);
        }

        return (true, null, user.Id, user.FullName, user.ClinicId, user.Role);
    }

    public async Task<(bool Success, string? Error)> ChangePasswordAsync(
        string userId, string currentPassword, string newPassword)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return (false, "User account not found");
        }

        var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return (false, errors);
        }

        return (true, null);
    }
}
