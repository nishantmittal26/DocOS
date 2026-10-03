using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Patients;

public record CreatePatientCommand(CreatePatientRequest Request) : IRequest<PatientDto>;

public record SearchPatientsQuery(string Query, string? DoctorId = null) : IRequest<List<PatientSearchResultDto>>;

public record GetPatientByIdQuery(Guid Id) : IRequest<PatientDto?>;

public class PatientHandlers :
    IRequestHandler<CreatePatientCommand, PatientDto>,
    IRequestHandler<SearchPatientsQuery, List<PatientSearchResultDto>>,
    IRequestHandler<GetPatientByIdQuery, PatientDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IIdentityService? _identityService;

    public PatientHandlers(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IIdentityService? identityService = null)
    {
        _context = context;
        _currentUser = currentUser;
        _identityService = identityService;
    }

    public async Task<PatientDto> Handle(CreatePatientCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var clinic = await _context.Clinics
            .FirstOrDefaultAsync(c => c.Id == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Clinic not found");

        // Increment sequence atomically
        clinic.LastPatientSequence += 1;
        var currentYear = DateTime.UtcNow.Year;
        var prefix = string.IsNullOrWhiteSpace(clinic.PatientIdPrefix) ? "DOC" : clinic.PatientIdPrefix.Trim().ToUpper();
        var patientUid = $"{prefix}-{currentYear}-{clinic.LastPatientSequence:D4}";

        var req = request.Request;
        var patient = new Patient
        {
            ClinicId = clinicId,
            PatientUid = patientUid,
            FullName = req.FullName.Trim(),
            Age = req.Age,
            Gender = req.Gender,
            MobileNumber = req.MobileNumber.Trim(),
            Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim(),
            BloodGroup = req.BloodGroup,
            Address = req.Address,
            Allergies = req.Allergies,
            MedicalHistory = req.MedicalHistory
        };

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync(cancellationToken);

        return new PatientDto(
            patient.Id,
            patient.ClinicId,
            patient.PatientUid,
            patient.FullName,
            patient.Age,
            patient.Gender,
            patient.MobileNumber,
            patient.Email,
            patient.BloodGroup,
            patient.Address,
            patient.Allergies,
            patient.MedicalHistory,
            patient.CreatedAt
        );
    }

    public async Task<List<PatientSearchResultDto>> Handle(SearchPatientsQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var q = (request.Query ?? string.Empty).Trim().ToLower();

        var queryable = _context.Patients
            .AsNoTracking()
            .Where(p => p.ClinicId == clinicId);

        // Filter by doctor if requested (patients who have had visits with this doctor)
        if (!string.IsNullOrWhiteSpace(request.DoctorId))
        {
            queryable = queryable.Where(p => p.Visits.Any(v => v.DoctorId == request.DoctorId));
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            queryable = queryable.Where(p =>
                p.MobileNumber.Contains(q) ||
                p.PatientUid.ToLower().Contains(q) ||
                p.FullName.ToLower().Contains(q));
        }

        var patients = await queryable
            .OrderByDescending(p => p.CreatedAt)
            .Take(30)
            .ToListAsync(cancellationToken);

        if (patients.Count == 0)
        {
            return new List<PatientSearchResultDto>();
        }

        var patientIds = patients.Select(p => p.Id).ToList();
        var today = DateTime.UtcNow.Date;

        var visits = await _context.Visits
            .AsNoTracking()
            .Where(v => v.ClinicId == clinicId && patientIds.Contains(v.PatientId))
            .OrderByDescending(v => v.VisitDate)
            .ThenByDescending(v => v.TokenNumber)
            .ToListAsync(cancellationToken);

        var doctorIds = visits
            .Where(v => !string.IsNullOrWhiteSpace(v.DoctorId))
            .Select(v => v.DoctorId!)
            .Distinct()
            .ToList();

        var doctorNames = _identityService != null
            ? (await _identityService.GetDoctorNamesAsync(doctorIds) ?? new Dictionary<string, string>())
            : new Dictionary<string, string>();

        var results = patients.Select(p =>
        {
            var pVisits = visits.Where(v => v.PatientId == p.Id).ToList();
            var todayVisit = pVisits.FirstOrDefault(v => v.VisitDate == today);
            var lastVisit = pVisits.FirstOrDefault();

            string? lastDoctorName = null;
            if (lastVisit?.DoctorId != null && doctorNames.TryGetValue(lastVisit.DoctorId, out var ldName))
            {
                lastDoctorName = ldName;
            }

            string? todayDoctorName = null;
            if (todayVisit?.DoctorId != null && doctorNames.TryGetValue(todayVisit.DoctorId, out var tdName))
            {
                todayDoctorName = tdName;
            }

            return new PatientSearchResultDto(
                p.Id,
                p.PatientUid,
                p.FullName,
                p.Age,
                p.Gender,
                p.MobileNumber,
                p.Allergies,
                lastVisit?.VisitDate,
                lastVisit?.DoctorId,
                lastDoctorName,
                todayVisit?.DoctorId,
                todayDoctorName,
                todayVisit?.TokenNumber,
                todayVisit?.Status.ToString()
            );
        }).ToList();

        return results;
    }

    public async Task<PatientDto?> Handle(GetPatientByIdQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var patient = await _context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.ClinicId == clinicId, cancellationToken);

        if (patient == null) return null;

        return new PatientDto(
            patient.Id,
            patient.ClinicId,
            patient.PatientUid,
            patient.FullName,
            patient.Age,
            patient.Gender,
            patient.MobileNumber,
            patient.Email,
            patient.BloodGroup,
            patient.Address,
            patient.Allergies,
            patient.MedicalHistory,
            patient.CreatedAt
        );
    }
}
