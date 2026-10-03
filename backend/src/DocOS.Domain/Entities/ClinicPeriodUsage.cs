using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class ClinicPeriodUsage : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public Guid SubscriptionId { get; set; }
    public ClinicSubscription Subscription { get; set; } = null!;

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public int VisitsConducted { get; set; } = 0;
    public DateTime? LastVisitRecordedAt { get; set; }
}
