using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class PrescriptionAdvice : BaseEntity
{
    public Guid PrescriptionId { get; set; }
    public Prescription Prescription { get; set; } = null!;

    public Guid? AdviceTemplateId { get; set; }
    public AdviceTemplateMaster? AdviceTemplate { get; set; }

    public string AdviceText { get; set; } = string.Empty; // Snapshot copied at selection time
    public int DisplayOrder { get; set; } = 0;
}
