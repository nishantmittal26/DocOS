using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class SubscriptionPlanMaster : BaseEntity
{
    public string PlanCode { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string Tier { get; set; } = SubscriptionTiers.Starter;
    public bool IsUnlimitedVisits { get; set; } = false;
    public int? DefaultMonthlyVisits { get; set; }
    public int MaxDoctors { get; set; } = 1;
    public int MaxStaff { get; set; } = 2;
    public decimal PriceINR { get; set; }
    public string BillingCycle { get; set; } = BillingCycles.Monthly;
    public bool HasCustomVitals { get; set; } = false;
    public bool HasLabModule { get; set; } = false;
    public bool IsActive { get; set; } = true;

    public ICollection<ClinicSubscription> Subscriptions { get; set; } = new List<ClinicSubscription>();
}
