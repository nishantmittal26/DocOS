using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Clinics;

public record GetClinicProfileQuery : IRequest<ClinicProfileDto>;

public record UpdateClinicLetterheadCommand(UpdateClinicLetterheadRequest Request) : IRequest<ClinicProfileDto>;

public class ClinicHandlers :
    IRequestHandler<GetClinicProfileQuery, ClinicProfileDto>,
    IRequestHandler<UpdateClinicLetterheadCommand, ClinicProfileDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ClinicHandlers(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<ClinicProfileDto> Handle(GetClinicProfileQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic records");

        var clinic = await _context.Clinics
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Clinic not found");

        var totalPatients = await _context.Patients
            .CountAsync(p => p.ClinicId == clinicId, cancellationToken);

        return new ClinicProfileDto(
            clinic.Id,
            clinic.Name,
            clinic.Phone,
            clinic.Email,
            clinic.Address,
            clinic.LogoUrl,
            clinic.LetterheadMarginTopMm,
            clinic.PrintBottomMarginMm,
            clinic.HideLetterheadOnPrint,
            clinic.ClinicTimings,
            clinic.PatientIdPrefix,
            totalPatients
        );
    }

    public async Task<ClinicProfileDto> Handle(UpdateClinicLetterheadCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to access clinic records");

        if (!_currentUser.IsInRole(Roles.ClinicAdmin) && !_currentUser.IsInRole(Roles.Doctor))
        {
            throw new UnauthorizedAccessException("Only clinic administrators or doctors can update clinic settings");
        }

        var clinic = await _context.Clinics
            .FirstOrDefaultAsync(c => c.Id == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Clinic not found");

        var req = request.Request;
        clinic.Name = req.ClinicName.Trim();
        clinic.Phone = req.Phone.Trim();
        clinic.Email = req.Email?.Trim();
        clinic.Address = req.Address?.Trim();
        clinic.LogoUrl = req.LogoUrl;
        clinic.LetterheadMarginTopMm = Math.Max(0, req.LetterheadMarginTopMm);
        clinic.PrintBottomMarginMm = Math.Max(0, req.PrintBottomMarginMm);
        clinic.HideLetterheadOnPrint = req.HideLetterheadOnPrint;
        clinic.ClinicTimings = req.ClinicTimings?.Trim();
        clinic.UpdatedAt = IndiaTime.Now;

        await _context.SaveChangesAsync(cancellationToken);

        var totalPatients = await _context.Patients
            .CountAsync(p => p.ClinicId == clinicId, cancellationToken);

        return new ClinicProfileDto(
            clinic.Id,
            clinic.Name,
            clinic.Phone,
            clinic.Email,
            clinic.Address,
            clinic.LogoUrl,
            clinic.LetterheadMarginTopMm,
            clinic.PrintBottomMarginMm,
            clinic.HideLetterheadOnPrint,
            clinic.ClinicTimings,
            clinic.PatientIdPrefix,
            totalPatients
        );
    }
}
