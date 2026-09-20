namespace DocOS.Application.Clinics;

public record UpdateClinicLetterheadRequest(
    string ClinicName,
    string DoctorName,
    string? RegNumber,
    string? Qualifications,
    string? Specialization,
    string Phone,
    string? Email,
    string? Address,
    string? LogoUrl,
    int LetterheadMarginTopMm
);

public record ClinicProfileDto(
    Guid Id,
    string Name,
    string DoctorName,
    string? RegNumber,
    string? Qualifications,
    string? Specialization,
    string Phone,
    string? Email,
    string? Address,
    string? LogoUrl,
    int LetterheadMarginTopMm,
    string PatientIdPrefix,
    int TotalPatientsRegistered
);
