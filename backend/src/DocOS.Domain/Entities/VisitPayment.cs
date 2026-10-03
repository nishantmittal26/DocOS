using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class VisitPayment : BaseEntity
{
    public Guid VisitId { get; set; }
    public Visit Visit { get; set; } = null!;

    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public decimal Amount { get; set; }
    public string Method { get; set; } = "Cash"; // "Cash", "UPI"
    public string? Reference { get; set; } // UPI reference when used
    public string CollectedByUserId { get; set; } = string.Empty; // AspNetUsers.Id (Staff/Doctor)
    public DateTime CollectedAt { get; set; } = IndiaTime.Now;
}
