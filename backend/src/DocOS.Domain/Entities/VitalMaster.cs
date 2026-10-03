using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class VitalMaster : BaseEntity
{
    // Null ClinicId means global catalog row
    public Guid? ClinicId { get; set; }
    public Clinic? Clinic { get; set; }

    public string Code { get; set; } = null!; // e.g., "BP_SYS", "BP_DIA", "PULSE", "TEMP_F", "SPO2", "WEIGHT", "HEIGHT", "BMI", "SUGAR"
    public string DisplayName { get; set; } = null!;
    public string Unit { get; set; } = null!; // e.g., "mmHg", "bpm", "°F", "%", "kg", "cm", "kg/m²", "mg/dL"
    public string InputType { get; set; } = null!; // Number, Decimal, Text, Select, Computed, Paired
    public string? PairGroup { get; set; } // e.g., "BP" shared by BP_SYS and BP_DIA

    public decimal? NormalRangeMin { get; set; }
    public decimal? NormalRangeMax { get; set; }
    public int DefaultDisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    public ICollection<ClinicVitalPreference> ClinicPreferences { get; set; } = new List<ClinicVitalPreference>();
    public ICollection<VisitVitals> VisitVitals { get; set; } = new List<VisitVitals>();
}
