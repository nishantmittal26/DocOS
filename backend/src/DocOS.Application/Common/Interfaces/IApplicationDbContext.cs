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

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
