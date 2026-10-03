using DocOS.Application.Clinics;
using DocOS.Domain.Common;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClinicsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ClinicsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("profile")]
    public async Task<ActionResult<ClinicProfileDto>> GetProfile()
    {
        var result = await _mediator.Send(new GetClinicProfileQuery());
        return Ok(result);
    }

    [HttpPut("letterhead")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<ClinicProfileDto>> UpdateLetterhead([FromBody] UpdateClinicLetterheadRequest request)
    {
        var result = await _mediator.Send(new UpdateClinicLetterheadCommand(request));
        return Ok(result);
    }

    [HttpGet("subscription/current")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor},{Roles.Nurse},{Roles.Receptionist}")]
    public async Task<ActionResult<DocOS.Application.Subscriptions.ClinicQuotaStatusDto>> GetCurrentSubscriptionQuota()
    {
        var result = await _mediator.Send(new DocOS.Application.Subscriptions.GetClinicQuotaStatusQuery());
        return Ok(result);
    }
}
