using DocOS.Domain.Common;
using DocOS.Domain.Enums;

namespace DocOS.Domain.Entities;

public class Visit : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    // Assigned Doctor (Phase 2A) - nvarchar(450) matching AspNetUsers.Id
    public string? DoctorId { get; set; }

    public int TokenNumber { get; set; }
    public DateTime VisitDate { get; set; } = DateTime.UtcNow.Date;
    public VisitStatus Status { get; set; } = VisitStatus.Waiting;

    // Dynamic Vitals (Phase 2C) - captured in VisitVitals rows
    public ICollection<VisitVitals> Vitals { get; set; } = new List<VisitVitals>();

    // Clinical Consultation (Doctor entry)
    public string? ChiefComplaints { get; set; } // e.g., "Fever (3 days), Dry Cough (1 week)"
    public string? Diagnosis { get; set; } // e.g., "Acute Upper Respiratory Tract Infection"
    public string? ClinicalNotes { get; set; }
    public DateTime? FollowUpDate { get; set; }

    // Phase 2D: Multiple revisions supported (filtered unique on IsCurrent = 1)
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    public Prescription? Prescription => Prescriptions.FirstOrDefault(p => p.IsCurrent) ?? Prescriptions.LastOrDefault();

    // Phase 2D: OPD fee payment collection
    public VisitPayment? Payment { get; set; }
}
