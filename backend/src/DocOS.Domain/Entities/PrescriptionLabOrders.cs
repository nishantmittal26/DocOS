using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class PrescriptionLabOrders : BaseEntity
{
    public Guid PrescriptionId { get; set; }
    public Prescription Prescription { get; set; } = null!;

    public Guid LabTestMasterId { get; set; }
    public LabTestMaster LabTestMaster { get; set; } = null!;

    public string? SpecialInstructions { get; set; }
    public string Status { get; set; } = "Ordered"; // "Ordered", "Completed"
}
