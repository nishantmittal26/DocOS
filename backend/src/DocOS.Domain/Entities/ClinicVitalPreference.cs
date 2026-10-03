using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class ClinicVitalPreference : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public Guid VitalMasterId { get; set; }
    public VitalMaster VitalMaster { get; set; } = null!;

    public bool IsEnabled { get; set; } = true;
    public bool IsMandatory { get; set; } = false;
    public int DisplayOrder { get; set; } = 0;

    public decimal? NormalRangeMinOverride { get; set; }
    public decimal? NormalRangeMaxOverride { get; set; }
}
