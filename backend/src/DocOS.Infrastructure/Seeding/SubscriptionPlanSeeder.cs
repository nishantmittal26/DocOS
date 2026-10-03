using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using DocOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DocOS.Infrastructure.Seeding;

public static class SubscriptionPlanSeeder
{
    public static async Task SeedSubscriptionPlansAsync(ApplicationDbContext context, ILogger? logger = null)
    {
        // 1. Seed standard master subscription plans
        var defaultPlans = new List<SubscriptionPlanMaster>
        {
            new()
            {
                PlanCode = "STARTER_MONTHLY",
                PlanName = "DocOS Solo Doctor Starter (Monthly)",
                Tier = SubscriptionTiers.Starter,
                IsUnlimitedVisits = false,
                DefaultMonthlyVisits = 300,
                MaxDoctors = 1,
                MaxStaff = 2,
                PriceINR = 999.00m,
                BillingCycle = BillingCycles.Monthly,
                HasCustomVitals = false,
                HasLabModule = false,
                IsActive = true
            },
            new()
            {
                PlanCode = "MULTIDOC_MONTHLY",
                PlanName = "DocOS Polyclinic Pro (Monthly)",
                Tier = SubscriptionTiers.MultiDoctor,
                IsUnlimitedVisits = false,
                DefaultMonthlyVisits = 1500,
                MaxDoctors = 5,
                MaxStaff = 10,
                PriceINR = 2499.00m,
                BillingCycle = BillingCycles.Monthly,
                HasCustomVitals = true,
                HasLabModule = false,
                IsActive = true
            },
            new()
            {
                PlanCode = "ENTERPRISE_ANNUAL",
                PlanName = "DocOS Hospital Enterprise (Annual)",
                Tier = SubscriptionTiers.Enterprise,
                IsUnlimitedVisits = true,
                DefaultMonthlyVisits = null,
                MaxDoctors = 25,
                MaxStaff = 50,
                PriceINR = 29999.00m,
                BillingCycle = BillingCycles.Annual,
                HasCustomVitals = true,
                HasLabModule = true,
                IsActive = true
            }
        };

        foreach (var plan in defaultPlans)
        {
            var exists = await context.SubscriptionPlans.AnyAsync(p => p.PlanCode == plan.PlanCode);
            if (!exists)
            {
                context.SubscriptionPlans.Add(plan);
                logger?.LogInformation("Seeding SaaS subscription plan: {PlanCode} ({PlanName})", plan.PlanCode, plan.PlanName);
            }
        }

        await context.SaveChangesAsync();

        // 2. Ensure every existing clinic has an active ClinicSubscription & ClinicPeriodUsage (backfill for 2A clinics)
        var starterPlan = await context.SubscriptionPlans.FirstAsync(p => p.PlanCode == "STARTER_MONTHLY");
        var clinicsWithoutSubscription = await context.Clinics
            .Where(c => !context.ClinicSubscriptions.Any(s => s.ClinicId == c.Id))
            .ToListAsync();

        foreach (var clinic in clinicsWithoutSubscription)
        {
            var periodStart = IndiaTime.Now;
            var periodEnd = periodStart.AddDays(30);

            var subscription = new ClinicSubscription
            {
                ClinicId = clinic.Id,
                PlanId = starterPlan.Id,
                IsUnlimitedVisits = false,
                MonthlyVisitQuota = starterPlan.DefaultMonthlyVisits,
                AdditionalTopUpVisits = 0,
                MaxDoctorsOverride = null,
                Status = SubscriptionStatuses.Active,
                CurrentPeriodStart = periodStart,
                CurrentPeriodEnd = periodEnd,
                GracePeriodDays = 5,
                Notes = "Auto-backfilled Starter subscription for existing clinic"
            };

            context.ClinicSubscriptions.Add(subscription);

            // Backfill period usage counting any existing completed visits
            var completedCount = await context.Visits
                .CountAsync(v => v.ClinicId == clinic.Id && v.Status == VisitStatus.Completed);

            var usage = new ClinicPeriodUsage
            {
                ClinicId = clinic.Id,
                Subscription = subscription,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                VisitsConducted = completedCount,
                LastVisitRecordedAt = completedCount > 0 ? IndiaTime.Now : null
            };

            context.ClinicPeriodUsages.Add(usage);

            logger?.LogInformation("Backfilled Starter subscription & period usage for existing clinic: {ClinicName} (Id: {ClinicId})", clinic.Name, clinic.Id);
        }

        if (clinicsWithoutSubscription.Count > 0)
        {
            await context.SaveChangesAsync();
        }
    }
}
