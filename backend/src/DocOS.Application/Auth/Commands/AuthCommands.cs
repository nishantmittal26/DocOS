using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Auth.Commands;

public record RegisterClinicCommand(RegisterClinicRequest Request) : IRequest<AuthResponse>;

public record LoginCommand(LoginRequest Request) : IRequest<AuthResponse>;

public record InviteStaffCommand(InviteStaffRequest Request) : IRequest<bool>;

public record ToggleStaffActiveCommand(ToggleStaffActiveRequest Request) : IRequest<bool>;

public record GetClinicStaffQuery() : IRequest<List<StaffMemberDto>>;

public record GetClinicDoctorsQuery() : IRequest<List<DoctorProfileDto>>;

public record GetDoctorProfileQuery(string? UserId = null) : IRequest<DoctorProfileDto?>;

public record UpdateDoctorProfileCommand(UpdateDoctorProfileRequest Request) : IRequest<bool>;

public record ChangePasswordCommand(ChangePasswordRequest Request) : IRequest<bool>;

public class AuthCommandHandler :
    IRequestHandler<RegisterClinicCommand, AuthResponse>,
    IRequestHandler<LoginCommand, AuthResponse>,
    IRequestHandler<InviteStaffCommand, bool>,
    IRequestHandler<ToggleStaffActiveCommand, bool>,
    IRequestHandler<GetClinicStaffQuery, List<StaffMemberDto>>,
    IRequestHandler<GetClinicDoctorsQuery, List<DoctorProfileDto>>,
    IRequestHandler<GetDoctorProfileQuery, DoctorProfileDto?>,
    IRequestHandler<UpdateDoctorProfileCommand, bool>,
    IRequestHandler<ChangePasswordCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IIdentityService _identityService;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public AuthCommandHandler(
        IApplicationDbContext context,
        IIdentityService identityService,
        IJwtTokenGenerator jwtTokenGenerator,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _identityService = identityService;
        _jwtTokenGenerator = jwtTokenGenerator;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    public async Task<AuthResponse> Handle(RegisterClinicCommand request, CancellationToken cancellationToken)
    {
        var req = request.Request;

        // 1. Create Clinic Entity (Phase 2A schema)
        var clinic = new Clinic
        {
            Name = req.ClinicName.Trim(),
            Phone = req.Phone.Trim(),
            Email = req.Email?.Trim(),
            Address = req.Address?.Trim(),
            ClinicTimings = req.ClinicTimings?.Trim(),
            LetterheadMarginTopMm = 60,
            PrintBottomMarginMm = 0,
            HideLetterheadOnPrint = false,
            PatientIdPrefix = "DOC",
            LastPatientSequence = 0
        };

        _context.Clinics.Add(clinic);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Create Doctor User Account with both ClinicAdmin and Doctor roles (Phase 2A)
        var roles = new[] { Roles.ClinicAdmin, Roles.Doctor };
        var (success, error, userId) = await _identityService.CreateUserAsync(
            email: req.Email?.Trim() ?? string.Empty,
            password: req.Password,
            fullName: req.DoctorName?.Trim() ?? string.Empty,
            clinicId: clinic.Id,
            roles: roles,
            qualifications: req.Qualifications?.Trim(),
            medicalCouncilRegistrationNumber: req.RegNumber?.Trim(),
            speciality: req.Specialization?.Trim(),
            consultationFee: req.ConsultationFee
        );

        if (!success)
        {
            throw new InvalidOperationException(error ?? "Failed to create clinic owner account");
        }

        // 3. Generate hardened JWT Token emitting each role
        var token = _jwtTokenGenerator.GenerateToken(userId, req.Email.Trim(), req.DoctorName.Trim(), clinic.Id, roles);

        return new AuthResponse(
            Token: token,
            UserId: userId,
            Email: req.Email.Trim(),
            FullName: req.DoctorName.Trim(),
            Roles: roles.ToList(),
            ClinicId: clinic.Id,
            ClinicName: clinic.Name,
            DoctorName: req.DoctorName.Trim(),
            RegNumber: req.RegNumber?.Trim(),
            Qualifications: req.Qualifications?.Trim(),
            Speciality: req.Specialization?.Trim(),
            LetterheadMarginTopMm: clinic.LetterheadMarginTopMm,
            PrintBottomMarginMm: clinic.PrintBottomMarginMm,
            HideLetterheadOnPrint: clinic.HideLetterheadOnPrint,
            ClinicTimings: clinic.ClinicTimings
        );
    }

    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var (success, error, userId, fullName, clinicId, roles) =
            await _identityService.ValidateCredentialsAsync(request.Request.Email.Trim(), request.Request.Password);

        if (!success)
        {
            throw new UnauthorizedAccessException(error ?? "Invalid email or password");
        }

        var token = _jwtTokenGenerator.GenerateToken(userId, request.Request.Email.Trim(), fullName, clinicId, roles);

        Clinic? clinic = null;
        if (clinicId.HasValue)
        {
            clinic = await _context.Clinics
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == clinicId.Value, cancellationToken);
        }

        var doctorProfile = await _identityService.GetDoctorProfileAsync(userId);

        await _auditService.LogAsync("LOGIN", "ApplicationUser", userId, clinicId: clinicId, userId: userId, cancellationToken: cancellationToken);

        return new AuthResponse(
            Token: token,
            UserId: userId,
            Email: request.Request.Email.Trim(),
            FullName: fullName,
            Roles: roles,
            ClinicId: clinicId,
            ClinicName: clinic?.Name,
            DoctorName: doctorProfile?.FullName ?? fullName,
            RegNumber: doctorProfile?.MedicalCouncilRegistrationNumber,
            Qualifications: doctorProfile?.Qualifications,
            Speciality: doctorProfile?.Speciality,
            LetterheadMarginTopMm: clinic?.LetterheadMarginTopMm ?? 60,
            PrintBottomMarginMm: clinic?.PrintBottomMarginMm ?? 0,
            HideLetterheadOnPrint: clinic?.HideLetterheadOnPrint ?? false,
            ClinicTimings: clinic?.ClinicTimings
        );
    }

    public async Task<bool> Handle(InviteStaffCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsInRole(Roles.ClinicAdmin) || !_currentUserService.ClinicId.HasValue)
        {
            throw new UnauthorizedAccessException("Only clinic administrators can invite clinic staff");
        }

        var clinicId = _currentUserService.ClinicId.Value;
        var role = request.Request.Role.Trim();

        // Enforce supported staff roles
        if (role != Roles.Doctor && role != Roles.Nurse && role != Roles.Receptionist)
        {
            throw new InvalidOperationException($"Invalid staff role '{role}'. Allowed roles: Doctor, Nurse, Receptionist.");
        }

        // Enforce doctor seat limit when inviting a doctor
        if (role == Roles.Doctor)
        {
            var sub = await _context.ClinicSubscriptions
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(s => s.ClinicId == clinicId, cancellationToken);

            var maxDoctors = sub?.EffectiveMaxDoctors ?? 1;
            var currentDoctors = await _identityService.GetClinicDoctorsAsync(clinicId);

            if (currentDoctors.Count >= maxDoctors)
            {
                throw new InvalidOperationException(
                    $"Doctor seat limit reached ({currentDoctors.Count}/{maxDoctors} doctor(s) assigned). Upgrade your subscription plan or contact support to increase your doctor seat limit.");
            }
        }

        var (success, error, _) = await _identityService.CreateUserAsync(
            email: request.Request.Email.Trim(),
            password: request.Request.Password,
            fullName: request.Request.FullName.Trim(),
            clinicId: clinicId,
            roles: new[] { role },
            qualifications: request.Request.Qualifications?.Trim(),
            medicalCouncilRegistrationNumber: request.Request.RegNumber?.Trim(),
            speciality: request.Request.Specialization?.Trim(),
            consultationFee: request.Request.ConsultationFee
        );

        if (!success)
        {
            throw new InvalidOperationException(error ?? "Failed to invite staff account");
        }

        return true;
    }

    public async Task<bool> Handle(ToggleStaffActiveCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsInRole(Roles.ClinicAdmin) || !_currentUserService.ClinicId.HasValue)
        {
            throw new UnauthorizedAccessException("Only clinic administrators can manage staff status");
        }

        // Prevent self-deactivation: A user must not deactivate their own active account
        if (string.Equals(request.Request.UserId, _currentUserService.UserId, StringComparison.OrdinalIgnoreCase) && !request.Request.IsActive)
        {
            throw new InvalidOperationException("You cannot deactivate your own account.");
        }

        var clinicId = _currentUserService.ClinicId.Value;

        // If activating a doctor, verify that the doctor seat limit is not exceeded
        if (request.Request.IsActive)
        {
            var staffList = await _identityService.GetClinicStaffAsync(clinicId);
            var targetStaff = staffList.FirstOrDefault(s => string.Equals(s.Id, request.Request.UserId, StringComparison.OrdinalIgnoreCase));
            if (targetStaff != null && targetStaff.Roles.Contains(Roles.Doctor) && !targetStaff.IsActive)
            {
                var sub = await _context.ClinicSubscriptions
                    .Include(s => s.Plan)
                    .FirstOrDefaultAsync(s => s.ClinicId == clinicId, cancellationToken);

                var maxDoctors = sub?.EffectiveMaxDoctors ?? 1;
                var currentDoctors = await _identityService.GetClinicDoctorsAsync(clinicId);

                if (currentDoctors.Count >= maxDoctors)
                {
                    throw new InvalidOperationException(
                        $"Cannot activate doctor: Doctor seat limit reached ({currentDoctors.Count}/{maxDoctors} doctor(s) assigned). Upgrade your subscription plan or contact support to increase your doctor seat limit.");
                }
            }
        }

        var (success, error) = await _identityService.SetUserActiveStatusAsync(
            request.Request.UserId,
            clinicId,
            request.Request.IsActive
        );

        if (!success)
        {
            throw new InvalidOperationException(error ?? "Failed to update staff status");
        }

        return true;
    }

    public async Task<List<StaffMemberDto>> Handle(GetClinicStaffQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUserService.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to view staff");

        return await _identityService.GetClinicStaffAsync(clinicId);
    }

    public async Task<List<DoctorProfileDto>> Handle(GetClinicDoctorsQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUserService.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to view clinic doctors");

        return await _identityService.GetClinicDoctorsAsync(clinicId);
    }

    public async Task<DoctorProfileDto?> Handle(GetDoctorProfileQuery request, CancellationToken cancellationToken)
    {
        var targetUserId = request.UserId ?? _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(targetUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated");
        }

        return await _identityService.GetDoctorProfileAsync(targetUserId);
    }

    public async Task<bool> Handle(UpdateDoctorProfileCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new UnauthorizedAccessException("User is not authenticated");
        }

        var req = request.Request;
        var (success, error) = await _identityService.UpdateDoctorProfileAsync(
            userId,
            req.FullName.Trim(),
            req.Qualifications?.Trim(),
            req.MedicalCouncilRegistrationNumber?.Trim(),
            req.Speciality?.Trim(),
            req.ConsultationFee
        );

        if (!success)
        {
            throw new InvalidOperationException(error ?? "Failed to update doctor profile");
        }

        return true;
    }

    public async Task<bool> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(_currentUserService.UserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated");
        }

        var (success, error) = await _identityService.ChangePasswordAsync(
            _currentUserService.UserId,
            request.Request.CurrentPassword,
            request.Request.NewPassword
        );

        if (!success)
        {
            throw new InvalidOperationException(error ?? "Failed to change password");
        }

        return true;
    }
}
