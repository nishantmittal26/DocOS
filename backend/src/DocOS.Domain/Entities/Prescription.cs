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
    public string? GeneralAdvice { get; set; } // e.g., "Drink plenty of fluids, rest, avoid oily food"

    public ICollection<PrescriptionItem> Items { get; set; } = new List<PrescriptionItem>();
}
