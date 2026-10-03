using DocOS.Domain.Common;
using DocOS.Domain.Enums;

namespace DocOS.Domain.Entities;

public class Visit : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    // Assigned Doctor (Phase 2A) - nvarchar(450) matching AspNetUsers.Id
    public string? DoctorId { get; set; }

    public int TokenNumber { get; set; }
    public DateTime VisitDate { get; set; } = DateTime.UtcNow.Date;
    public VisitStatus Status { get; set; } = VisitStatus.Waiting;

    // Vitals (captured by Receptionist / Assistant / Nurse or Doctor - preserved through 2A & 2B)
    public int? SystolicBp { get; set; } // mmHg
    public int? DiastolicBp { get; set; } // mmHg
    public int? PulseBpm { get; set; } // bpm
    public decimal? TemperatureF { get; set; } // Fahrenheit
    public int? Spo2 { get; set; } // percentage
    public decimal? WeightKg { get; set; } // kg
    public decimal? HeightCm { get; set; } // cm
    public decimal? Bmi { get; set; } // kg/m^2
    public string? Sugar { get; set; } // Blood Sugar e.g., "110 mg/dL", "140 PP", "95 Fasting", "RBS 160"

    // Clinical Consultation (Doctor entry)
    public string? ChiefComplaints { get; set; } // e.g., "Fever (3 days), Dry Cough (1 week)"
    public string? Diagnosis { get; set; } // e.g., "Acute Upper Respiratory Tract Infection"
    public string? ClinicalNotes { get; set; }
    public DateTime? FollowUpDate { get; set; }

    public Prescription? Prescription { get; set; }
}
