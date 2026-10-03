using DocOS.Domain.Common;
using DocOS.Application.Vitals;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class VitalsController : ControllerBase
{
    private readonly IMediator _mediator;

    public VitalsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("vitals/preferences")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor},{Roles.Nurse},{Roles.Receptionist}")]
    public async Task<ActionResult<List<ClinicVitalPreferenceDto>>> GetPreferences(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetClinicVitalPreferencesQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpPut("vitals/preferences")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<bool>> UpdatePreferences(
        [FromBody] UpdateClinicVitalPreferencesRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new UpdateClinicVitalPreferencesCommand(request), cancellationToken);
        return Ok(result);
    }

    [HttpPost("vitals/masters/custom")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<ClinicVitalPreferenceDto>> CreateCustomVital(
        [FromBody] CreateCustomVitalRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new CreateCustomVitalCommand(request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("visits/{visitId:guid}/vitals")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor},{Roles.Nurse},{Roles.Receptionist}")]
    public async Task<ActionResult<List<VisitVitalItemDto>>> GetVisitVitals(
        Guid visitId,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetVisitVitalsQuery(visitId), cancellationToken);
        return Ok(result);
    }

    [HttpPut("visits/{visitId:guid}/vitals")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor},{Roles.Nurse},{Roles.Receptionist}")]
    public async Task<ActionResult<DocOS.Application.Visits.VitalsDto>> RecordVisitVitals(
        Guid visitId,
        [FromBody] RecordVisitVitalsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new RecordVisitVitalsCommand(visitId, request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
