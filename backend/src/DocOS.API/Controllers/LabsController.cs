using DocOS.Application.Labs;
using DocOS.Domain.Common;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LabsController : ControllerBase
{
    private readonly IMediator _mediator;

    public LabsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("tests")]
    public async Task<ActionResult<List<LabTestMasterDto>>> GetTests(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new GetClinicLabTestsQuery(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpPost("tests")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<LabTestMasterDto>> CreateTest(
        [FromBody] CreateLabTestRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new CreateClinicLabTestCommand(request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("tests/{id:guid}")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<LabTestMasterDto>> UpdateTest(
        Guid id,
        [FromBody] UpdateLabTestRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new UpdateClinicLabTestCommand(id, request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("panels")]
    public async Task<ActionResult<List<LabTestPanelDto>>> GetPanels(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new GetClinicLabPanelsQuery(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpPost("panels")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<LabTestPanelDto>> CreatePanel(
        [FromBody] CreateLabPanelRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new CreateClinicLabPanelCommand(request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("panels/{id:guid}")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<LabTestPanelDto>> UpdatePanel(
        Guid id,
        [FromBody] UpdateLabPanelRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new UpdateClinicLabPanelCommand(id, request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("panels/{id:guid}")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<bool>> DeletePanel(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new DeleteClinicLabPanelCommand(id), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
