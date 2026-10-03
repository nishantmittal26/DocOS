using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class SubscriptionPaymentHistory : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public Guid SubscriptionId { get; set; }
    public ClinicSubscription Subscription { get; set; } = null!;

    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = PaymentMethods.UPI;
    public string? TransactionReference { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = PaymentStatuses.Success;
}
