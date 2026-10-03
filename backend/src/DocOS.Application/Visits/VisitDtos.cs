using DocOS.Application.Advice;
using DocOS.Application.Labs;
using DocOS.Application.Payments;
using DocOS.Domain.Enums;

namespace DocOS.Application.Visits;

public record AddToQueueRequest(
    Guid PatientId,
    string? DoctorId = null
);

public record RecordVitalsRequest(
    Guid VisitId,
    int? SystolicBp,
    int? DiastolicBp,
    int? PulseBpm,
    decimal? TemperatureF,
    int? Spo2,
    decimal? WeightKg,
    decimal? HeightCm,
    string? Sugar
);

public record VitalsDto(
    int? SystolicBp = null,
    int? DiastolicBp = null,
    int? PulseBpm = null,
    decimal? TemperatureF = null,
    int? Spo2 = null,
    decimal? WeightKg = null,
    decimal? HeightCm = null,
    decimal? Bmi = null,
    string? Sugar = null,
    List<DocOS.Application.Vitals.VisitVitalItemDto>? RecordedVitals = null,
    bool HasAbnormal = false
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

public record PrescriptionLabOrderRequest(
    Guid LabTestMasterId,
    string? SpecialInstructions = null
);

public record PrescriptionAdviceRequest(
    Guid? AdviceTemplateId,
    string AdviceText,
    int DisplayOrder = 0
);

public record CompleteConsultationRequest(
    Guid VisitId,
    string? DoctorId,
    string? ChiefComplaints,
    string? Diagnosis,
    string? ClinicalNotes,
    DateTime? FollowUpDate,
    string? GeneralAdvice,
    List<PrescriptionItemDto> Items,
    List<PrescriptionLabOrderRequest>? LabOrders = null,
    List<PrescriptionAdviceRequest>? AdviceItems = null
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
    string? DoctorId,
    string? DoctorName,
    int TokenNumber,
    VisitStatus Status,
    DateTime VisitDate,
    VitalsDto? Vitals,
    string? ChiefComplaints,
    string? Diagnosis,
    string? ClinicalNotes,
    bool HasPrescription,
    VisitPaymentDto? Payment = null
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
    int LetterheadMarginTopMm,
    int PrintBottomMarginMm,
    bool HideLetterheadOnPrint,
    string? ClinicTimings
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
    string DoctorId,
    string DoctorName,
    DateTime PrescribedAt,
    DateTime? FollowUpDate,
    VitalsDto? Vitals,
    string? ChiefComplaints,
    string? Diagnosis,
    string? ClinicalNotes,
    string? GeneralAdvice,
    List<PrescriptionItemDto> Items,
    ClinicLetterheadDto Clinic,
    List<PrescriptionLabOrderDto> LabOrders,
    List<PrescriptionAdviceDto> AdviceItems,
    string? PdfShareToken = null,
    DateTime? ExpiresAt = null,
    bool IsPrinted = false,
    bool IsCurrent = true,
    Guid? PreviousPrescriptionId = null
);

public record GenerateShareTokenResponse(
    string Token,
    DateTime ExpiresAt,
    string ShareUrl
);
