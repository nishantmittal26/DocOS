using DocOS.Application.Auth;
using DocOS.Application.Auth.Commands;
using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Common;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public AuthController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpPost("register-clinic")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> RegisterClinic([FromBody] RegisterClinicRequest request)
    {
        var result = await _mediator.Send(new RegisterClinicCommand(request));
        return Ok(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var result = await _mediator.Send(new LoginCommand(request));
        return Ok(result);
    }

    [HttpPost("register-staff")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<bool>> RegisterStaff([FromBody] InviteStaffRequest request)
    {
        var result = await _mediator.Send(new InviteStaffCommand(request));
        return Ok(result);
    }

    [HttpPost("staff/invite")]
    [Authorize(Roles = $"{Roles.ClinicAdmin}")]
    public async Task<ActionResult<bool>> InviteStaff([FromBody] InviteStaffRequest request)
    {
        var result = await _mediator.Send(new InviteStaffCommand(request));
        return Ok(result);
    }

    [HttpPost("staff/toggle-active")]
    [Authorize(Roles = $"{Roles.ClinicAdmin}")]
    public async Task<ActionResult<bool>> ToggleStaffActive([FromBody] ToggleStaffActiveRequest request)
    {
        var result = await _mediator.Send(new ToggleStaffActiveCommand(request));
        return Ok(result);
    }

    [HttpGet("staff")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<List<StaffMemberDto>>> GetClinicStaff()
    {
        var result = await _mediator.Send(new GetClinicStaffQuery());
        return Ok(result);
    }

    [HttpGet("doctors")]
    [Authorize]
    public async Task<ActionResult<List<DoctorProfileDto>>> GetClinicDoctors()
    {
        var result = await _mediator.Send(new GetClinicDoctorsQuery());
        return Ok(result);
    }

    [HttpGet("doctor-profile")]
    [Authorize]
    public async Task<ActionResult<DoctorProfileDto?>> GetDoctorProfile([FromQuery] string? userId)
    {
        var result = await _mediator.Send(new GetDoctorProfileQuery(userId));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPut("doctor-profile")]
    [Authorize(Roles = $"{Roles.Doctor},{Roles.ClinicAdmin}")]
    public async Task<ActionResult<bool>> UpdateDoctorProfile([FromBody] UpdateDoctorProfileRequest request)
    {
        var result = await _mediator.Send(new UpdateDoctorProfileCommand(request));
        return Ok(result);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<bool>> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var result = await _mediator.Send(new ChangePasswordCommand(request));
        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public ActionResult GetCurrentUser()
    {
        return Ok(new
        {
            userId = _currentUser.UserId,
            clinicId = _currentUser.ClinicId,
            role = _currentUser.Role,
            roles = _currentUser.Roles,
            isAuthenticated = _currentUser.IsAuthenticated
        });
    }
}
