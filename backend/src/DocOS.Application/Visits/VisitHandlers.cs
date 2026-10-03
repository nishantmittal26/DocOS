using System.Security.Cryptography;
using DocOS.Application.Advice;
using DocOS.Domain.Common;
using DocOS.Application.Common.Interfaces;
using DocOS.Application.Labs;
using DocOS.Application.Payments;
using DocOS.Application.Vitals;
using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Visits;

public record AddToQueueCommand(Guid PatientId, string? DoctorId = null) : IRequest<VisitQueueDto>;

public record RecordVitalsCommand(RecordVitalsRequest Request) : IRequest<bool>;

public record UpdateVisitStatusCommand(Guid VisitId, VisitStatus Status, string? DoctorId = null) : IRequest<bool>;

public record AssignDoctorCommand(Guid VisitId, string DoctorId) : IRequest<bool>;

public record GetTodayQueueQuery(string? DoctorId = null) : IRequest<List<VisitQueueDto>>;

public record CompleteConsultationCommand(CompleteConsultationRequest Request) : IRequest<PrescriptionDetailDto>;

public record GetPrescriptionQuery(Guid VisitId) : IRequest<PrescriptionDetailDto?>;

public record GetVisitHistoryQuery(
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? Search = null,
    VisitStatus? Status = null,
    string? DoctorId = null,
    int Page = 1,
    int PageSize = 100
) : IRequest<List<VisitQueueDto>>;

public record RemoveFromQueueCommand(Guid VisitId) : IRequest<bool>;

public record DeleteVisitCommand(Guid VisitId) : IRequest<bool>;

// Phase 2D: Public Share Token, Print Auditing, and Revisions
public record GeneratePrescriptionShareTokenCommand(Guid PrescriptionId, int ExpiryDays = 7) : IRequest<GenerateShareTokenResponse>;

public record MarkPrescriptionPrintedCommand(Guid PrescriptionId) : IRequest<bool>;

public record GetPublicPrescriptionQuery(string Token) : IRequest<PrescriptionDetailDto?>;

public class VisitHandlers :
    IRequestHandler<AddToQueueCommand, VisitQueueDto>,
    IRequestHandler<RecordVitalsCommand, bool>,
    IRequestHandler<UpdateVisitStatusCommand, bool>,
    IRequestHandler<AssignDoctorCommand, bool>,
    IRequestHandler<GetTodayQueueQuery, List<VisitQueueDto>>,
    IRequestHandler<CompleteConsultationCommand, PrescriptionDetailDto>,
    IRequestHandler<GetPrescriptionQuery, PrescriptionDetailDto?>,
    IRequestHandler<GetVisitHistoryQuery, List<VisitQueueDto>>,
    IRequestHandler<RemoveFromQueueCommand, bool>,
    IRequestHandler<DeleteVisitCommand, bool>,
    IRequestHandler<GeneratePrescriptionShareTokenCommand, GenerateShareTokenResponse>,
    IRequestHandler<MarkPrescriptionPrintedCommand, bool>,
    IRequestHandler<GetPublicPrescriptionQuery, PrescriptionDetailDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IIdentityService _identityService;
    private readonly IAuditService? _auditService;
    private readonly IMediator? _mediator;

    public VisitHandlers(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IIdentityService identityService,
        IAuditService? auditService = null,
        IMediator? mediator = null)
    {
        _context = context;
        _currentUser = currentUser;
        _identityService = identityService;
        _auditService = auditService;
        _mediator = mediator;
    }

    public async Task<VisitQueueDto> Handle(AddToQueueCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.Id == request.PatientId && p.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Patient not found");

        // Subscription Guard: Check if subscription allows issuing tokens
        var subscription = await _context.ClinicSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.ClinicId == clinicId, cancellationToken);

        if (subscription != null)
        {
            if (subscription.Status == SubscriptionStatuses.Suspended)
            {
                throw new InvalidOperationException("Clinic subscription is suspended. Cannot issue new tokens.");
            }

            var periodUsage = await _context.ClinicPeriodUsages
                .Where(u => u.ClinicId == clinicId)
                .OrderByDescending(u => u.PeriodStart)
                .FirstOrDefaultAsync(cancellationToken);

            var totalAllowed = subscription.TotalAllowedVisits;
            if (!subscription.HasUnlimitedVisits && totalAllowed.HasValue && periodUsage != null)
            {
                var hardCap = totalAllowed.Value + 20;
                if (periodUsage.VisitsConducted >= hardCap)
                {
                    subscription.Status = SubscriptionStatuses.QuotaExceeded;
                    await _context.SaveChangesAsync(cancellationToken);
                    throw new InvalidOperationException("Monthly visit quota exceeded. Cannot issue new tokens.");
                }
            }

            if (subscription.Status == SubscriptionStatuses.QuotaExceeded)
            {
                throw new InvalidOperationException("Monthly visit quota exceeded. Cannot issue new tokens.");
            }
        }

        var today = IndiaTime.Today;
        var doctorId = request.DoctorId;

        var query = VisitDateQuery.WhereOnIstCalendarDay(_context.Visits, clinicId, today);

        if (!string.IsNullOrWhiteSpace(doctorId))
        {
            query = query.Where(v => v.DoctorId == doctorId);
        }

        var usedTokens = await query
            .Select(v => v.TokenNumber)
            .ToListAsync(cancellationToken);

        var usedTokensSet = new HashSet<int>(usedTokens);
        int nextToken = 1;
        while (usedTokensSet.Contains(nextToken))
        {
            nextToken++;
        }

        var visit = new Visit
        {
            ClinicId = clinicId,
            PatientId = patient.Id,
            DoctorId = doctorId,
            TokenNumber = nextToken,
            VisitDate = IndiaTime.Today,
            Status = VisitStatus.Waiting
        };

        _context.Visits.Add(visit);
        await _context.SaveChangesAsync(cancellationToken);

        string? doctorName = null;
        if (!string.IsNullOrWhiteSpace(doctorId))
        {
            var docProfile = await _identityService.GetDoctorProfileAsync(doctorId);
            doctorName = docProfile?.FullName;
        }

        return new VisitQueueDto(
            visit.Id,
            patient.Id,
            patient.PatientUid,
            patient.FullName,
            patient.Age,
            patient.Gender,
            patient.MobileNumber,
            patient.Allergies,
            patient.MedicalHistory,
            visit.DoctorId,
            doctorName,
            visit.TokenNumber,
            visit.Status,
            visit.VisitDate,
            null,
            null,
            null,
            null,
            false,
            null
        );
    }

    public async Task<bool> Handle(UpdateVisitStatusCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var visit = await _context.Visits
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        var previousStatus = visit.Status;

        if (!string.IsNullOrWhiteSpace(request.DoctorId))
        {
            visit.DoctorId = request.DoctorId;
        }

        // Phase 2A Constraint: A visit cannot enter InConsultation without an assigned DoctorId
        if (request.Status == VisitStatus.InConsultation)
        {
            var effectiveDoctorId = visit.DoctorId ?? request.DoctorId;
            if (string.IsNullOrWhiteSpace(effectiveDoctorId) && _currentUser.IsInRole(Roles.Doctor))
            {
                effectiveDoctorId = _currentUser.UserId;
                visit.DoctorId = effectiveDoctorId;
            }

            if (string.IsNullOrWhiteSpace(effectiveDoctorId))
            {
                throw new InvalidOperationException("A visit cannot enter InConsultation without an assigned Doctor.");
            }
        }

        visit.Status = request.Status;

        if (request.Status == VisitStatus.InConsultation && previousStatus != VisitStatus.InConsultation)
        {
            visit.VisitDate = IndiaTime.Now;
        }

        visit.UpdatedAt = IndiaTime.Now;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> Handle(AssignDoctorCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var visit = await _context.Visits
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        if (visit.DoctorId == request.DoctorId)
        {
            return true;
        }

        // If visit token was assigned to another doctor, recompute token for new doctor (same IST calendar day)
        var visitDay = visit.VisitDate.Date;
        var (dayStart, dayEnd) = IndiaTime.DayRange(visitDay);
        var usedTokens = await _context.Visits
            .Where(v =>
                v.ClinicId == clinicId
                && v.DoctorId == request.DoctorId
                && v.VisitDate >= dayStart
                && v.VisitDate < dayEnd
                && v.Id != visit.Id)
            .Select(v => v.TokenNumber)
            .ToListAsync(cancellationToken);

        var usedTokensSet = new HashSet<int>(usedTokens);
        int nextToken = 1;
        while (usedTokensSet.Contains(nextToken))
        {
            nextToken++;
        }

        visit.DoctorId = request.DoctorId;
        visit.TokenNumber = nextToken;
        visit.UpdatedAt = IndiaTime.Now;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> Handle(RecordVitalsCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var req = request.Request;
        var items = new List<RecordVisitVitalItemRequest>();
        if (req.SystolicBp.HasValue) items.Add(new RecordVisitVitalItemRequest(null, "BP_SYS", req.SystolicBp.Value.ToString(), req.SystolicBp.Value));
        if (req.DiastolicBp.HasValue) items.Add(new RecordVisitVitalItemRequest(null, "BP_DIA", req.DiastolicBp.Value.ToString(), req.DiastolicBp.Value));
        if (req.PulseBpm.HasValue) items.Add(new RecordVisitVitalItemRequest(null, "PULSE", req.PulseBpm.Value.ToString(), req.PulseBpm.Value));
        if (req.TemperatureF.HasValue) items.Add(new RecordVisitVitalItemRequest(null, "TEMP_F", req.TemperatureF.Value.ToString(), req.TemperatureF.Value));
        if (req.Spo2.HasValue) items.Add(new RecordVisitVitalItemRequest(null, "SPO2", req.Spo2.Value.ToString(), req.Spo2.Value));
        if (req.WeightKg.HasValue) items.Add(new RecordVisitVitalItemRequest(null, "WEIGHT", req.WeightKg.Value.ToString(), req.WeightKg.Value));
        if (req.HeightCm.HasValue) items.Add(new RecordVisitVitalItemRequest(null, "HEIGHT", req.HeightCm.Value.ToString(), req.HeightCm.Value));
        if (!string.IsNullOrWhiteSpace(req.Sugar)) items.Add(new RecordVisitVitalItemRequest(null, "SUGAR", req.Sugar.Trim(), null));

        if (_mediator != null)
        {
            await _mediator.Send(new RecordVisitVitalsCommand(req.VisitId, new RecordVisitVitalsRequest(items)), cancellationToken);
        }
        else
        {
            var handler = new VitalHandlers(_context, _currentUser);
            await handler.Handle(new RecordVisitVitalsCommand(req.VisitId, new RecordVisitVitalsRequest(items)), cancellationToken);
        }

        return true;
    }

    public async Task<List<VisitQueueDto>> Handle(GetTodayQueueQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var today = IndiaTime.Today;

        var query = VisitDateQuery.WhereOnIstCalendarDay(
                _context.Visits
                    .AsNoTracking()
                    .Include(v => v.Patient)
                    .Include(v => v.Prescriptions)
                    .Include(v => v.Payment)
                    .Include(v => v.Vitals)
                        .ThenInclude(vt => vt.VitalMaster),
                clinicId,
                today);

        if (!string.IsNullOrWhiteSpace(request.DoctorId))
        {
            query = query.Where(v => v.DoctorId == request.DoctorId);
        }

        var visits = await query
            .OrderBy(v => v.Status == VisitStatus.Completed ? 1 : 0) // Uncompleted first
            .ThenBy(v => v.TokenNumber)
            .ToListAsync(cancellationToken);

        var doctorIds = visits.Select(v => v.DoctorId).Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!).Distinct();
        var doctorNames = await _identityService.GetDoctorNamesAsync(doctorIds) ?? new Dictionary<string, string>();

        return visits.Select(v => new VisitQueueDto(
            v.Id,
            v.PatientId,
            v.Patient.PatientUid,
            v.Patient.FullName,
            v.Patient.Age,
            v.Patient.Gender,
            v.Patient.MobileNumber,
            v.Patient.Allergies,
            v.Patient.MedicalHistory,
            v.DoctorId,
            v.DoctorId != null && doctorNames.TryGetValue(v.DoctorId, out var dName) ? dName : null,
            v.TokenNumber,
            v.Status,
            v.VisitDate,
            VitalsMapper.MapToVitalsDto(v.Vitals),
            v.ChiefComplaints,
            v.Diagnosis,
            v.ClinicalNotes,
            v.Prescriptions.Any(p => p.IsCurrent),
            v.Payment != null ? new VisitPaymentDto(
                v.Payment.Id,
                v.Payment.VisitId,
                v.Payment.ClinicId,
                v.Payment.Amount,
                v.Payment.Method,
                v.Payment.Reference,
                v.Payment.CollectedByUserId,
                "Staff",
                v.Payment.CollectedAt
            ) : null
        )).ToList();
    }

    public async Task<PrescriptionDetailDto> Handle(CompleteConsultationCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        if (!_currentUser.IsInRole(Roles.Doctor) && !_currentUser.IsInRole(Roles.ClinicAdmin))
        {
            throw new UnauthorizedAccessException("Only doctors can complete consultations and prescribe medication");
        }

        var req = request.Request;
        var visit = await _context.Visits
            .Include(v => v.Patient)
            .Include(v => v.Clinic)
            .Include(v => v.Prescriptions)
                .ThenInclude(p => p.Items)
            .Include(v => v.Prescriptions)
                .ThenInclude(p => p.LabOrders)
                    .ThenInclude(o => o.LabTestMaster)
            .Include(v => v.Prescriptions)
                .ThenInclude(p => p.AdviceItems)
            .Include(v => v.Vitals)
                .ThenInclude(vt => vt.VitalMaster)
            .FirstOrDefaultAsync(v => v.Id == req.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        var doctorId = req.DoctorId ?? visit.DoctorId ?? _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(doctorId))
        {
            throw new InvalidOperationException("A valid DoctorId is required to complete consultation and save prescription.");
        }

        var wasNotCompleted = visit.Status != VisitStatus.Completed;

        visit.DoctorId = doctorId;
        visit.ChiefComplaints = req.ChiefComplaints;
        visit.Diagnosis = req.Diagnosis;
        visit.ClinicalNotes = req.ClinicalNotes;
        visit.FollowUpDate = req.FollowUpDate;
        visit.Status = VisitStatus.Completed;
        visit.UpdatedAt = IndiaTime.Now;

        // Phase 2B: Increment period visits conducted once on first completion
        if (wasNotCompleted)
        {
            var activeSubscription = await _context.ClinicSubscriptions
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(s => s.ClinicId == clinicId, cancellationToken);

            if (activeSubscription != null)
            {
                var periodUsage = await _context.ClinicPeriodUsages
                    .Where(u => u.ClinicId == clinicId)
                    .OrderByDescending(u => u.PeriodStart)
                    .FirstOrDefaultAsync(cancellationToken);

                if (periodUsage != null)
                {
                    periodUsage.VisitsConducted += 1;
                    periodUsage.LastVisitRecordedAt = IndiaTime.Now;
                    periodUsage.UpdatedAt = IndiaTime.Now;

                    var totalAllowed = activeSubscription.TotalAllowedVisits;
                    if (!activeSubscription.HasUnlimitedVisits && totalAllowed.HasValue)
                    {
                        var hardCap = totalAllowed.Value + 20;
                        if (periodUsage.VisitsConducted >= hardCap)
                        {
                            activeSubscription.Status = SubscriptionStatuses.QuotaExceeded;
                            activeSubscription.UpdatedAt = IndiaTime.Now;
                        }
                    }
                }
            }
        }

        // Phase 2D: Prescription revision logic
        var currentPrescription = visit.Prescriptions.FirstOrDefault(p => p.IsCurrent);

        Prescription targetPrescription;
        bool isNewRevision = false;

        if (currentPrescription != null && currentPrescription.IsPrinted)
        {
            // The printed prescription must remain unchanged. Mark it as non-current and create a new revision.
            currentPrescription.IsCurrent = false;
            currentPrescription.UpdatedAt = IndiaTime.Now;

            targetPrescription = new Prescription
            {
                VisitId = visit.Id,
                PatientId = visit.PatientId,
                ClinicId = clinicId,
                DoctorId = doctorId,
                PrescribedAt = IndiaTime.Now,
                GeneralAdvice = req.GeneralAdvice,
                PreviousPrescriptionId = currentPrescription.Id,
                IsCurrent = true,
                IsPrinted = false
            };

            _context.Prescriptions.Add(targetPrescription);
            isNewRevision = true;
        }
        else if (currentPrescription != null)
        {
            // Prescription exists and has not been printed: update in place
            targetPrescription = currentPrescription;
            targetPrescription.DoctorId = doctorId;
            targetPrescription.GeneralAdvice = req.GeneralAdvice;
            targetPrescription.UpdatedAt = IndiaTime.Now;

            // Clear old items, lab orders, advice items
            _context.PrescriptionItems.RemoveRange(targetPrescription.Items);
            _context.PrescriptionLabOrders.RemoveRange(targetPrescription.LabOrders);
            _context.PrescriptionAdvices.RemoveRange(targetPrescription.AdviceItems);
            targetPrescription.Items.Clear();
            targetPrescription.LabOrders.Clear();
            targetPrescription.AdviceItems.Clear();
        }
        else
        {
            // First prescription for this visit
            targetPrescription = new Prescription
            {
                VisitId = visit.Id,
                PatientId = visit.PatientId,
                ClinicId = clinicId,
                DoctorId = doctorId,
                PrescribedAt = IndiaTime.Now,
                GeneralAdvice = req.GeneralAdvice,
                IsCurrent = true,
                IsPrinted = false
            };

            _context.Prescriptions.Add(targetPrescription);
        }

        // Add Medicines
        foreach (var item in req.Items)
        {
            targetPrescription.Items.Add(new PrescriptionItem
            {
                PrescriptionId = targetPrescription.Id,
                MedicineName = item.MedicineName.Trim(),
                SaltComposition = item.SaltComposition.Trim(),
                Form = item.Form,
                Dosage = item.Dosage.Trim(),
                Timing = item.Timing,
                DurationDays = item.DurationDays,
                Instructions = item.Instructions
            });
        }

        // Add Lab Orders
        if (req.LabOrders != null && req.LabOrders.Any())
        {
            foreach (var lab in req.LabOrders)
            {
                targetPrescription.LabOrders.Add(new PrescriptionLabOrders
                {
                    PrescriptionId = targetPrescription.Id,
                    LabTestMasterId = lab.LabTestMasterId,
                    SpecialInstructions = string.IsNullOrWhiteSpace(lab.SpecialInstructions) ? null : lab.SpecialInstructions.Trim(),
                    Status = "Ordered"
                });
            }
        }

        // Add Advice Items
        if (req.AdviceItems != null && req.AdviceItems.Any())
        {
            int order = 0;
            foreach (var advice in req.AdviceItems)
            {
                targetPrescription.AdviceItems.Add(new PrescriptionAdvice
                {
                    PrescriptionId = targetPrescription.Id,
                    AdviceTemplateId = advice.AdviceTemplateId,
                    AdviceText = advice.AdviceText.Trim(),
                    DisplayOrder = advice.DisplayOrder != 0 ? advice.DisplayOrder : order++
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Audit log
        var action = isNewRevision ? "CREATE" : (currentPrescription == null ? "CREATE" : "UPDATE");
        if (_auditService != null)
        {
            await _auditService.LogAsync(
                action,
                nameof(Prescription),
                targetPrescription.Id.ToString(),
                clinicId: clinicId,
                userId: doctorId,
                cancellationToken: cancellationToken);
        }

        // Fetch doctor profile for letterhead
        var doctorProfile = await _identityService.GetDoctorProfileAsync(doctorId);

        return await BuildPrescriptionDetailDtoAsync(targetPrescription.Id, cancellationToken);
    }

    public async Task<PrescriptionDetailDto?> Handle(GetPrescriptionQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var prescription = await _context.Prescriptions
            .AsNoTracking()
            .Where(p => p.VisitId == request.VisitId && p.ClinicId == clinicId && p.IsCurrent)
            .Select(p => p.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (prescription == Guid.Empty) return null;

        return await BuildPrescriptionDetailDtoAsync(prescription, cancellationToken);
    }

    public async Task<GenerateShareTokenResponse> Handle(GeneratePrescriptionShareTokenCommand request, CancellationToken cancellationToken)
    {
        var prescription = await _context.Prescriptions
            .FirstOrDefaultAsync(p => p.Id == request.PrescriptionId, cancellationToken)
            ?? throw new KeyNotFoundException("Prescription not found.");

        if (_currentUser.ClinicId.HasValue && prescription.ClinicId != _currentUser.ClinicId.Value)
        {
            throw new UnauthorizedAccessException("Cannot generate share token for another clinic's prescription.");
        }

        // Cryptographically secure 128+ bit token (16 bytes = 128 bits)
        var tokenBytes = RandomNumberGenerator.GetBytes(16);
        var token = Convert.ToHexString(tokenBytes).ToLowerInvariant();
        var expiresAt = IndiaTime.Now.AddDays(request.ExpiryDays > 0 ? request.ExpiryDays : 7);

        prescription.PdfShareToken = token;
        prescription.ExpiresAt = expiresAt;
        prescription.UpdatedAt = IndiaTime.Now;

        await _context.SaveChangesAsync(cancellationToken);

        if (_auditService != null)
        {
            await _auditService.LogAsync(
                "UPDATE",
                nameof(Prescription),
                prescription.Id.ToString(),
                clinicId: prescription.ClinicId,
                userId: _currentUser.UserId,
                cancellationToken: cancellationToken);
        }

        return new GenerateShareTokenResponse(token, expiresAt, $"/rx/{token}");
    }

    public async Task<bool> Handle(MarkPrescriptionPrintedCommand request, CancellationToken cancellationToken)
    {
        var prescription = await _context.Prescriptions
            .FirstOrDefaultAsync(p => p.Id == request.PrescriptionId, cancellationToken)
            ?? throw new KeyNotFoundException("Prescription not found.");

        if (_currentUser.ClinicId.HasValue && prescription.ClinicId != _currentUser.ClinicId.Value)
        {
            throw new UnauthorizedAccessException("Cannot mark printed for another clinic's prescription.");
        }

        prescription.IsPrinted = true;
        prescription.UpdatedAt = IndiaTime.Now;

        await _context.SaveChangesAsync(cancellationToken);

        if (_auditService != null)
        {
            await _auditService.LogAsync(
                "PRINT",
                nameof(Prescription),
                prescription.Id.ToString(),
                clinicId: prescription.ClinicId,
                userId: _currentUser.UserId,
                cancellationToken: cancellationToken);
        }

        return true;
    }

    public async Task<PrescriptionDetailDto?> Handle(GetPublicPrescriptionQuery request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token)) return null;

        var token = request.Token.Trim().ToLowerInvariant();

        var prescriptionId = await _context.Prescriptions
            .AsNoTracking()
            .Where(p => p.PdfShareToken == token && (p.ExpiresAt == null || p.ExpiresAt > IndiaTime.Now))
            .Select(p => p.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (prescriptionId == Guid.Empty) return null;

        return await BuildPrescriptionDetailDtoAsync(prescriptionId, cancellationToken);
    }

    private async Task<PrescriptionDetailDto> BuildPrescriptionDetailDtoAsync(Guid prescriptionId, CancellationToken cancellationToken)
    {
        var prescription = await _context.Prescriptions
            .AsNoTracking()
            .Include(p => p.Visit)
                .ThenInclude(v => v.Vitals)
                    .ThenInclude(vt => vt.VitalMaster)
            .Include(p => p.Patient)
            .Include(p => p.Clinic)
            .Include(p => p.Items)
            .Include(p => p.LabOrders)
                .ThenInclude(o => o.LabTestMaster)
            .Include(p => p.AdviceItems)
            .FirstAsync(p => p.Id == prescriptionId, cancellationToken);

        var doctorId = prescription.DoctorId;
        var doctorProfile = !string.IsNullOrWhiteSpace(doctorId)
            ? await _identityService.GetDoctorProfileAsync(doctorId)
            : null;

        var clinic = prescription.Clinic;
        var clinicDto = new ClinicLetterheadDto(
            clinic.Name,
            doctorProfile?.FullName ?? "Doctor",
            doctorProfile?.MedicalCouncilRegistrationNumber,
            doctorProfile?.Qualifications,
            doctorProfile?.Speciality,
            clinic.Phone,
            clinic.Email,
            clinic.Address,
            clinic.LogoUrl,
            clinic.LetterheadMarginTopMm,
            clinic.PrintBottomMarginMm,
            clinic.HideLetterheadOnPrint,
            clinic.ClinicTimings
        );

        var labOrderDtos = prescription.LabOrders.Select(o => new PrescriptionLabOrderDto(
            o.Id,
            o.LabTestMasterId,
            o.LabTestMaster.TestCode,
            o.LabTestMaster.TestName,
            o.LabTestMaster.Category,
            o.LabTestMaster.SampleType,
            o.LabTestMaster.FastingRequired,
            o.SpecialInstructions,
            o.Status
        )).ToList();

        var adviceDtos = prescription.AdviceItems
            .OrderBy(a => a.DisplayOrder)
            .Select(a => new PrescriptionAdviceDto(
                a.Id,
                a.AdviceTemplateId,
                a.AdviceText,
                a.DisplayOrder
            )).ToList();

        return new PrescriptionDetailDto(
            prescription.Id,
            prescription.VisitId,
            prescription.PatientId,
            prescription.Patient.PatientUid,
            prescription.Patient.FullName,
            prescription.Patient.Age,
            prescription.Patient.Gender,
            prescription.Patient.MobileNumber,
            prescription.Patient.BloodGroup,
            prescription.Patient.Allergies,
            doctorId,
            doctorProfile?.FullName ?? "Doctor",
            prescription.PrescribedAt,
            prescription.Visit.FollowUpDate,
            VitalsMapper.MapToVitalsDto(prescription.Visit.Vitals),
            prescription.Visit.ChiefComplaints,
            prescription.Visit.Diagnosis,
            prescription.Visit.ClinicalNotes,
            prescription.GeneralAdvice,
            prescription.Items.Select(i => new PrescriptionItemDto(
                i.MedicineName,
                i.SaltComposition,
                i.Form,
                i.Dosage,
                i.Timing,
                i.DurationDays,
                i.Instructions
            )).ToList(),
            clinicDto,
            labOrderDtos,
            adviceDtos,
            prescription.PdfShareToken,
            prescription.ExpiresAt,
            prescription.IsPrinted,
            prescription.IsCurrent,
            prescription.PreviousPrescriptionId
        );
    }

    public async Task<List<VisitQueueDto>> Handle(GetVisitHistoryQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var query = _context.Visits
            .AsNoTracking()
            .Include(v => v.Patient)
            .Include(v => v.Prescriptions)
            .Include(v => v.Payment)
            .Include(v => v.Vitals)
                .ThenInclude(vt => vt.VitalMaster)
            .Where(v => v.ClinicId == clinicId);

        if (request.FromDate.HasValue)
        {
            var (from, _) = IndiaTime.DayRange(request.FromDate.Value.Date);
            query = query.Where(v => v.VisitDate >= from);
        }

        if (request.ToDate.HasValue)
        {
            var (_, toEnd) = IndiaTime.DayRange(request.ToDate.Value.Date);
            query = query.Where(v => v.VisitDate < toEnd);
        }

        if (request.Status.HasValue)
        {
            query = query.Where(v => v.Status == request.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.DoctorId))
        {
            query = query.Where(v => v.DoctorId == request.DoctorId);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(v =>
                v.Patient.FullName.ToLower().Contains(search) ||
                v.Patient.PatientUid.ToLower().Contains(search) ||
                v.Patient.MobileNumber.Contains(search) ||
                (v.Diagnosis != null && v.Diagnosis.ToLower().Contains(search)) ||
                (v.ChiefComplaints != null && v.ChiefComplaints.ToLower().Contains(search))
            );
        }

        var visits = await query
            .OrderByDescending(v => v.VisitDate)
            .ThenByDescending(v => v.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var doctorIds = visits.Select(v => v.DoctorId).Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!).Distinct();
        var doctorNames = await _identityService.GetDoctorNamesAsync(doctorIds) ?? new Dictionary<string, string>();

        return visits.Select(v => new VisitQueueDto(
            v.Id,
            v.PatientId,
            v.Patient.PatientUid,
            v.Patient.FullName,
            v.Patient.Age,
            v.Patient.Gender,
            v.Patient.MobileNumber,
            v.Patient.Allergies,
            v.Patient.MedicalHistory,
            v.DoctorId,
            v.DoctorId != null && doctorNames.TryGetValue(v.DoctorId, out var dName) ? dName : null,
            v.TokenNumber,
            v.Status,
            v.VisitDate,
            VitalsMapper.MapToVitalsDto(v.Vitals),
            v.ChiefComplaints,
            v.Diagnosis,
            v.ClinicalNotes,
            v.Prescriptions.Any(p => p.IsCurrent),
            v.Payment != null ? new VisitPaymentDto(
                v.Payment.Id,
                v.Payment.VisitId,
                v.Payment.ClinicId,
                v.Payment.Amount,
                v.Payment.Method,
                v.Payment.Reference,
                v.Payment.CollectedByUserId,
                "Staff",
                v.Payment.CollectedAt
            ) : null
        )).ToList();
    }

    public async Task<bool> Handle(RemoveFromQueueCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var visit = await _context.Visits
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        if (visit.Status == VisitStatus.Completed)
        {
            throw new InvalidOperationException("Cannot remove completed visit from queue");
        }

        visit.Status = VisitStatus.Cancelled;
        visit.UpdatedAt = IndiaTime.Now;
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> Handle(DeleteVisitCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var visit = await _context.Visits
            .Include(v => v.Prescriptions)
                .ThenInclude(p => p.Items)
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        foreach (var p in visit.Prescriptions)
        {
            _context.PrescriptionItems.RemoveRange(p.Items);
        }
        _context.Prescriptions.RemoveRange(visit.Prescriptions);

        _context.Visits.Remove(visit);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
