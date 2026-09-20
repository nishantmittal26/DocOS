using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Patients;

public record CreatePatientCommand(CreatePatientRequest Request) : IRequest<PatientDto>;

public record SearchPatientsQuery(string Query) : IRequest<List<PatientSearchResultDto>>;

public record GetPatientByIdQuery(Guid Id) : IRequest<PatientDto?>;

public class PatientHandlers :
    IRequestHandler<CreatePatientCommand, PatientDto>,
    IRequestHandler<SearchPatientsQuery, List<PatientSearchResultDto>>,
    IRequestHandler<GetPatientByIdQuery, PatientDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public PatientHandlers(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
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

        if (!string.IsNullOrWhiteSpace(q))
        {
            queryable = queryable.Where(p =>
                p.MobileNumber.Contains(q) ||
                p.PatientUid.ToLower().Contains(q) ||
                p.FullName.ToLower().Contains(q));
        }

        var results = await queryable
            .OrderByDescending(p => p.CreatedAt)
            .Take(30)
            .Select(p => new PatientSearchResultDto(
                p.Id,
                p.PatientUid,
                p.FullName,
                p.Age,
                p.Gender,
                p.MobileNumber,
                p.Allergies,
                p.Visits.OrderByDescending(v => v.VisitDate).Select(v => (DateTime?)v.VisitDate).FirstOrDefault()
            ))
            .ToListAsync(cancellationToken);

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
