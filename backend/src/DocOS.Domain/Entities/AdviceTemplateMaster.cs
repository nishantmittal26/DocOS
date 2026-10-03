using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class AdviceTemplateMaster : BaseEntity
{
    public Guid? ClinicId { get; set; } // Null = global catalog, set = clinic-custom
    public Clinic? Clinic { get; set; }

    public string Category { get; set; } = string.Empty; // e.g. "Dietary", "General", "Lifestyle", "Pediatric"
    public string Title { get; set; } = string.Empty; // e.g. "Diabetic Dietary Guidelines"
    public string InstructionsText { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
