using DocOS.Application.Auth;
using DocOS.Application.Auth.Commands;
using DocOS.Application.Common.Interfaces;
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
    [Authorize(Roles = "Doctor")]
    public async Task<ActionResult<bool>> RegisterStaff([FromBody] RegisterStaffRequest request)
    {
        var result = await _mediator.Send(new RegisterStaffCommand(request));
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
            isAuthenticated = _currentUser.IsAuthenticated
        });
    }
}
