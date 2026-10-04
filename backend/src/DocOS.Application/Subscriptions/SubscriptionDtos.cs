namespace DocOS.Application.Subscriptions;

public record SubscriptionPlanDto(
    Guid Id,
    string PlanCode,
    string PlanName,
    string Tier,
    bool IsUnlimitedVisits,
    int? DefaultMonthlyVisits,
    int MaxDoctors,
    int MaxStaff,
    decimal PriceINR,
    string BillingCycle,
    bool HasCustomVitals,
    bool HasLabModule,
    bool IsActive
);

public record OnboardClinicRequest(
    // Step 1: Clinic & Primary Doctor
    string ClinicName,
    string Phone,
    string? Email,
    string? Address,
    string DoctorName,
    string? RegNumber,
    string? Qualifications,
    string? Specialization,
    decimal? ConsultationFee,
    string? ClinicTimings,
    string? DoctorPassword,

    // Step 2: Plan & Quota
    Guid PlanId,
    bool IsTrial,
    int? MonthlyVisitQuotaOverride,
    bool IsUnlimitedOverride,

    // Step 3: Letterhead & Margins
    int LetterheadMarginTopMm,
    int PrintBottomMarginMm,
    bool HideLetterheadOnPrint,

    // Step 4: Sales Attribution & Notes
    string? SalesNotes,

    /// <summary>Optional; default = first 4 letters of clinic name (see PatientIdPrefixRules).</summary>
    string? PatientIdPrefix = null
);

public record OnboardClinicResponse(
    Guid ClinicId,
    string ClinicName,
    string DoctorUserId,
    string DoctorName,
    string DoctorEmail,
    string InitialPassword,
    string LoginUrl,
    string SubscriptionStatus,
    string PlanName,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    int? MonthlyVisitQuota,
    bool IsUnlimited,
    string PatientIdPrefix
);

public record AdminClinicItemDto(
    Guid ClinicId,
    string ClinicName,
    string Phone,
    string? Email,
    string? PrimaryDoctorName,
    int DoctorCount,
    string? OnboardedByUserId,
    string? OnboardedByName,
    string? SalesNotes,
    DateTime CreatedAt,
    Guid? SubscriptionId,
    string? PlanName,
    string? PlanTier,
    string Status,
    DateTime CurrentPeriodStart,
    DateTime CurrentPeriodEnd,
    int VisitsConducted,
    int? TotalAllowedVisits,
    bool IsUnlimited,
    int GracePeriodDays
)
{
    public int UsedPrescriptions => VisitsConducted;
    public int? TotalAllowedPrescriptions => TotalAllowedVisits;
    public int? RemainingPrescriptions => IsUnlimited || !TotalAllowedVisits.HasValue ? null : Math.Max(0, TotalAllowedVisits.Value - VisitsConducted);
}

public record SubscriptionPaymentDto(
    Guid Id,
    string InvoiceNumber,
    decimal Amount,
    string PaymentMethod,
    string? TransactionReference,
    DateTime PaymentDate,
    string Status
);

public record ClinicSubscriptionDetailDto(
    Guid SubscriptionId,
    Guid ClinicId,
    string ClinicName,
    Guid PlanId,
    string PlanName,
    string PlanTier,
    string BillingCycle,
    decimal PriceINR,
    string Status,
    DateTime CurrentPeriodStart,
    DateTime CurrentPeriodEnd,
    int GracePeriodDays,
    bool IsUnlimitedVisits,
    int? MonthlyVisitQuota,
    int AdditionalTopUpVisits,
    int? TotalAllowedVisits,
    int? MaxDoctorsOverride,
    int EffectiveMaxDoctors,
    int VisitsConducted,
    int? RemainingVisits,
    DateTime? LastVisitRecordedAt,
    string? Notes,
    bool? LabModuleOverride,
    bool PlanHasLabModule,
    bool EffectiveHasLabModule,
    List<SubscriptionPaymentDto> PaymentHistory
)
{
    public int UsedPrescriptions => VisitsConducted;
    public int? RemainingPrescriptions => RemainingVisits;
    public int? TotalAllowedPrescriptions => TotalAllowedVisits;
}

public record UpdateClinicSubscriptionRequest(
    bool IsUnlimitedVisits,
    int? MonthlyVisitQuota,
    int? MaxDoctorsOverride,
    string Status,
    int GracePeriodDays,
    string? Notes,
    bool? LabModuleOverride
);

public record AddTopUpVisitsRequest(
    int AdditionalVisits // e.g. 250, 500, 1000
);

public record RecordSubscriptionPaymentRequest(
    string InvoiceNumber,
    decimal Amount,
    string PaymentMethod,
    string? TransactionReference,
    DateTime PaymentDate,
    string Status
);

public record ClinicQuotaStatusDto(
    Guid ClinicId,
    string Status,
    string PlanName,
    string PlanTier,
    bool IsUnlimited,
    int VisitsConducted,
    int? MonthlyQuota,
    int AdditionalTopUpVisits,
    int? TotalAllowed,
    int? RemainingVisits,
    bool IsWithinBuffer,
    int RemainingBufferVisits,
    bool IsQuotaExceeded,
    bool IsGracePeriod,
    bool IsSuspended,
    DateTime PeriodEnd,
    bool CanIssueTokens,
    bool HasLabModule,
    bool HasCustomVitals,
    int EffectiveMaxDoctors
)
{
    public int UsedPrescriptions => VisitsConducted;
    public int? RemainingPrescriptions => RemainingVisits;
    public int? TotalAllowedPrescriptions => TotalAllowed;
}
