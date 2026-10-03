using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class LabTestMaster : BaseEntity
{
    public Guid? ClinicId { get; set; } // Null = global catalog, set = clinic-custom
    public Clinic? Clinic { get; set; }

    public string TestCode { get; set; } = string.Empty; // e.g. "CBC", "LIPID", "LFT", "KFT", "HBA1C"
    public string TestName { get; set; } = string.Empty; // e.g. "Complete Blood Count"
    public string Category { get; set; } = string.Empty; // e.g. "Hematology", "Biochemistry", "Pathology"
    public string? SampleType { get; set; } // e.g. "Blood (EDTA)", "Serum", "Urine"
    public bool FastingRequired { get; set; } = false;
    public bool IsActive { get; set; } = true;
}
