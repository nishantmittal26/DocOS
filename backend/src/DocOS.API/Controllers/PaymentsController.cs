using DocOS.Application.Payments;
using DocOS.Domain.Common;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PaymentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("visit/{visitId:guid}")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Receptionist},{Roles.Doctor}")]
    public async Task<ActionResult<VisitPaymentDto>> RecordPayment(
        Guid visitId,
        [FromBody] RecordVisitPaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new RecordVisitPaymentCommand(visitId, request), cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("visit/{visitId:guid}")]
    public async Task<ActionResult<VisitPaymentDto>> GetPayment(Guid visitId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetVisitPaymentQuery(visitId), cancellationToken);
        if (result == null) return NotFound(new { message = "No payment recorded for this visit" });
        return Ok(result);
    }

    [HttpGet("daily-report")]
    [Authorize(Roles = $"{Roles.ClinicAdmin},{Roles.Receptionist},{Roles.Doctor}")]
    public async Task<ActionResult<DailyCollectionReportDto>> GetDailyReport(
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDailyCollectionReportQuery(date), cancellationToken);
        return Ok(result);
    }
}
