using DocOS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Clinic> Clinics { get; }
    DbSet<Patient> Patients { get; }
    DbSet<Visit> Visits { get; }
    DbSet<Prescription> Prescriptions { get; }
    DbSet<PrescriptionItem> PrescriptionItems { get; }
    DbSet<Medicine> Medicines { get; }
    DbSet<SubscriptionPlanMaster> SubscriptionPlans { get; }
    DbSet<ClinicSubscription> ClinicSubscriptions { get; }
    DbSet<ClinicPeriodUsage> ClinicPeriodUsages { get; }
    DbSet<SubscriptionPaymentHistory> SubscriptionPayments { get; }
    DbSet<VitalMaster> VitalMasters { get; }
    DbSet<ClinicVitalPreference> ClinicVitalPreferences { get; }
    DbSet<VisitVitals> VisitVitals { get; }

    // Phase 2D: Labs, Advice, Payments, Audit, Favorites
    DbSet<LabTestMaster> LabTestMasters { get; }
    DbSet<LabTestPanel> LabTestPanels { get; }
    DbSet<LabTestPanelItem> LabTestPanelItems { get; }
    DbSet<PrescriptionLabOrders> PrescriptionLabOrders { get; }
    DbSet<AdviceTemplateMaster> AdviceTemplateMasters { get; }
    DbSet<PrescriptionAdvice> PrescriptionAdvices { get; }
    DbSet<DoctorMedicineFavorite> DoctorMedicineFavorites { get; }
    DbSet<VisitPayment> VisitPayments { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
