using DocOS.Application.Auth;

namespace DocOS.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<(bool Success, string? Error, string UserId)> CreateUserAsync(
        string email,
        string password,
        string fullName,
        Guid? clinicId,
        IEnumerable<string> roles,
        string? qualifications = null,
        string? medicalCouncilRegistrationNumber = null,
        string? speciality = null,
        decimal? consultationFee = null);

    Task<(bool Success, string? Error, string UserId, string FullName, Guid? ClinicId, List<string> Roles)> ValidateCredentialsAsync(
        string email,
        string password);

    Task<(bool Success, string? Error)> ChangePasswordAsync(
        string userId,
        string currentPassword,
        string newPassword);

    Task<List<StaffMemberDto>> GetClinicStaffAsync(Guid clinicId);

    Task<(bool Success, string? Error)> SetUserActiveStatusAsync(string userId, Guid clinicId, bool isActive);

    Task<DoctorProfileDto?> GetDoctorProfileAsync(string userId);

    Task<(bool Success, string? Error)> UpdateDoctorProfileAsync(
        string userId,
        string fullName,
        string? qualifications,
        string? medicalCouncilRegistrationNumber,
        string? speciality,
        decimal? consultationFee);

    Task<List<DoctorProfileDto>> GetClinicDoctorsAsync(Guid clinicId);

    Task<Dictionary<string, string>> GetDoctorNamesAsync(IEnumerable<string> userIds);
}
