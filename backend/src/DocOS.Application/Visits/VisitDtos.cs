using DocOS.Domain.Enums;

namespace DocOS.Application.Visits;

public record AddToQueueRequest(
    Guid PatientId
);

public record RecordVitalsRequest(
    Guid VisitId,
    int? SystolicBp,
    int? DiastolicBp,
    int? PulseBpm,
    decimal? TemperatureF,
    int? Spo2,
    decimal? WeightKg,
    decimal? HeightCm
);

public record VitalsDto(
    int? SystolicBp,
    int? DiastolicBp,
    int? PulseBpm,
    decimal? TemperatureF,
    int? Spo2,
    decimal? WeightKg,
    decimal? HeightCm,
    decimal? Bmi
);

public record PrescriptionItemDto(
    string MedicineName,
    string SaltComposition,
    DosageForm Form,
    string Dosage,
    DosageTiming Timing,
    int DurationDays,
    string? Instructions
);

public record CompleteConsultationRequest(
    Guid VisitId,
    string? ChiefComplaints,
    string? Diagnosis,
    string? ClinicalNotes,
    DateTime? FollowUpDate,
    string? GeneralAdvice,
    List<PrescriptionItemDto> Items
);

public record VisitQueueDto(
    Guid Id,
    Guid PatientId,
    string PatientUid,
    string PatientName,
    int Age,
    Gender Gender,
    string MobileNumber,
    string? Allergies,
    string? MedicalHistory,
    int TokenNumber,
    VisitStatus Status,
    DateTime VisitDate,
    VitalsDto? Vitals,
    string? ChiefComplaints,
    string? Diagnosis,
    string? ClinicalNotes,
    bool HasPrescription
);

public record ClinicLetterheadDto(
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

public record PrescriptionDetailDto(
    Guid Id,
    Guid VisitId,
    Guid PatientId,
    string PatientUid,
    string PatientName,
    int Age,
    Gender Gender,
    string MobileNumber,
    string? BloodGroup,
    string? Allergies,
    DateTime PrescribedAt,
    DateTime? FollowUpDate,
    VitalsDto? Vitals,
    string? ChiefComplaints,
    string? Diagnosis,
    string? ClinicalNotes,
    string? GeneralAdvice,
    List<PrescriptionItemDto> Items,
    ClinicLetterheadDto Clinic
);
