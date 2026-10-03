using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class Prescription : BaseEntity
{
    public Guid VisitId { get; set; }
    public Visit Visit { get; set; } = null!;

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    // Consulting Doctor (Phase 2A) - nvarchar(450) matching AspNetUsers.Id
    public string DoctorId { get; set; } = string.Empty;

    public DateTime PrescribedAt { get; set; } = DateTime.UtcNow;
    public string? GeneralAdvice { get; set; } // Free-text advice line e.g., "Drink plenty of fluids, rest"

    // Phase 2D: Public Share Link & Revisions
    public string? PdfShareToken { get; set; } // Unique unguessable 128+ bits entropy
    public DateTime? ExpiresAt { get; set; }
    public bool IsPrinted { get; set; } = false;
    public Guid? PreviousPrescriptionId { get; set; }
    public Prescription? PreviousPrescription { get; set; }
    public bool IsCurrent { get; set; } = true;

    public ICollection<PrescriptionItem> Items { get; set; } = new List<PrescriptionItem>();
    public ICollection<PrescriptionLabOrders> LabOrders { get; set; } = new List<PrescriptionLabOrders>();
    public ICollection<PrescriptionAdvice> AdviceItems { get; set; } = new List<PrescriptionAdvice>();
    public ICollection<Prescription> Revisions { get; set; } = new List<Prescription>();
}
