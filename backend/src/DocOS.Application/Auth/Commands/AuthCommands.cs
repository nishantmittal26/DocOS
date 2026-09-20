using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Auth.Commands;

public record RegisterClinicCommand(RegisterClinicRequest Request) : IRequest<AuthResponse>;

public record LoginCommand(LoginRequest Request) : IRequest<AuthResponse>;

public record RegisterStaffCommand(RegisterStaffRequest Request) : IRequest<bool>;

public class AuthCommandHandler :
    IRequestHandler<RegisterClinicCommand, AuthResponse>,
    IRequestHandler<LoginCommand, AuthResponse>,
    IRequestHandler<RegisterStaffCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IIdentityService _identityService;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly ICurrentUserService _currentUserService;

    public AuthCommandHandler(
        IApplicationDbContext context,
        IIdentityService identityService,
        IJwtTokenGenerator jwtTokenGenerator,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _identityService = identityService;
        _jwtTokenGenerator = jwtTokenGenerator;
        _currentUserService = currentUserService;
    }

    public async Task<AuthResponse> Handle(RegisterClinicCommand request, CancellationToken cancellationToken)
    {
        var req = request.Request;

        // 1. Create Clinic Entity
        var clinic = new Clinic
        {
            Name = req.ClinicName,
            DoctorName = req.DoctorName,
            RegNumber = req.RegNumber,
            Qualifications = req.Qualifications,
            Specialization = req.Specialization,
            Phone = req.Phone,
            Email = req.Email,
            Address = req.Address,
            LetterheadMarginTopMm = 60,
            PatientIdPrefix = "DOC",
            LastPatientSequence = 0
        };

        _context.Clinics.Add(clinic);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Create Doctor User Account
        var (success, error, userId) = await _identityService.CreateUserAsync(
            req.Email, req.Password, req.DoctorName, clinic.Id, "Doctor");

        if (!success)
        {
            throw new InvalidOperationException(error ?? "Failed to create doctor account");
        }

        // 3. Generate JWT Token
        var token = _jwtTokenGenerator.GenerateToken(userId, req.Email, req.DoctorName, clinic.Id, "Doctor");

        return new AuthResponse(
            Token: token,
            UserId: userId,
            Email: req.Email,
            FullName: req.DoctorName,
            Role: "Doctor",
            ClinicId: clinic.Id,
            ClinicName: clinic.Name,
            DoctorName: clinic.DoctorName,
            RegNumber: clinic.RegNumber,
            Qualifications: clinic.Qualifications,
            LetterheadMarginTopMm: clinic.LetterheadMarginTopMm
        );
    }

    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var (success, error, userId, fullName, clinicId, role) =
            await _identityService.ValidateCredentialsAsync(request.Request.Email, request.Request.Password);

        if (!success)
        {
            throw new UnauthorizedAccessException(error ?? "Invalid email or password");
        }

        var clinic = await _context.Clinics
            .FirstOrDefaultAsync(c => c.Id == clinicId, cancellationToken);

        if (clinic == null)
        {
            throw new InvalidOperationException("Associated clinic not found");
        }

        var token = _jwtTokenGenerator.GenerateToken(userId, request.Request.Email, fullName, clinicId, role);

        return new AuthResponse(
            Token: token,
            UserId: userId,
            Email: request.Request.Email,
            FullName: fullName,
            Role: role,
            ClinicId: clinicId,
            ClinicName: clinic.Name,
            DoctorName: clinic.DoctorName,
            RegNumber: clinic.RegNumber,
            Qualifications: clinic.Qualifications,
            LetterheadMarginTopMm: clinic.LetterheadMarginTopMm
        );
    }

    public async Task<bool> Handle(RegisterStaffCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.Role != "Doctor" || _currentUserService.ClinicId == null)
        {
            throw new UnauthorizedAccessException("Only doctors can register clinic staff");
        }

        var (success, error, _) = await _identityService.CreateUserAsync(
            request.Request.Email,
            request.Request.Password,
            request.Request.FullName,
            _currentUserService.ClinicId.Value,
            request.Request.Role ?? "Receptionist"
        );

        if (!success)
        {
            throw new InvalidOperationException(error ?? "Failed to register staff account");
        }

        return true;
    }
}
