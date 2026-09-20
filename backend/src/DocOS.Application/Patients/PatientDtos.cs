using DocOS.Domain.Enums;

namespace DocOS.Application.Patients;

public record CreatePatientRequest(
    string FullName,
    int Age,
    Gender Gender,
    string MobileNumber,
    string? Email,
    string? BloodGroup,
    string? Address,
    string? Allergies,
    string? MedicalHistory
);

public record PatientDto(
    Guid Id,
    Guid ClinicId,
    string PatientUid,
    string FullName,
    int Age,
    Gender Gender,
    string MobileNumber,
    string? Email,
    string? BloodGroup,
    string? Address,
    string? Allergies,
    string? MedicalHistory,
    DateTime CreatedAt
);

public record PatientSearchResultDto(
    Guid Id,
    string PatientUid,
    string FullName,
    int Age,
    Gender Gender,
    string MobileNumber,
    string? Allergies,
    DateTime? LastVisitDate
);
