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

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Clinic configuration
        builder.Entity<Clinic>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).HasMaxLength(200).IsRequired();
            entity.Property(c => c.DoctorName).HasMaxLength(150).IsRequired();
            entity.Property(c => c.Phone).HasMaxLength(20).IsRequired();
        });

        // Patient configuration
        builder.Entity<Patient>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.PatientUid).HasMaxLength(50).IsRequired();
            entity.Property(p => p.FullName).HasMaxLength(150).IsRequired();
            entity.Property(p => p.MobileNumber).HasMaxLength(20).IsRequired();

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

            entity.Property(v => v.TemperatureF).HasPrecision(5, 2);
            entity.Property(v => v.WeightKg).HasPrecision(5, 2);
            entity.Property(v => v.HeightCm).HasPrecision(5, 2);
            entity.Property(v => v.Bmi).HasPrecision(5, 2);

            entity.HasIndex(v => new { v.ClinicId, v.VisitDate });

            entity.HasOne(v => v.Clinic)
                .WithMany(c => c.Visits)
                .HasForeignKey(v => v.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(v => v.Patient)
                .WithMany(p => p.Visits)
                .HasForeignKey(v => v.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Prescription configuration
        builder.Entity<Prescription>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.HasOne(p => p.Visit)
                .WithOne(v => v.Prescription)
                .HasForeignKey<Prescription>(p => p.VisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(p => p.Items)
                .WithOne(i => i.Prescription)
                .HasForeignKey(i => i.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // PrescriptionItem configuration
        builder.Entity<PrescriptionItem>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.MedicineName).HasMaxLength(200).IsRequired();
            entity.Property(i => i.SaltComposition).HasMaxLength(300).IsRequired();
            entity.Property(i => i.Dosage).HasMaxLength(50).IsRequired();
        });

        // Medicine master configuration
        builder.Entity<Medicine>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.BrandName).HasMaxLength(200).IsRequired();
            entity.Property(m => m.SaltComposition).HasMaxLength(300).IsRequired();

            entity.HasIndex(m => m.BrandName);
            entity.HasIndex(m => m.SaltComposition);
            entity.HasIndex(m => m.ClinicId);
        });
    }
}
