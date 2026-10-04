using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Subscriptions;

public class SubscriptionHandlers :
    IRequestHandler<OnboardClinicCommand, OnboardClinicResponse>,
    IRequestHandler<GetSubscriptionPlansQuery, List<SubscriptionPlanDto>>,
    IRequestHandler<GetAdminClinicsQuery, List<AdminClinicItemDto>>,
    IRequestHandler<GetClinicSubscriptionDetailQuery, ClinicSubscriptionDetailDto>,
    IRequestHandler<UpdateClinicSubscriptionCommand, bool>,
    IRequestHandler<AddTopUpVisitsCommand, bool>,
    IRequestHandler<RecordSubscriptionPaymentCommand, bool>,
    IRequestHandler<GetClinicQuotaStatusQuery, ClinicQuotaStatusDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IIdentityService _identityService;

    public SubscriptionHandlers(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IIdentityService identityService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _identityService = identityService;
    }

    public async Task<OnboardClinicResponse> Handle(OnboardClinicCommand command, CancellationToken cancellationToken)
    {
        // 1. Authorization: Only PlatformAdmin or SalesAgent can onboard clinics
        if (!_currentUserService.IsInRole(Roles.PlatformAdmin) && !_currentUserService.IsInRole(Roles.SalesAgent))
        {
            throw new UnauthorizedAccessException("Only Platform Administrators and Sales Agents can onboard clinics");
        }

        var req = command.Request;

        // 2. Validate plan
        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == req.PlanId && p.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Selected subscription plan was not found or is inactive");

        var doctorEmail = req.Email?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(doctorEmail))
        {
            throw new InvalidOperationException("Doctor email address is required");
        }

        var initialPassword = string.IsNullOrWhiteSpace(req.DoctorPassword) ? "DocOS@2026" : req.DoctorPassword.Trim();

        // 3. Create Clinic
        var clinic = new Clinic
        {
            Name = req.ClinicName.Trim(),
            Phone = req.Phone.Trim(),
            Email = doctorEmail,
            Address = req.Address?.Trim(),
            ClinicTimings = req.ClinicTimings?.Trim(),
            LetterheadMarginTopMm = req.LetterheadMarginTopMm > 0 ? req.LetterheadMarginTopMm : 60,
            PrintBottomMarginMm = req.PrintBottomMarginMm >= 0 ? req.PrintBottomMarginMm : 0,
            HideLetterheadOnPrint = req.HideLetterheadOnPrint,
            PatientIdPrefix = PatientIdPrefixRules.Resolve(req.PatientIdPrefix, req.ClinicName),
            LastPatientSequence = 0,
            OnboardedByUserId = _currentUserService.UserId,
            SalesNotes = req.SalesNotes?.Trim()
        };

        _context.Clinics.Add(clinic);
        await _context.SaveChangesAsync(cancellationToken);

        // 4. Create Doctor user with ClinicAdmin and Doctor roles
        var doctorRoles = new[] { Roles.ClinicAdmin, Roles.Doctor };
        var (userSuccess, userError, doctorUserId) = await _identityService.CreateUserAsync(
            email: doctorEmail,
            password: initialPassword,
            fullName: req.DoctorName.Trim(),
            clinicId: clinic.Id,
            roles: doctorRoles,
            qualifications: req.Qualifications?.Trim(),
            medicalCouncilRegistrationNumber: req.RegNumber?.Trim(),
            speciality: req.Specialization?.Trim(),
            consultationFee: req.ConsultationFee
        );

        if (!userSuccess)
        {
            // Rollback clinic creation
            _context.Clinics.Remove(clinic);
            await _context.SaveChangesAsync(cancellationToken);
            throw new InvalidOperationException(userError ?? "Failed to create doctor account");
        }

        // 5. Create ClinicSubscription
        var periodDays = req.IsTrial ? 14 : (plan.BillingCycle == BillingCycles.Annual ? 365 : 30);
        var periodStart = IndiaTime.Now;
        var periodEnd = periodStart.AddDays(periodDays);
        var isUnlimited = req.IsUnlimitedOverride || plan.IsUnlimitedVisits;
        var monthlyQuota = isUnlimited ? null : (req.MonthlyVisitQuotaOverride ?? plan.DefaultMonthlyVisits);

        var subscription = new ClinicSubscription
        {
            ClinicId = clinic.Id,
            PlanId = plan.Id,
            IsUnlimitedVisits = isUnlimited,
            MonthlyVisitQuota = monthlyQuota,
            AdditionalTopUpVisits = 0,
            MaxDoctorsOverride = null,
            Status = req.IsTrial ? SubscriptionStatuses.Trial : SubscriptionStatuses.Active,
            CurrentPeriodStart = periodStart,
            CurrentPeriodEnd = periodEnd,
            GracePeriodDays = 5,
            Notes = $"Onboarded by {_currentUserService.UserId} on {IndiaTime.Now:yyyy-MM-dd}"
        };

        _context.ClinicSubscriptions.Add(subscription);

        // 6. Create initial period usage record
        var usage = new ClinicPeriodUsage
        {
            ClinicId = clinic.Id,
            Subscription = subscription,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            VisitsConducted = 0,
            LastVisitRecordedAt = null
        };

        _context.ClinicPeriodUsages.Add(usage);
        await _context.SaveChangesAsync(cancellationToken);

        return new OnboardClinicResponse(
            ClinicId: clinic.Id,
            ClinicName: clinic.Name,
            DoctorUserId: doctorUserId,
            DoctorName: req.DoctorName.Trim(),
            DoctorEmail: doctorEmail,
            InitialPassword: initialPassword,
            LoginUrl: "/login",
            SubscriptionStatus: subscription.Status,
            PlanName: plan.PlanName,
            PeriodStart: periodStart,
            PeriodEnd: periodEnd,
            MonthlyVisitQuota: monthlyQuota,
            IsUnlimited: isUnlimited,
            PatientIdPrefix: clinic.PatientIdPrefix
        );
    }

    public async Task<List<SubscriptionPlanDto>> Handle(GetSubscriptionPlansQuery request, CancellationToken cancellationToken)
    {
        return await _context.SubscriptionPlans
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.PriceINR)
            .Select(p => new SubscriptionPlanDto(
                p.Id,
                p.PlanCode,
                p.PlanName,
                p.Tier,
                p.IsUnlimitedVisits,
                p.DefaultMonthlyVisits,
                p.MaxDoctors,
                p.MaxStaff,
                p.PriceINR,
                p.BillingCycle,
                p.HasCustomVitals,
                p.HasLabModule,
                p.IsActive
            ))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<AdminClinicItemDto>> Handle(GetAdminClinicsQuery request, CancellationToken cancellationToken)
    {
        var isPlatformAdmin = _currentUserService.IsInRole(Roles.PlatformAdmin);
        var isSalesAgent = _currentUserService.IsInRole(Roles.SalesAgent);

        if (!isPlatformAdmin && !isSalesAgent)
        {
            throw new UnauthorizedAccessException("Only Platform Administrators and Sales Agents can view the clinics directory");
        }

        var query = _context.Clinics.AsNoTracking();

        // SalesAgent can only see clinics they onboarded
        if (isSalesAgent && !isPlatformAdmin)
        {
            var agentId = _currentUserService.UserId;
            query = query.Where(c => c.OnboardedByUserId == agentId);
        }

        var clinics = await query
            .Include(c => c.Subscription)
                .ThenInclude(s => s!.Plan)
            .Include(c => c.PeriodUsages)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        // Fetch onboarder names
        var onboarderIds = clinics.Select(c => c.OnboardedByUserId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
        var onboarderNames = await _identityService.GetDoctorNamesAsync(onboarderIds!) ?? new Dictionary<string, string>();

        var results = new List<AdminClinicItemDto>();
        foreach (var c in clinics)
        {
            var sub = c.Subscription;
            var currentUsage = c.PeriodUsages
                .OrderByDescending(u => u.PeriodStart)
                .FirstOrDefault();

            var visitsConducted = currentUsage?.VisitsConducted ?? 0;
            var isUnlimited = sub?.HasUnlimitedVisits ?? false;
            var totalAllowed = sub?.TotalAllowedVisits;

            var onboardedByName = c.OnboardedByUserId != null && onboarderNames.TryGetValue(c.OnboardedByUserId, out var name)
                ? name
                : null;

            var doctors = await _identityService.GetClinicDoctorsAsync(c.Id);

            results.Add(new AdminClinicItemDto(
                ClinicId: c.Id,
                ClinicName: c.Name,
                Phone: c.Phone,
                Email: c.Email,
                PrimaryDoctorName: doctors.FirstOrDefault()?.FullName,
                DoctorCount: doctors.Count,
                OnboardedByUserId: c.OnboardedByUserId,
                OnboardedByName: onboardedByName,
                SalesNotes: c.SalesNotes,
                CreatedAt: c.CreatedAt,
                SubscriptionId: sub?.Id,
                PlanName: sub?.Plan?.PlanName,
                PlanTier: sub?.Plan?.Tier,
                Status: sub?.Status ?? SubscriptionStatuses.Active,
                CurrentPeriodStart: sub?.CurrentPeriodStart ?? c.CreatedAt,
                CurrentPeriodEnd: sub?.CurrentPeriodEnd ?? c.CreatedAt.AddDays(30),
                VisitsConducted: visitsConducted,
                TotalAllowedVisits: totalAllowed,
                IsUnlimited: isUnlimited,
                GracePeriodDays: sub?.GracePeriodDays ?? 5
            ));
        }

        return results;
    }

    public async Task<ClinicSubscriptionDetailDto> Handle(GetClinicSubscriptionDetailQuery request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsInRole(Roles.PlatformAdmin))
        {
            throw new UnauthorizedAccessException("Only Platform Administrators can view full subscription details");
        }

        var clinic = await _context.Clinics
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ClinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Clinic was not found");

        await EnsureClinicSubscriptionAsync(clinic.Id, cancellationToken);

        var sub = await _context.ClinicSubscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
            .Include(s => s.PaymentHistories)
            .FirstAsync(s => s.ClinicId == request.ClinicId, cancellationToken);

        if (sub.Plan == null)
        {
            throw new InvalidOperationException(
                "Subscription plan is missing or invalid for this clinic. Assign an active plan and try again.");
        }

        var currentUsage = await _context.ClinicPeriodUsages
            .AsNoTracking()
            .Where(u => u.ClinicId == request.ClinicId)
            .OrderByDescending(u => u.PeriodStart)
            .FirstOrDefaultAsync(cancellationToken);

        var visitsConducted = currentUsage?.VisitsConducted ?? 0;
        var totalAllowed = sub.TotalAllowedVisits;
        var remaining = totalAllowed.HasValue ? Math.Max(0, totalAllowed.Value - visitsConducted) : (int?)null;

        var payments = sub.PaymentHistories
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new SubscriptionPaymentDto(
                p.Id,
                p.InvoiceNumber,
                p.Amount,
                p.PaymentMethod,
                p.TransactionReference,
                p.PaymentDate,
                p.Status
            ))
            .ToList();

        return new ClinicSubscriptionDetailDto(
            SubscriptionId: sub.Id,
            ClinicId: clinic.Id,
            ClinicName: clinic.Name,
            PlanId: sub.PlanId,
            PlanName: sub.Plan.PlanName,
            PlanTier: sub.Plan.Tier,
            BillingCycle: sub.Plan.BillingCycle,
            PriceINR: sub.Plan.PriceINR,
            Status: sub.Status,
            CurrentPeriodStart: sub.CurrentPeriodStart,
            CurrentPeriodEnd: sub.CurrentPeriodEnd,
            GracePeriodDays: sub.GracePeriodDays,
            IsUnlimitedVisits: sub.IsUnlimitedVisits,
            MonthlyVisitQuota: sub.MonthlyVisitQuota,
            AdditionalTopUpVisits: sub.AdditionalTopUpVisits,
            TotalAllowedVisits: totalAllowed,
            MaxDoctorsOverride: sub.MaxDoctorsOverride,
            EffectiveMaxDoctors: sub.EffectiveMaxDoctors,
            VisitsConducted: visitsConducted,
            RemainingVisits: remaining,
            LastVisitRecordedAt: currentUsage?.LastVisitRecordedAt,
            Notes: sub.Notes,
            LabModuleOverride: sub.LabModuleOverride,
            PlanHasLabModule: sub.Plan.HasLabModule,
            EffectiveHasLabModule: sub.EffectiveHasLabModule,
            PaymentHistory: payments
        );
    }

    public async Task<bool> Handle(UpdateClinicSubscriptionCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsInRole(Roles.PlatformAdmin))
        {
            throw new UnauthorizedAccessException("Only Platform Administrators can modify clinic subscriptions");
        }

        var sub = await _context.ClinicSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.ClinicId == command.ClinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Clinic subscription not found");

        var req = command.Request;
        sub.IsUnlimitedVisits = req.IsUnlimitedVisits;
        sub.MonthlyVisitQuota = req.IsUnlimitedVisits ? null : req.MonthlyVisitQuota;
        sub.MaxDoctorsOverride = req.MaxDoctorsOverride;
        sub.Status = req.Status;
        sub.GracePeriodDays = req.GracePeriodDays;
        sub.Notes = req.Notes;
        sub.LabModuleOverride = req.LabModuleOverride;
        sub.UpdatedAt = IndiaTime.Now;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> Handle(AddTopUpVisitsCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsInRole(Roles.PlatformAdmin))
        {
            throw new UnauthorizedAccessException("Only Platform Administrators can add top-up visits");
        }

        if (command.AdditionalVisits <= 0)
        {
            throw new InvalidOperationException("Top-up visits count must be greater than zero");
        }

        var sub = await _context.ClinicSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.ClinicId == command.ClinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Clinic subscription not found");

        sub.AdditionalTopUpVisits += command.AdditionalVisits;
        sub.UpdatedAt = IndiaTime.Now;

        // If quota exceeded, restore to Active or GracePeriod
        if (sub.Status == SubscriptionStatuses.QuotaExceeded)
        {
            if (IndiaTime.Now > sub.CurrentPeriodEnd)
            {
                sub.Status = IndiaTime.Now <= sub.CurrentPeriodEnd.AddDays(sub.GracePeriodDays)
                    ? SubscriptionStatuses.GracePeriod
                    : SubscriptionStatuses.Suspended;
            }
            else
            {
                sub.Status = SubscriptionStatuses.Active;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> Handle(RecordSubscriptionPaymentCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsInRole(Roles.PlatformAdmin))
        {
            throw new UnauthorizedAccessException("Only Platform Administrators can record subscription payments");
        }

        var sub = await _context.ClinicSubscriptions
            .FirstOrDefaultAsync(s => s.ClinicId == command.ClinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Clinic subscription not found");

        var req = command.Request;

        // Ensure unique invoice number
        var invoiceExists = await _context.SubscriptionPayments
            .AnyAsync(p => p.InvoiceNumber == req.InvoiceNumber.Trim(), cancellationToken);

        if (invoiceExists)
        {
            throw new InvalidOperationException($"Invoice number '{req.InvoiceNumber}' has already been recorded");
        }

        var payment = new SubscriptionPaymentHistory
        {
            ClinicId = command.ClinicId,
            SubscriptionId = sub.Id,
            InvoiceNumber = req.InvoiceNumber.Trim(),
            Amount = req.Amount,
            PaymentMethod = req.PaymentMethod,
            TransactionReference = req.TransactionReference?.Trim(),
            PaymentDate = req.PaymentDate,
            Status = req.Status
        };

        _context.SubscriptionPayments.Add(payment);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ClinicQuotaStatusDto> Handle(GetClinicQuotaStatusQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUserService.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to check quota status");

        var sub = await _context.ClinicSubscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.ClinicId == clinicId, cancellationToken);

        if (sub == null)
        {
            // Default permissive response if subscription is not yet populated
            return new ClinicQuotaStatusDto(
                ClinicId: clinicId,
                Status: SubscriptionStatuses.Active,
                PlanName: "Standard",
                PlanTier: SubscriptionTiers.Starter,
                IsUnlimited: true,
                VisitsConducted: 0,
                MonthlyQuota: null,
                AdditionalTopUpVisits: 0,
                TotalAllowed: null,
                RemainingVisits: null,
                IsWithinBuffer: false,
                RemainingBufferVisits: 20,
                IsQuotaExceeded: false,
                IsGracePeriod: false,
                IsSuspended: false,
                PeriodEnd: IndiaTime.Now.AddDays(30),
                CanIssueTokens: true,
                HasLabModule: false,
                HasCustomVitals: false,
                EffectiveMaxDoctors: 1
            );
        }

        var currentUsage = await _context.ClinicPeriodUsages
            .AsNoTracking()
            .Where(u => u.ClinicId == clinicId)
            .OrderByDescending(u => u.PeriodStart)
            .FirstOrDefaultAsync(cancellationToken);

        var visitsConducted = currentUsage?.VisitsConducted ?? 0;
        var isUnlimited = sub.HasUnlimitedVisits;
        var totalAllowed = sub.TotalAllowedVisits;

        var isGracePeriod = IndiaTime.Now > sub.CurrentPeriodEnd && IndiaTime.Now <= sub.CurrentPeriodEnd.AddDays(sub.GracePeriodDays);
        var isSuspended = sub.Status == SubscriptionStatuses.Suspended || IndiaTime.Now > sub.CurrentPeriodEnd.AddDays(sub.GracePeriodDays);

        var isWithinBuffer = false;
        var remainingBuffer = 20;
        var isQuotaExceeded = sub.Status == SubscriptionStatuses.QuotaExceeded;

        if (!isUnlimited && totalAllowed.HasValue)
        {
            var hardCap = totalAllowed.Value + 20;
            if (visitsConducted > totalAllowed.Value && visitsConducted <= hardCap)
            {
                isWithinBuffer = true;
                remainingBuffer = Math.Max(0, hardCap - visitsConducted);
            }
            else if (visitsConducted > hardCap)
            {
                isQuotaExceeded = true;
                remainingBuffer = 0;
            }
        }

        var remainingVisits = isUnlimited || !totalAllowed.HasValue ? (int?)null : Math.Max(0, totalAllowed.Value - visitsConducted);
        var canIssueTokens = !isSuspended && !isQuotaExceeded;

        return new ClinicQuotaStatusDto(
            ClinicId: clinicId,
            Status: isSuspended ? SubscriptionStatuses.Suspended : (isQuotaExceeded ? SubscriptionStatuses.QuotaExceeded : (isGracePeriod ? SubscriptionStatuses.GracePeriod : sub.Status)),
            PlanName: sub.Plan.PlanName,
            PlanTier: sub.Plan.Tier,
            IsUnlimited: isUnlimited,
            VisitsConducted: visitsConducted,
            MonthlyQuota: sub.MonthlyVisitQuota,
            AdditionalTopUpVisits: sub.AdditionalTopUpVisits,
            TotalAllowed: totalAllowed,
            RemainingVisits: remainingVisits,
            IsWithinBuffer: isWithinBuffer,
            RemainingBufferVisits: remainingBuffer,
            IsQuotaExceeded: isQuotaExceeded,
            IsGracePeriod: isGracePeriod,
            IsSuspended: isSuspended,
            PeriodEnd: sub.CurrentPeriodEnd,
            CanIssueTokens: canIssueTokens,
            HasLabModule: sub.EffectiveHasLabModule,
            HasCustomVitals: sub.Plan?.HasCustomVitals == true,
            EffectiveMaxDoctors: sub.EffectiveMaxDoctors
        );
    }

    private async Task EnsureClinicSubscriptionAsync(Guid clinicId, CancellationToken cancellationToken)
    {
        var hasSubscription = await _context.ClinicSubscriptions
            .AnyAsync(s => s.ClinicId == clinicId, cancellationToken);
        if (hasSubscription)
        {
            return;
        }

        var starterPlan = await _context.SubscriptionPlans
            .Where(p => p.IsActive && p.PlanCode == "STARTER_MONTHLY")
            .FirstOrDefaultAsync(cancellationToken)
            ?? await _context.SubscriptionPlans
                .Where(p => p.IsActive)
                .OrderBy(p => p.PriceINR)
                .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "No active subscription plans are configured. Seed plans before opening clinic billing.");

        var periodStart = IndiaTime.Now;
        var periodEnd = periodStart.AddDays(30);

        var subscription = new ClinicSubscription
        {
            ClinicId = clinicId,
            PlanId = starterPlan.Id,
            IsUnlimitedVisits = false,
            MonthlyVisitQuota = starterPlan.DefaultMonthlyVisits,
            AdditionalTopUpVisits = 0,
            MaxDoctorsOverride = null,
            Status = SubscriptionStatuses.Active,
            CurrentPeriodStart = periodStart,
            CurrentPeriodEnd = periodEnd,
            GracePeriodDays = 5,
            Notes = "Auto-provisioned Starter subscription when opening quota & billing"
        };

        _context.ClinicSubscriptions.Add(subscription);

        var completedCount = await _context.Visits
            .CountAsync(v => v.ClinicId == clinicId && v.Status == VisitStatus.Completed, cancellationToken);

        _context.ClinicPeriodUsages.Add(new ClinicPeriodUsage
        {
            ClinicId = clinicId,
            Subscription = subscription,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            VisitsConducted = completedCount,
            LastVisitRecordedAt = completedCount > 0 ? IndiaTime.Now : null
        });

        await _context.SaveChangesAsync(cancellationToken);
    }
}
