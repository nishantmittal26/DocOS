using DocOS.Domain.Common;
using DocOS.Domain.Enums;

namespace DocOS.Domain.Entities;

public class Medicine : BaseEntity
{
    public Guid? ClinicId { get; set; } // Null for pre-seeded Indian Formulary, set for clinic-custom medicines
    public Clinic? Clinic { get; set; }

    public string BrandName { get; set; } = string.Empty; // e.g. "Dolo 650", "Pan 40", "Azithral 500"
    public string SaltComposition { get; set; } = string.Empty; // e.g. "Paracetamol 650mg", "Pantoprazole 40mg"
    public DosageForm Form { get; set; } = DosageForm.Tablet;
    public string Strength { get; set; } = string.Empty; // e.g. "650mg", "40mg"
    public string? Manufacturer { get; set; } // e.g. "Micro Labs", "Alkem", "Cipla"
    public bool IsCustom { get; set; } = false;
}
