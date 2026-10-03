using DocOS.Application.Auth;
using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Common;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Infrastructure.Identity;

public class IdentityService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public IdentityService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task<(bool Success, string? Error, string UserId)> CreateUserAsync(
        string email,
        string password,
        string fullName,
        Guid? clinicId,
        IEnumerable<string> roles,
        string? qualifications = null,
        string? medicalCouncilRegistrationNumber = null,
        string? speciality = null,
        decimal? consultationFee = null)
    {
        var roleList = roles.Distinct().ToList();

        // Enforce Phase 2A tenant rule: clinic staff cannot be saved without ClinicId
        if (!clinicId.HasValue && roleList.Any(Roles.RequiresClinic))
        {
            return (false, "Clinic staff cannot be created without a ClinicId.", string.Empty);
        }

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
            Qualifications = qualifications,
            MedicalCouncilRegistrationNumber = medicalCouncilRegistrationNumber,
            Speciality = speciality,
            ConsultationFee = consultationFee,
            IsActive = true,
            CreatedAt = IndiaTime.Now
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return (false, errors, string.Empty);
        }

        // Ensure roles exist and assign to user
        foreach (var role in roleList)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        if (roleList.Count > 0)
        {
            var roleResult = await _userManager.AddToRolesAsync(user, roleList);
            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                return (false, errors, user.Id);
            }
        }

        return (true, null, user.Id);
    }

    public async Task<(bool Success, string? Error, string UserId, string FullName, Guid? ClinicId, List<string> Roles)>
        ValidateCredentialsAsync(string email, string password)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            return (false, "Invalid email or password", string.Empty, string.Empty, null, new List<string>());
        }

        // Check active status - Phase 2A: Deactivated staff cannot sign in
        if (!user.IsActive)
        {
            return (false, "Your account has been deactivated. Please contact your clinic administrator.", string.Empty, string.Empty, null, new List<string>());
        }

        var isValid = await _userManager.CheckPasswordAsync(user, password);
        if (!isValid)
        {
            return (false, "Invalid email or password", string.Empty, string.Empty, null, new List<string>());
        }

        var roles = (await _userManager.GetRolesAsync(user)).ToList();

        return (true, null, user.Id, user.FullName, user.ClinicId, roles);
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

    public async Task<List<StaffMemberDto>> GetClinicStaffAsync(Guid clinicId)
    {
        var users = await _userManager.Users
            .Where(u => u.ClinicId == clinicId)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var result = new List<StaffMemberDto>();
        foreach (var user in users)
        {
            var roles = (await _userManager.GetRolesAsync(user)).ToList();
            result.Add(new StaffMemberDto(
                user.Id,
                user.FullName,
                user.Email ?? string.Empty,
                user.PhoneNumber,
                roles,
                user.IsActive,
                user.CreatedAt,
                user.Qualifications,
                user.MedicalCouncilRegistrationNumber,
                user.Speciality,
                user.ConsultationFee
            ));
        }

        return result;
    }

    public async Task<(bool Success, string? Error)> SetUserActiveStatusAsync(string userId, Guid clinicId, bool isActive)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || user.ClinicId != clinicId)
        {
            return (false, "Staff member not found in your clinic");
        }

        user.IsActive = isActive;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return (false, string.Join(", ", result.Errors.Select(e => e.Description)));
        }

        return (true, null);
    }

    public async Task<DoctorProfileDto?> GetDoctorProfileAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return null;

        return new DoctorProfileDto(
            user.Id,
            user.FullName,
            user.Qualifications,
            user.MedicalCouncilRegistrationNumber,
            user.Speciality,
            user.ConsultationFee
        );
    }

    public async Task<(bool Success, string? Error)> UpdateDoctorProfileAsync(
        string userId,
        string fullName,
        string? qualifications,
        string? medicalCouncilRegistrationNumber,
        string? speciality,
        decimal? consultationFee)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return (false, "User not found");
        }

        user.FullName = fullName;
        user.Qualifications = qualifications;
        user.MedicalCouncilRegistrationNumber = medicalCouncilRegistrationNumber;
        user.Speciality = speciality;
        user.ConsultationFee = consultationFee;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return (false, string.Join(", ", result.Errors.Select(e => e.Description)));
        }

        return (true, null);
    }

    public async Task<List<DoctorProfileDto>> GetClinicDoctorsAsync(Guid clinicId)
    {
        var users = await _userManager.Users
            .Where(u => u.ClinicId == clinicId && u.IsActive)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var doctors = new List<DoctorProfileDto>();
        foreach (var user in users)
        {
            if (await _userManager.IsInRoleAsync(user, Roles.Doctor))
            {
                doctors.Add(new DoctorProfileDto(
                    user.Id,
                    user.FullName,
                    user.Qualifications,
                    user.MedicalCouncilRegistrationNumber,
                    user.Speciality,
                    user.ConsultationFee
                ));
            }
        }

        return doctors;
    }

    public async Task<Dictionary<string, string>> GetDoctorNamesAsync(IEnumerable<string> userIds)
    {
        var idList = userIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (idList.Count == 0) return new Dictionary<string, string>();

        return await _userManager.Users
            .Where(u => idList.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);
    }
}
