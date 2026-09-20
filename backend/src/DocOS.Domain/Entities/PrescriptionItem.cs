using DocOS.Domain.Common;
using DocOS.Domain.Enums;

namespace DocOS.Domain.Entities;

public class PrescriptionItem : BaseEntity
{
    public Guid PrescriptionId { get; set; }
    public Prescription Prescription { get; set; } = null!;

    public string MedicineName { get; set; } = string.Empty; // Brand Name, e.g. "Augmentin 625 Duo"
    public string SaltComposition { get; set; } = string.Empty; // Salt Name, e.g. "Amoxicillin 500mg + Clavulanic Acid 125mg"
    public DosageForm Form { get; set; } = DosageForm.Tablet; // Tablet, Syrup, etc.
    public string Dosage { get; set; } = "1-0-1"; // 1-0-1, 1-0-0, 0-0-1, 1-1-1, SOS
    public DosageTiming Timing { get; set; } = DosageTiming.AfterFood; // After food, Before food, etc.
    public int DurationDays { get; set; } = 5;
    public string? Instructions { get; set; } // e.g. "Complete the 5-day course without skipping"
}
