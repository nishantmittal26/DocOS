using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class Clinic : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public int LetterheadMarginTopMm { get; set; } = 60; // Top margin for blank or pad
    public int PrintBottomMarginMm { get; set; } = 0; // Added in 2A: bottom margin
    public bool HideLetterheadOnPrint { get; set; } = false; // Added in 2A: 0 = draw digital letterhead; 1 = hide for pre-printed pad
    public string? ClinicTimings { get; set; } // Added in 2A: e.g. "Mon-Sat: 10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM"
    public string PatientIdPrefix { get; set; } = "DOC";
    public int LastPatientSequence { get; set; } = 0;

    // Added in 2B: Onboarding and entitlements
    public string? OnboardedByUserId { get; set; } // FK to AspNetUsers.Id. SalesAgent lists filter on this
    public string? SalesNotes { get; set; }

    public ICollection<Patient> Patients { get; set; } = new List<Patient>();
    public ICollection<Visit> Visits { get; set; } = new List<Visit>();
    public ClinicSubscription? Subscription { get; set; }
    public ICollection<ClinicPeriodUsage> PeriodUsages { get; set; } = new List<ClinicPeriodUsage>();
    public ICollection<SubscriptionPaymentHistory> SubscriptionPayments { get; set; } = new List<SubscriptionPaymentHistory>();
    public ICollection<ClinicVitalPreference> VitalPreferences { get; set; } = new List<ClinicVitalPreference>();
    public ICollection<VitalMaster> CustomVitals { get; set; } = new List<VitalMaster>();

    // Added in 2D: Labs, Advice, Payments, Audit
    public ICollection<LabTestMaster> CustomLabTests { get; set; } = new List<LabTestMaster>();
    public ICollection<LabTestPanel> LabPanels { get; set; } = new List<LabTestPanel>();
    public ICollection<AdviceTemplateMaster> CustomAdviceTemplates { get; set; } = new List<AdviceTemplateMaster>();
    public ICollection<VisitPayment> VisitPayments { get; set; } = new List<VisitPayment>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
