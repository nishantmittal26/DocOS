using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class ClinicSubscription : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public Guid CatalogPlanId { get; set; }
    public SubscriptionPlanMaster CatalogPlan { get; set; } = null!;

    // B13 Contract Snapshot (frozen at assignment time; catalog edits do not affect existing subscribers)
    public string SubscribedPlanName { get; set; } = string.Empty;
    public string SubscribedTier { get; set; } = SubscriptionTiers.Starter;
    public string SubscribedBillingCycle { get; set; } = BillingCycles.Monthly;
    public decimal SubscribedPriceINR { get; set; }
    public bool SubscribedIsUnlimitedVisits { get; set; } = false;
    public int? SubscribedDefaultMonthlyVisits { get; set; }
    public int SubscribedMaxDoctors { get; set; } = 1;
    public int SubscribedMaxStaff { get; set; } = 2;
    public bool SubscribedHasCustomVitals { get; set; } = false;
    public bool SubscribedHasLabModule { get; set; } = false;
    public DateTime PlanAssignedAt { get; set; }

    public bool IsUnlimitedVisits { get; set; } = false;
    public int? MonthlyVisitQuota { get; set; }
    public int AdditionalTopUpVisits { get; set; } = 0;
    public int? MaxDoctorsOverride { get; set; }
    /// <summary>When set, overrides <see cref="SubscribedHasLabModule"/> for this clinic only.</summary>
    public bool? LabModuleOverride { get; set; }
    /// <summary>When set, overrides <see cref="SubscribedPriceINR"/> for this clinic.</summary>
    public decimal? PriceOverrideINR { get; set; }
    /// <summary>Instant discount amount in INR applied against catalog price at onboarding.</summary>
    public decimal? DiscountAmountINR { get; set; }
    public string Status { get; set; } = SubscriptionStatuses.Active;
    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }
    public int GracePeriodDays { get; set; } = 5;
    public string? Notes { get; set; }

    public ICollection<ClinicPeriodUsage> PeriodUsages { get; set; } = new List<ClinicPeriodUsage>();
    public ICollection<SubscriptionPaymentHistory> PaymentHistories { get; set; } = new List<SubscriptionPaymentHistory>();

    // B13 Helper calculations: resolved strictly from contract snapshot + per-clinic overrides (never reads catalog Plan at runtime)
    public bool HasUnlimitedVisits => IsUnlimitedVisits || SubscribedIsUnlimitedVisits;
    public int? TotalAllowedVisits => HasUnlimitedVisits ? null : ((MonthlyVisitQuota ?? SubscribedDefaultMonthlyVisits ?? 0) + AdditionalTopUpVisits);
    public int EffectiveMaxDoctors => MaxDoctorsOverride ?? SubscribedMaxDoctors;
    public bool EffectiveHasLabModule => LabModuleOverride ?? SubscribedHasLabModule;
    public decimal EffectivePriceINR => PriceOverrideINR ?? SubscribedPriceINR;

    /// <summary>
    /// Copies master catalog plan fields into the contract snapshot on this subscription.
    /// </summary>
    public void ApplyCatalogPlan(SubscriptionPlanMaster plan, DateTime assignedAt)
    {
        CatalogPlanId = plan.Id;
        CatalogPlan = plan;
        SubscribedPlanName = plan.PlanName;
        SubscribedTier = plan.Tier;
        SubscribedBillingCycle = plan.BillingCycle;
        SubscribedPriceINR = plan.PriceINR;
        SubscribedIsUnlimitedVisits = plan.IsUnlimitedVisits;
        SubscribedDefaultMonthlyVisits = plan.DefaultMonthlyVisits;
        SubscribedMaxDoctors = plan.MaxDoctors;
        SubscribedMaxStaff = plan.MaxStaff;
        SubscribedHasCustomVitals = plan.HasCustomVitals;
        SubscribedHasLabModule = plan.HasLabModule;
        PlanAssignedAt = assignedAt;
    }
}
