using DocOS.Application.Advice;
using DocOS.Domain.Common;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdviceController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdviceController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("templates")]
    public async Task<ActionResult<List<AdviceTemplateDto>>> GetTemplates(
        [FromQuery] string? category,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetClinicAdviceTemplatesQuery(category), cancellationToken);
        return Ok(result);
    }

    [HttpPost("templates")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<AdviceTemplateDto>> CreateTemplate(
        [FromBody] CreateAdviceTemplateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new CreateClinicAdviceTemplateCommand(request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("templates/{id:guid}")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<AdviceTemplateDto>> UpdateTemplate(
        Guid id,
        [FromBody] UpdateAdviceTemplateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new UpdateClinicAdviceTemplateCommand(id, request), cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("templates/{id:guid}")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Doctor}")]
    public async Task<ActionResult<bool>> DeleteTemplate(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new DeleteClinicAdviceTemplateCommand(id), cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
