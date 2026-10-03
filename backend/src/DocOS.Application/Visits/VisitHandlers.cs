using DocOS.Application.Common.Interfaces;
using DocOS.Application.Vitals;
using DocOS.Domain.Common;
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
    IRequestHandler<DeleteVisitCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IIdentityService _identityService;
    private readonly IMediator? _mediator;

    public VisitHandlers(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IIdentityService identityService,
        IMediator? mediator = null)
    {
        _context = context;
        _currentUser = currentUser;
        _identityService = identityService;
        _mediator = mediator;
    }

    public async Task<VisitQueueDto> Handle(AddToQueueCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.Id == request.PatientId && p.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Patient not found in this clinic");

        var today = DateTime.UtcNow.Date;

        // If DoctorId is specified, verify doctor exists or default to current user if doctor
        var doctorId = request.DoctorId;
        if (string.IsNullOrWhiteSpace(doctorId) && _currentUser.IsInRole(Roles.Doctor) && !string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            doctorId = _currentUser.UserId;
        }

        // Check if patient is already active in today's OPD queue
        var existingActiveVisit = await _context.Visits
            .AsNoTracking()
            .Where(v => v.ClinicId == clinicId
                     && v.PatientId == patient.Id
                     && v.VisitDate == today
                     && (v.Status == VisitStatus.Waiting || v.Status == VisitStatus.InConsultation))
            .FirstOrDefaultAsync(cancellationToken);

        if (existingActiveVisit != null)
        {
            throw new InvalidOperationException(
                $"Patient '{patient.FullName}' is already in today's OPD queue (Token #{existingActiveVisit.TokenNumber} is currently {existingActiveVisit.Status}).");
        }

        var existingCompletedVisit = await _context.Visits
            .AsNoTracking()
            .Where(v => v.ClinicId == clinicId
                     && v.PatientId == patient.Id
                     && v.VisitDate == today
                     && v.Status == VisitStatus.Completed)
            .FirstOrDefaultAsync(cancellationToken);

        if (existingCompletedVisit != null)
        {
            throw new InvalidOperationException(
                $"Patient '{patient.FullName}' has already completed consultation today (Token #{existingCompletedVisit.TokenNumber}).");
        }

        // Phase 2B: Subscription Quota & Lifecycle Check
        var subscription = await _context.ClinicSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.ClinicId == clinicId, cancellationToken);

        if (subscription != null)
        {
            var isSuspended = subscription.Status == SubscriptionStatuses.Suspended
                || DateTime.UtcNow > subscription.CurrentPeriodEnd.AddDays(subscription.GracePeriodDays);

            if (isSuspended)
            {
                if (subscription.Status != SubscriptionStatuses.Suspended)
                {
                    subscription.Status = SubscriptionStatuses.Suspended;
                    await _context.SaveChangesAsync(cancellationToken);
                }
                throw new InvalidOperationException("Clinic subscription is suspended. New queue tokens cannot be issued. Patient history and clinical records remain accessible.");
            }

            if (!subscription.HasUnlimitedVisits)
            {
                var totalAllowed = subscription.TotalAllowedVisits ?? 0;
                var hardCap = totalAllowed + 20;

                var periodUsage = await _context.ClinicPeriodUsages
                    .Where(u => u.ClinicId == clinicId)
                    .OrderByDescending(u => u.PeriodStart)
                    .FirstOrDefaultAsync(cancellationToken);

                var visitsConducted = periodUsage?.VisitsConducted ?? 0;

                if (visitsConducted >= hardCap || subscription.Status == SubscriptionStatuses.QuotaExceeded)
                {
                    if (subscription.Status != SubscriptionStatuses.QuotaExceeded)
                    {
                        subscription.Status = SubscriptionStatuses.QuotaExceeded;
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                    throw new InvalidOperationException("Monthly visit quota exceeded (including 20-visit buffer). New tokens are blocked until plan is topped up or upgraded. Past patient records remain fully accessible.");
                }
            }
        }

        // Phase 2A: Token numbers are per doctor, per clinic, per calendar day
        var query = _context.Visits
            .Where(v => v.ClinicId == clinicId && v.VisitDate == today);

        if (!string.IsNullOrWhiteSpace(doctorId))
        {
            query = query.Where(v => v.DoctorId == doctorId);
        }
        else
        {
            query = query.Where(v => v.DoctorId == null);
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
            VisitDate = today,
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
            false
        );
    }

    public async Task<bool> Handle(UpdateVisitStatusCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var visit = await _context.Visits
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

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
        visit.UpdatedAt = DateTime.UtcNow;

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

        // If visit token was assigned to another doctor, recompute token for new doctor
        var today = visit.VisitDate;
        var usedTokens = await _context.Visits
            .Where(v => v.ClinicId == clinicId && v.DoctorId == request.DoctorId && v.VisitDate == today && v.Id != visit.Id)
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
        visit.UpdatedAt = DateTime.UtcNow;

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

        var today = DateTime.UtcNow.Date;

        var query = _context.Visits
            .AsNoTracking()
            .Include(v => v.Patient)
            .Include(v => v.Prescription)
            .Include(v => v.Vitals)
                .ThenInclude(vt => vt.VitalMaster)
            .Where(v => v.ClinicId == clinicId && v.VisitDate == today);

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
            v.Prescription != null
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
            .Include(v => v.Prescription)
                .ThenInclude(p => p!.Items)
            .Include(v => v.Clinic)
            .Include(v => v.Vitals)
                .ThenInclude(vt => vt.VitalMaster)
            .FirstOrDefaultAsync(v => v.Id == req.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        // Determine consulting doctor: Request -> Visit -> Current User
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
        visit.UpdatedAt = DateTime.UtcNow;

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
                    periodUsage.LastVisitRecordedAt = DateTime.UtcNow;
                    periodUsage.UpdatedAt = DateTime.UtcNow;

                    var totalAllowed = activeSubscription.TotalAllowedVisits;
                    if (!activeSubscription.HasUnlimitedVisits && totalAllowed.HasValue)
                    {
                        var hardCap = totalAllowed.Value + 20;
                        if (periodUsage.VisitsConducted >= hardCap)
                        {
                            activeSubscription.Status = SubscriptionStatuses.QuotaExceeded;
                            activeSubscription.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
            }
        }

        Prescription prescription;
        if (visit.Prescription == null)
        {
            prescription = new Prescription
            {
                VisitId = visit.Id,
                PatientId = visit.PatientId,
                ClinicId = clinicId,
                DoctorId = doctorId,
                PrescribedAt = DateTime.UtcNow,
                GeneralAdvice = req.GeneralAdvice
            };
            _context.Prescriptions.Add(prescription);
        }
        else
        {
            prescription = visit.Prescription;
            prescription.DoctorId = doctorId;
            prescription.GeneralAdvice = req.GeneralAdvice;
            prescription.UpdatedAt = DateTime.UtcNow;

            // Clear old items
            _context.PrescriptionItems.RemoveRange(prescription.Items);
            prescription.Items.Clear();
        }

        foreach (var item in req.Items)
        {
            prescription.Items.Add(new PrescriptionItem
            {
                PrescriptionId = prescription.Id,
                MedicineName = item.MedicineName.Trim(),
                SaltComposition = item.SaltComposition.Trim(),
                Form = item.Form,
                Dosage = item.Dosage.Trim(),
                Timing = item.Timing,
                DurationDays = item.DurationDays,
                Instructions = item.Instructions
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Fetch doctor profile for letterhead
        var doctorProfile = await _identityService.GetDoctorProfileAsync(doctorId);
        var clinic = visit.Clinic;

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

        return new PrescriptionDetailDto(
            prescription.Id,
            visit.Id,
            visit.PatientId,
            visit.Patient.PatientUid,
            visit.Patient.FullName,
            visit.Patient.Age,
            visit.Patient.Gender,
            visit.Patient.MobileNumber,
            visit.Patient.BloodGroup,
            visit.Patient.Allergies,
            doctorId,
            doctorProfile?.FullName ?? "Doctor",
            prescription.PrescribedAt,
            visit.FollowUpDate,
            VitalsMapper.MapToVitalsDto(visit.Vitals),
            visit.ChiefComplaints,
            visit.Diagnosis,
            visit.ClinicalNotes,
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
            clinicDto
        );
    }

    public async Task<PrescriptionDetailDto?> Handle(GetPrescriptionQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var visit = await _context.Visits
            .AsNoTracking()
            .Include(v => v.Patient)
            .Include(v => v.Clinic)
            .Include(v => v.Prescription)
                .ThenInclude(p => p!.Items)
            .Include(v => v.Vitals)
                .ThenInclude(vt => vt.VitalMaster)
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken);

        if (visit?.Prescription == null) return null;

        var prescription = visit.Prescription;
        var doctorId = prescription.DoctorId ?? visit.DoctorId ?? string.Empty;
        var doctorProfile = !string.IsNullOrWhiteSpace(doctorId) 
            ? await _identityService.GetDoctorProfileAsync(doctorId) 
            : null;

        var clinic = visit.Clinic;
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

        return new PrescriptionDetailDto(
            prescription.Id,
            visit.Id,
            visit.PatientId,
            visit.Patient.PatientUid,
            visit.Patient.FullName,
            visit.Patient.Age,
            visit.Patient.Gender,
            visit.Patient.MobileNumber,
            visit.Patient.BloodGroup,
            visit.Patient.Allergies,
            doctorId,
            doctorProfile?.FullName ?? "Doctor",
            prescription.PrescribedAt,
            visit.FollowUpDate,
            VitalsMapper.MapToVitalsDto(visit.Vitals),
            visit.ChiefComplaints,
            visit.Diagnosis,
            visit.ClinicalNotes,
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
            clinicDto
        );
    }

    public async Task<List<VisitQueueDto>> Handle(GetVisitHistoryQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var query = _context.Visits
            .AsNoTracking()
            .Include(v => v.Patient)
            .Include(v => v.Prescription)
            .Include(v => v.Vitals)
                .ThenInclude(vt => vt.VitalMaster)
            .Where(v => v.ClinicId == clinicId);

        if (request.FromDate.HasValue)
        {
            var from = request.FromDate.Value.Date;
            query = query.Where(v => v.VisitDate >= from);
        }

        if (request.ToDate.HasValue)
        {
            var to = request.ToDate.Value.Date;
            query = query.Where(v => v.VisitDate <= to);
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
            v.Prescription != null
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
        visit.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> Handle(DeleteVisitCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic clinical records");

        var visit = await _context.Visits
            .Include(v => v.Prescription)
                .ThenInclude(p => p!.Items)
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        if (visit.Prescription != null)
        {
            _context.PrescriptionItems.RemoveRange(visit.Prescription.Items);
            _context.Prescriptions.Remove(visit.Prescription);
        }

        _context.Visits.Remove(visit);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
