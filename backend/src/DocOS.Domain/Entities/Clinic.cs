using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class Clinic : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string? RegNumber { get; set; } // State Medical Council or National Medical Commission registration
    public string? Qualifications { get; set; } // e.g., MBBS, MD (General Medicine)
    public string? Specialization { get; set; } // e.g., General Physician, Pediatrician
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public int LetterheadMarginTopMm { get; set; } = 60; // Configurable margin for pre-printed letterheads
    public string PatientIdPrefix { get; set; } = "DOC";
    public int LastPatientSequence { get; set; } = 0;

    public ICollection<Patient> Patients { get; set; } = new List<Patient>();
    public ICollection<Visit> Visits { get; set; } = new List<Visit>();
}
