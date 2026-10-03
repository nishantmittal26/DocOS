namespace DocOS.Application.Auth;

public record RegisterClinicRequest(
    string ClinicName,
    string DoctorName,
    string? RegNumber,
    string? Qualifications,
    string? Specialization,
    string Phone,
    string Email,
    string Password,
    string? Address,
    string? ClinicTimings = null,
    decimal? ConsultationFee = null
);

public record InviteStaffRequest(
    string FullName,
    string Email,
    string Password,
    string Role, // "Doctor", "Nurse", "Receptionist"
    string? Phone = null,
    string? Qualifications = null,
    string? RegNumber = null,
    string? Specialization = null,
    decimal? ConsultationFee = null
);

public record ToggleStaffActiveRequest(
    string UserId,
    bool IsActive
);

public record UpdateDoctorProfileRequest(
    string FullName,
    string? Qualifications,
    string? MedicalCouncilRegistrationNumber,
    string? Speciality,
    decimal? ConsultationFee
);

public record DoctorProfileDto(
    string UserId,
    string FullName,
    string? Qualifications,
    string? MedicalCouncilRegistrationNumber,
    string? Speciality,
    decimal? ConsultationFee
);

public record StaffMemberDto(
    string Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    List<string> Roles,
    bool IsActive,
    DateTime CreatedAt,
    string? Qualifications,
    string? MedicalCouncilRegistrationNumber,
    string? Speciality,
    decimal? ConsultationFee
);

public record LoginRequest(
    string Email,
    string Password
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);

public record AuthResponse(
    string Token,
    string UserId,
    string Email,
    string FullName,
    List<string> Roles,
    Guid? ClinicId,
    string? ClinicName,
    string? DoctorName,
    string? RegNumber,
    string? Qualifications,
    string? Speciality,
    int LetterheadMarginTopMm,
    int PrintBottomMarginMm,
    bool HideLetterheadOnPrint,
    string? ClinicTimings
);
