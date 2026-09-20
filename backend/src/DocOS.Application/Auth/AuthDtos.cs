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
    string? Address
);

public record RegisterStaffRequest(
    string FullName,
    string Email,
    string Phone,
    string Password,
    string Role // "Receptionist"
);

public record LoginRequest(
    string Email,
    string Password
);

public record AuthResponse(
    string Token,
    string UserId,
    string Email,
    string FullName,
    string Role,
    Guid ClinicId,
    string ClinicName,
    string DoctorName,
    string? RegNumber,
    string? Qualifications,
    int LetterheadMarginTopMm
);
