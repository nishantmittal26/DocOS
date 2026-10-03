using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class VisitVitals : BaseEntity
{
    public Guid VisitId { get; set; }
    public Visit Visit { get; set; } = null!;

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public Guid VitalMasterId { get; set; }
    public VitalMaster VitalMaster { get; set; } = null!;

    public string ValueText { get; set; } = null!; // Display snapshot, e.g. "120", "98.6", "140 PP"
    public decimal? ValueNumeric { get; set; } // Required for Number, Decimal, and Computed
    public string UnitSnapshot { get; set; } = null!; // Unit at record time, e.g. "mmHg", "°F"
    public bool IsAbnormal { get; set; } = false; // Evaluated against effective range

    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public string? RecordedByUserId { get; set; } // FK to AspNetUsers(Id), null for backfilled historical visits
}
