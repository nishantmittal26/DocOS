using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace DocOS.Infrastructure.Persistence;

/// <summary>Ensure BaseEntity and selected timestamps are written in IST.</summary>
public sealed class IstTimestampSaveChangesInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Apply(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Apply(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void Apply(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var now = IndiaTime.Now;

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
            }

            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }

        foreach (var entry in context.ChangeTracker.Entries<VisitVitals>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.RecordedAt = now;
            }
        }

        foreach (var entry in context.ChangeTracker.Entries<AuditLog>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.Timestamp = now;
            }
        }
    }
}
