using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class ClinicSubscription : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public Guid PlanId { get; set; }
    public SubscriptionPlanMaster Plan { get; set; } = null!;

    public bool IsUnlimitedVisits { get; set; } = false;
    public int? MonthlyVisitQuota { get; set; }
    public int AdditionalTopUpVisits { get; set; } = 0;
    public int? MaxDoctorsOverride { get; set; }
    public string Status { get; set; } = SubscriptionStatuses.Active;
    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }
    public int GracePeriodDays { get; set; } = 5;
    public string? Notes { get; set; }

    public ICollection<ClinicPeriodUsage> PeriodUsages { get; set; } = new List<ClinicPeriodUsage>();
    public ICollection<SubscriptionPaymentHistory> PaymentHistories { get; set; } = new List<SubscriptionPaymentHistory>();

    // Helper calculations
    public bool HasUnlimitedVisits => IsUnlimitedVisits || (Plan != null && Plan.IsUnlimitedVisits);
    public int? TotalAllowedVisits => HasUnlimitedVisits ? null : ((MonthlyVisitQuota ?? Plan?.DefaultMonthlyVisits ?? 0) + AdditionalTopUpVisits);
    public int EffectiveMaxDoctors => MaxDoctorsOverride ?? Plan?.MaxDoctors ?? 1;
}
