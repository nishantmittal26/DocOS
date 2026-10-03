using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class LabTestPanel : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public string Name { get; set; } = string.Empty; // e.g. "Fever Panel", "Diabetic Review", "Full Body Checkup"
    public bool IsActive { get; set; } = true;

    public ICollection<LabTestPanelItem> Items { get; set; } = new List<LabTestPanelItem>();
}
