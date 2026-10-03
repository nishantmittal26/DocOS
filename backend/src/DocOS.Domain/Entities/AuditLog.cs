using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class AuditLog : BaseEntity
{
    public Guid? ClinicId { get; set; } // Null for platform actions
    public Clinic? Clinic { get; set; }

    public string? UserId { get; set; } // AspNetUsers.Id
    public string Action { get; set; } = string.Empty; // "CREATE", "UPDATE", "DELETE", "LOGIN", "PRINT"
    public string EntityName { get; set; } = string.Empty; // "Prescription", "VisitPayment", "Patient", "ApplicationUser", etc.
    public string EntityId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = IndiaTime.Now;
    public string? IpAddress { get; set; }
    public string? ChangesJson { get; set; }
}
