using DocOS.Domain.Common;
using DocOS.Domain.Enums;

namespace DocOS.Domain.Entities;

public class Patient : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public string PatientUid { get; set; } = string.Empty; // e.g. DOC-2026-0001
    public string FullName { get; set; } = string.Empty;
    public int Age { get; set; }
    public Gender Gender { get; set; } = Gender.Male;
    public string MobileNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? BloodGroup { get; set; }
    public string? Address { get; set; }
    
    // Clinical Baseline
    public string? Allergies { get; set; } // Prominently displayed drug allergies (e.g. Penicillin, Sulfa)
    public string? MedicalHistory { get; set; } // e.g. T2DM, HTN, Asthma

    public ICollection<Visit> Visits { get; set; } = new List<Visit>();
}
