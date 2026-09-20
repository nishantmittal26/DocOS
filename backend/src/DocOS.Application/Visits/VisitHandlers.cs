using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Visits;

public record AddToQueueCommand(Guid PatientId) : IRequest<VisitQueueDto>;

public record RecordVitalsCommand(RecordVitalsRequest Request) : IRequest<bool>;

public record GetTodayQueueQuery : IRequest<List<VisitQueueDto>>;

public record CompleteConsultationCommand(CompleteConsultationRequest Request) : IRequest<PrescriptionDetailDto>;

public record GetPrescriptionQuery(Guid VisitId) : IRequest<PrescriptionDetailDto?>;

public class VisitHandlers :
    IRequestHandler<AddToQueueCommand, VisitQueueDto>,
    IRequestHandler<RecordVitalsCommand, bool>,
    IRequestHandler<GetTodayQueueQuery, List<VisitQueueDto>>,
    IRequestHandler<CompleteConsultationCommand, PrescriptionDetailDto>,
    IRequestHandler<GetPrescriptionQuery, PrescriptionDetailDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public VisitHandlers(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<VisitQueueDto> Handle(AddToQueueCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.Id == request.PatientId && p.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Patient not found in this clinic");

        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        // Next token number for today
        var maxToken = await _context.Visits
            .Where(v => v.ClinicId == clinicId && v.VisitDate >= today && v.VisitDate < tomorrow)
            .Select(v => (int?)v.TokenNumber)
            .MaxAsync(cancellationToken) ?? 0;

        var visit = new Visit
        {
            ClinicId = clinicId,
            PatientId = patient.Id,
            TokenNumber = maxToken + 1,
            VisitDate = DateTime.UtcNow,
            Status = VisitStatus.Waiting
        };

        _context.Visits.Add(visit);
        await _context.SaveChangesAsync(cancellationToken);

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

    public async Task<bool> Handle(RecordVitalsCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var req = request.Request;
        var visit = await _context.Visits
            .FirstOrDefaultAsync(v => v.Id == req.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        visit.SystolicBp = req.SystolicBp;
        visit.DiastolicBp = req.DiastolicBp;
        visit.PulseBpm = req.PulseBpm;
        visit.TemperatureF = req.TemperatureF;
        visit.Spo2 = req.Spo2;
        visit.WeightKg = req.WeightKg;
        visit.HeightCm = req.HeightCm;

        if (req.WeightKg.HasValue && req.HeightCm.HasValue && req.HeightCm > 0)
        {
            var heightInMeters = req.HeightCm.Value / 100m;
            visit.Bmi = Math.Round(req.WeightKg.Value / (heightInMeters * heightInMeters), 1);
        }

        visit.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<List<VisitQueueDto>> Handle(GetTodayQueueQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var visits = await _context.Visits
            .AsNoTracking()
            .Include(v => v.Patient)
            .Include(v => v.Prescription)
            .Where(v => v.ClinicId == clinicId && v.VisitDate >= today && v.VisitDate < tomorrow)
            .OrderBy(v => v.Status == VisitStatus.Completed ? 1 : 0) // Uncompleted first
            .ThenBy(v => v.TokenNumber)
            .ToListAsync(cancellationToken);

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
            v.TokenNumber,
            v.Status,
            v.VisitDate,
            new VitalsDto(
                v.SystolicBp,
                v.DiastolicBp,
                v.PulseBpm,
                v.TemperatureF,
                v.Spo2,
                v.WeightKg,
                v.HeightCm,
                v.Bmi
            ),
            v.ChiefComplaints,
            v.Diagnosis,
            v.ClinicalNotes,
            v.Prescription != null
        )).ToList();
    }

    public async Task<PrescriptionDetailDto> Handle(CompleteConsultationCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var req = request.Request;
        var visit = await _context.Visits
            .Include(v => v.Patient)
            .Include(v => v.Prescription)
                .ThenInclude(p => p!.Items)
            .Include(v => v.Clinic)
            .FirstOrDefaultAsync(v => v.Id == req.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        visit.ChiefComplaints = req.ChiefComplaints;
        visit.Diagnosis = req.Diagnosis;
        visit.ClinicalNotes = req.ClinicalNotes;
        visit.FollowUpDate = req.FollowUpDate;
        visit.Status = VisitStatus.Completed;
        visit.UpdatedAt = DateTime.UtcNow;

        Prescription prescription;
        if (visit.Prescription == null)
        {
            prescription = new Prescription
            {
                VisitId = visit.Id,
                PatientId = visit.PatientId,
                ClinicId = clinicId,
                PrescribedAt = DateTime.UtcNow,
                GeneralAdvice = req.GeneralAdvice
            };
            _context.Prescriptions.Add(prescription);
        }
        else
        {
            prescription = visit.Prescription;
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

        var clinic = visit.Clinic;
        var clinicDto = new ClinicLetterheadDto(
            clinic.Name,
            clinic.DoctorName,
            clinic.RegNumber,
            clinic.Qualifications,
            clinic.Specialization,
            clinic.Phone,
            clinic.Email,
            clinic.Address,
            clinic.LogoUrl,
            clinic.LetterheadMarginTopMm
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
            prescription.PrescribedAt,
            visit.FollowUpDate,
            new VitalsDto(
                visit.SystolicBp,
                visit.DiastolicBp,
                visit.PulseBpm,
                visit.TemperatureF,
                visit.Spo2,
                visit.WeightKg,
                visit.HeightCm,
                visit.Bmi
            ),
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
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var visit = await _context.Visits
            .AsNoTracking()
            .Include(v => v.Patient)
            .Include(v => v.Clinic)
            .Include(v => v.Prescription)
                .ThenInclude(p => p!.Items)
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken);

        if (visit?.Prescription == null) return null;

        var prescription = visit.Prescription;
        var clinic = visit.Clinic;
        var clinicDto = new ClinicLetterheadDto(
            clinic.Name,
            clinic.DoctorName,
            clinic.RegNumber,
            clinic.Qualifications,
            clinic.Specialization,
            clinic.Phone,
            clinic.Email,
            clinic.Address,
            clinic.LogoUrl,
            clinic.LetterheadMarginTopMm
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
            prescription.PrescribedAt,
            visit.FollowUpDate,
            new VitalsDto(
                visit.SystolicBp,
                visit.DiastolicBp,
                visit.PulseBpm,
                visit.TemperatureF,
                visit.Spo2,
                visit.WeightKg,
                visit.HeightCm,
                visit.Bmi
            ),
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
}
