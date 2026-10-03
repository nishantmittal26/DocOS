using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using DocOS.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Clinic> Clinics => Set<Clinic>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<SubscriptionPlanMaster> SubscriptionPlans => Set<SubscriptionPlanMaster>();
    public DbSet<ClinicSubscription> ClinicSubscriptions => Set<ClinicSubscription>();
    public DbSet<ClinicPeriodUsage> ClinicPeriodUsages => Set<ClinicPeriodUsage>();
    public DbSet<SubscriptionPaymentHistory> SubscriptionPayments => Set<SubscriptionPaymentHistory>();
    public DbSet<VitalMaster> VitalMasters => Set<VitalMaster>();
    public DbSet<ClinicVitalPreference> ClinicVitalPreferences => Set<ClinicVitalPreference>();
    public DbSet<VisitVitals> VisitVitals => Set<VisitVitals>();

    // Phase 2D: Labs, Advice, Payments, Audit, Favorites
    public DbSet<LabTestMaster> LabTestMasters => Set<LabTestMaster>();
    public DbSet<LabTestPanel> LabTestPanels => Set<LabTestPanel>();
    public DbSet<LabTestPanelItem> LabTestPanelItems => Set<LabTestPanelItem>();
    public DbSet<PrescriptionLabOrders> PrescriptionLabOrders => Set<PrescriptionLabOrders>();
    public DbSet<AdviceTemplateMaster> AdviceTemplateMasters => Set<AdviceTemplateMaster>();
    public DbSet<PrescriptionAdvice> PrescriptionAdvices => Set<PrescriptionAdvice>();
    public DbSet<DoctorMedicineFavorite> DoctorMedicineFavorites => Set<DoctorMedicineFavorite>();
    public DbSet<VisitPayment> VisitPayments => Set<VisitPayment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ApplicationUser configuration
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Qualifications).HasMaxLength(200);
            entity.Property(u => u.MedicalCouncilRegistrationNumber).HasMaxLength(100);
            entity.Property(u => u.Speciality).HasMaxLength(100);
            entity.Property(u => u.ConsultationFee).HasPrecision(10, 2);
            entity.Property(u => u.IsActive).HasDefaultValue(true);

            entity.HasOne<Clinic>()
                .WithMany()
                .HasForeignKey(u => u.ClinicId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Clinic configuration
        builder.Entity<Clinic>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).HasMaxLength(200).IsRequired();
            entity.Property(c => c.Phone).HasMaxLength(20).IsRequired();
            entity.Property(c => c.Email).HasMaxLength(256);
            entity.Property(c => c.Address).HasMaxLength(500);
            entity.Property(c => c.LogoUrl).HasMaxLength(500);
            entity.Property(c => c.ClinicTimings).HasMaxLength(200);
            entity.Property(c => c.LetterheadMarginTopMm).HasDefaultValue(60);
            entity.Property(c => c.PrintBottomMarginMm).HasDefaultValue(0);
            entity.Property(c => c.HideLetterheadOnPrint).HasDefaultValue(false);
            entity.Property(c => c.PatientIdPrefix).HasMaxLength(20).IsRequired().HasDefaultValue("DOC");
            entity.Property(c => c.LastPatientSequence).HasDefaultValue(0);
            entity.Property(c => c.OnboardedByUserId).HasMaxLength(450);
            entity.Property(c => c.SalesNotes).HasMaxLength(500);

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(c => c.OnboardedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Patient configuration
        builder.Entity<Patient>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.PatientUid).HasMaxLength(50).IsRequired();
            entity.Property(p => p.FullName).HasMaxLength(150).IsRequired();
            entity.Property(p => p.MobileNumber).HasMaxLength(20).IsRequired();
            entity.Property(p => p.Email).HasMaxLength(256);
            entity.Property(p => p.BloodGroup).HasMaxLength(10);
            entity.Property(p => p.Address).HasMaxLength(300);
            entity.Property(p => p.Allergies).HasMaxLength(500);

            entity.HasIndex(p => new { p.ClinicId, p.PatientUid }).IsUnique();
            entity.HasIndex(p => new { p.ClinicId, p.MobileNumber });

            entity.HasOne(p => p.Clinic)
                .WithMany(c => c.Patients)
                .HasForeignKey(p => p.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Visit configuration
        builder.Entity<Visit>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.Property(v => v.DoctorId).HasMaxLength(450);
            entity.Property(v => v.VisitDate).HasColumnType("datetime2");

            entity.Property<DateTime>("VisitDay")
                .HasColumnType("date")
                .HasComputedColumnSql("CONVERT(date, [VisitDate])", stored: true);

            entity.Property(v => v.Diagnosis).HasMaxLength(500);

            // Foreign keys
            entity.HasOne(v => v.Clinic)
                .WithMany(c => c.Visits)
                .HasForeignKey(v => v.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(v => v.Patient)
                .WithMany(p => p.Visits)
                .HasForeignKey(v => v.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(v => v.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            // Phase 2A token uniqueness per IST calendar day (VisitDay computed from VisitDate datetime2)
            entity.HasIndex("ClinicId", "DoctorId", "VisitDay", "TokenNumber")
                .IsUnique()
                .HasDatabaseName("IX_Visits_ClinicId_DoctorId_VisitDay_TokenNumber")
                .HasFilter("[DoctorId] IS NOT NULL");

            entity.HasIndex(v => new { v.ClinicId, v.VisitDate, v.DoctorId, v.Status });
        });

        // Prescription configuration
        builder.Entity<Prescription>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.DoctorId).HasMaxLength(450).IsRequired();
            entity.Property(p => p.PdfShareToken).HasMaxLength(128);
            entity.Property(p => p.IsPrinted).HasDefaultValue(false);
            entity.Property(p => p.IsCurrent).HasDefaultValue(true);

            entity.HasOne(p => p.Visit)
                .WithMany(v => v.Prescriptions)
                .HasForeignKey(p => p.VisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.Patient)
                .WithMany()
                .HasForeignKey(p => p.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.Clinic)
                .WithMany()
                .HasForeignKey(p => p.ClinicId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(p => p.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.PreviousPrescription)
                .WithMany(p => p.Revisions)
                .HasForeignKey(p => p.PreviousPrescriptionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(p => p.Items)
                .WithOne(i => i.Prescription)
                .HasForeignKey(i => i.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(p => p.VisitId)
                .IsUnique()
                .HasFilter("[IsCurrent] = 1");

            entity.HasIndex(p => p.PdfShareToken)
                .IsUnique()
                .HasFilter("[PdfShareToken] IS NOT NULL");
        });

        // PrescriptionItem configuration
        builder.Entity<PrescriptionItem>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.MedicineName).HasMaxLength(200).IsRequired();
            entity.Property(i => i.SaltComposition).HasMaxLength(300).IsRequired();
            entity.Property(i => i.Dosage).HasMaxLength(50).IsRequired();
            entity.Property(i => i.Instructions).HasMaxLength(300);
        });

        // Medicine master configuration
        builder.Entity<Medicine>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.BrandName).HasMaxLength(200).IsRequired();
            entity.Property(m => m.SaltComposition).HasMaxLength(300).IsRequired();
            entity.Property(m => m.Strength).HasMaxLength(100).IsRequired();
            entity.Property(m => m.Manufacturer).HasMaxLength(150);
            entity.Property(m => m.DefaultDosage).HasMaxLength(50);

            entity.HasIndex(m => new { m.ClinicId, m.BrandName });
            entity.HasIndex(m => m.BrandName);
            entity.HasIndex(m => m.SaltComposition);
            entity.HasIndex(m => m.ClinicId);
        });

        // SubscriptionPlanMaster configuration
        builder.Entity<SubscriptionPlanMaster>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.PlanCode).HasMaxLength(50).IsRequired();
            entity.Property(p => p.PlanName).HasMaxLength(150).IsRequired();
            entity.Property(p => p.Tier).HasMaxLength(30).IsRequired();
            entity.Property(p => p.PriceINR).HasPrecision(10, 2);
            entity.Property(p => p.BillingCycle).HasMaxLength(20).IsRequired();

            entity.HasIndex(p => p.PlanCode).IsUnique();
        });

        // ClinicSubscription configuration
        builder.Entity<ClinicSubscription>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Status).HasMaxLength(30).IsRequired();
            entity.Property(s => s.Notes).HasMaxLength(500);

            entity.HasIndex(s => s.ClinicId).IsUnique();

            entity.HasOne(s => s.Clinic)
                .WithOne(c => c.Subscription)
                .HasForeignKey<ClinicSubscription>(s => s.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.Plan)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(s => s.PlanId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ClinicPeriodUsage configuration
        builder.Entity<ClinicPeriodUsage>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.HasOne(u => u.Clinic)
                .WithMany(c => c.PeriodUsages)
                .HasForeignKey(u => u.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(u => u.Subscription)
                .WithMany(s => s.PeriodUsages)
                .HasForeignKey(u => u.SubscriptionId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cyclic cascade in SQL Server

            entity.HasIndex(u => new { u.ClinicId, u.PeriodStart }).IsUnique();
        });

        // SubscriptionPaymentHistory configuration
        builder.Entity<SubscriptionPaymentHistory>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.InvoiceNumber).HasMaxLength(50).IsRequired();
            entity.Property(p => p.Amount).HasPrecision(10, 2);
            entity.Property(p => p.PaymentMethod).HasMaxLength(20).IsRequired();
            entity.Property(p => p.TransactionReference).HasMaxLength(100);
            entity.Property(p => p.Status).HasMaxLength(20).IsRequired();

            entity.HasIndex(p => p.InvoiceNumber).IsUnique();

            entity.HasOne(p => p.Clinic)
                .WithMany(c => c.SubscriptionPayments)
                .HasForeignKey(p => p.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.Subscription)
                .WithMany(s => s.PaymentHistories)
                .HasForeignKey(p => p.SubscriptionId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cyclic cascade in SQL Server
        });

        // VitalMaster configuration (Phase 2C)
        builder.Entity<VitalMaster>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Code).HasMaxLength(50).IsRequired();
            entity.Property(v => v.DisplayName).HasMaxLength(100).IsRequired();
            entity.Property(v => v.Unit).HasMaxLength(30).IsRequired();
            entity.Property(v => v.InputType).HasMaxLength(20).IsRequired();
            entity.Property(v => v.PairGroup).HasMaxLength(50);
            entity.Property(v => v.NormalRangeMin).HasPrecision(12, 4);
            entity.Property(v => v.NormalRangeMax).HasPrecision(12, 4);
            entity.Property(v => v.DefaultDisplayOrder).HasDefaultValue(0);
            entity.Property(v => v.IsActive).HasDefaultValue(true);

            entity.HasOne(v => v.Clinic)
                .WithMany(c => c.CustomVitals)
                .HasForeignKey(v => v.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(v => v.Code)
                .IsUnique()
                .HasFilter("[ClinicId] IS NULL");

            entity.HasIndex(v => new { v.ClinicId, v.Code })
                .IsUnique()
                .HasFilter("[ClinicId] IS NOT NULL");
        });

        // ClinicVitalPreference configuration (Phase 2C)
        builder.Entity<ClinicVitalPreference>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.IsEnabled).HasDefaultValue(true);
            entity.Property(p => p.IsMandatory).HasDefaultValue(false);
            entity.Property(p => p.DisplayOrder).HasDefaultValue(0);
            entity.Property(p => p.NormalRangeMinOverride).HasPrecision(12, 4);
            entity.Property(p => p.NormalRangeMaxOverride).HasPrecision(12, 4);

            entity.HasOne(p => p.Clinic)
                .WithMany(c => c.VitalPreferences)
                .HasForeignKey(p => p.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.VitalMaster)
                .WithMany(v => v.ClinicPreferences)
                .HasForeignKey(p => p.VitalMasterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(p => new { p.ClinicId, p.VitalMasterId }).IsUnique();
        });

        // VisitVitals configuration (Phase 2C)
        builder.Entity<VisitVitals>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.Property(v => v.ValueText).HasMaxLength(100).IsRequired();
            entity.Property(v => v.ValueNumeric).HasPrecision(12, 4);
            entity.Property(v => v.UnitSnapshot).HasMaxLength(30).IsRequired();
            entity.Property(v => v.IsAbnormal).HasDefaultValue(false);
            entity.Property(v => v.RecordedByUserId).HasMaxLength(450);

            entity.HasOne(v => v.Visit)
                .WithMany(vis => vis.Vitals)
                .HasForeignKey(v => v.VisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(v => v.Patient)
                .WithMany()
                .HasForeignKey(v => v.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(v => v.VitalMaster)
                .WithMany(vm => vm.VisitVitals)
                .HasForeignKey(v => v.VitalMasterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(v => v.RecordedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(v => new { v.VisitId, v.VitalMasterId });
        });

        // LabTestMaster configuration (Phase 2D)
        builder.Entity<LabTestMaster>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.TestCode).HasMaxLength(50).IsRequired();
            entity.Property(l => l.TestName).HasMaxLength(150).IsRequired();
            entity.Property(l => l.Category).HasMaxLength(50).IsRequired();
            entity.Property(l => l.SampleType).HasMaxLength(50);
            entity.Property(l => l.FastingRequired).HasDefaultValue(false);
            entity.Property(l => l.IsActive).HasDefaultValue(true);

            entity.HasOne(l => l.Clinic)
                .WithMany(c => c.CustomLabTests)
                .HasForeignKey(l => l.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(l => l.TestCode)
                .IsUnique()
                .HasFilter("[ClinicId] IS NULL");

            entity.HasIndex(l => new { l.ClinicId, l.TestCode })
                .IsUnique()
                .HasFilter("[ClinicId] IS NOT NULL");
        });

        // LabTestPanel configuration (Phase 2D)
        builder.Entity<LabTestPanel>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).HasMaxLength(150).IsRequired();
            entity.Property(p => p.IsActive).HasDefaultValue(true);

            entity.HasOne(p => p.Clinic)
                .WithMany(c => c.LabPanels)
                .HasForeignKey(p => p.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // LabTestPanelItem configuration (Phase 2D)
        builder.Entity<LabTestPanelItem>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.DisplayOrder).HasDefaultValue(0);

            entity.HasOne(i => i.LabTestPanel)
                .WithMany(p => p.Items)
                .HasForeignKey(i => i.LabTestPanelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.LabTestMaster)
                .WithMany()
                .HasForeignKey(i => i.LabTestMasterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(i => new { i.LabTestPanelId, i.LabTestMasterId }).IsUnique();
        });

        // PrescriptionLabOrders configuration (Phase 2D)
        builder.Entity<PrescriptionLabOrders>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.SpecialInstructions).HasMaxLength(300);
            entity.Property(o => o.Status).HasMaxLength(20).IsRequired().HasDefaultValue("Ordered");

            entity.HasOne(o => o.Prescription)
                .WithMany(p => p.LabOrders)
                .HasForeignKey(o => o.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(o => o.LabTestMaster)
                .WithMany()
                .HasForeignKey(o => o.LabTestMasterId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // AdviceTemplateMaster configuration (Phase 2D)
        builder.Entity<AdviceTemplateMaster>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Category).HasMaxLength(50).IsRequired();
            entity.Property(a => a.Title).HasMaxLength(150).IsRequired();
            entity.Property(a => a.InstructionsText).IsRequired();
            entity.Property(a => a.IsActive).HasDefaultValue(true);

            entity.HasOne(a => a.Clinic)
                .WithMany(c => c.CustomAdviceTemplates)
                .HasForeignKey(a => a.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(a => new { a.ClinicId, a.Category });
        });

        // PrescriptionAdvice configuration (Phase 2D)
        builder.Entity<PrescriptionAdvice>(entity =>
        {
            entity.HasKey(pa => pa.Id);
            entity.Property(pa => pa.AdviceText).IsRequired();
            entity.Property(pa => pa.DisplayOrder).HasDefaultValue(0);

            entity.HasOne(pa => pa.Prescription)
                .WithMany(p => p.AdviceItems)
                .HasForeignKey(pa => pa.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pa => pa.AdviceTemplate)
                .WithMany()
                .HasForeignKey(pa => pa.AdviceTemplateId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // DoctorMedicineFavorite configuration (Phase 2D)
        builder.Entity<DoctorMedicineFavorite>(entity =>
        {
            entity.HasKey(f => f.Id);
            entity.Property(f => f.UserId).HasMaxLength(450).IsRequired();

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(f => f.Medicine)
                .WithMany()
                .HasForeignKey(f => f.MedicineId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(f => new { f.UserId, f.MedicineId }).IsUnique();
        });

        // VisitPayment configuration (Phase 2D)
        builder.Entity<VisitPayment>(entity =>
        {
            entity.HasKey(vp => vp.Id);
            entity.Property(vp => vp.Amount).HasPrecision(10, 2);
            entity.Property(vp => vp.Method).HasMaxLength(20).IsRequired();
            entity.Property(vp => vp.Reference).HasMaxLength(100);
            entity.Property(vp => vp.CollectedByUserId).HasMaxLength(450).IsRequired();

            entity.HasOne(vp => vp.Visit)
                .WithOne(v => v.Payment)
                .HasForeignKey<VisitPayment>(vp => vp.VisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(vp => vp.Clinic)
                .WithMany(c => c.VisitPayments)
                .HasForeignKey(vp => vp.ClinicId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(vp => vp.CollectedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(vp => new { vp.ClinicId, vp.CollectedAt });
        });

        // AuditLog configuration (Phase 2D)
        builder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(al => al.Id);
            entity.Property(al => al.UserId).HasMaxLength(450);
            entity.Property(al => al.Action).HasMaxLength(20).IsRequired();
            entity.Property(al => al.EntityName).HasMaxLength(100).IsRequired();
            entity.Property(al => al.EntityId).HasMaxLength(100).IsRequired();
            entity.Property(al => al.IpAddress).HasMaxLength(50);

            entity.HasOne(al => al.Clinic)
                .WithMany(c => c.AuditLogs)
                .HasForeignKey(al => al.ClinicId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(al => al.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(al => new { al.ClinicId, al.Timestamp });
        });
    }
}
