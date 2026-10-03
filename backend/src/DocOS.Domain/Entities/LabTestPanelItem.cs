using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class LabTestPanelItem : BaseEntity
{
    public Guid LabTestPanelId { get; set; }
    public LabTestPanel LabTestPanel { get; set; } = null!;

    public Guid LabTestMasterId { get; set; }
    public LabTestMaster LabTestMaster { get; set; } = null!;

    public int DisplayOrder { get; set; } = 0;
}
