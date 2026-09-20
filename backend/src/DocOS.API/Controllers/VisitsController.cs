using DocOS.Application.Visits;
using DocOS.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VisitsController : ControllerBase
{
    private readonly IMediator _mediator;

    public VisitsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("queue")]
    public async Task<ActionResult<VisitQueueDto>> AddToQueue([FromBody] AddToQueueRequest request)
    {
        var result = await _mediator.Send(new AddToQueueCommand(request.PatientId));
        return Ok(result);
    }

    [HttpDelete("queue/{visitId:guid}")]
    public async Task<ActionResult<bool>> RemoveFromQueue(Guid visitId)
    {
        var result = await _mediator.Send(new RemoveFromQueueCommand(visitId));
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<bool>> DeleteVisit(Guid id)
    {
        var result = await _mediator.Send(new DeleteVisitCommand(id));
        return Ok(result);
    }

    [HttpGet("queue/today")]
    public async Task<ActionResult<List<VisitQueueDto>>> GetTodayQueue()
    {
        var result = await _mediator.Send(new GetTodayQueueQuery());
        return Ok(result);
    }

    [HttpGet("history")]
    public async Task<ActionResult<List<VisitQueueDto>>> GetVisitHistory(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? search,
        [FromQuery] VisitStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var result = await _mediator.Send(new GetVisitHistoryQuery(fromDate, toDate, search, status, page, pageSize));
        return Ok(result);
    }

    [HttpPut("vitals")]
    public async Task<ActionResult<bool>> RecordVitals([FromBody] RecordVitalsRequest request)
    {
        var result = await _mediator.Send(new RecordVitalsCommand(request));
        return Ok(result);
    }

    [HttpPost("complete")]
    [Authorize(Roles = "Doctor")]
    public async Task<ActionResult<PrescriptionDetailDto>> CompleteConsultation([FromBody] CompleteConsultationRequest request)
    {
        var result = await _mediator.Send(new CompleteConsultationCommand(request));
        return Ok(result);
    }

    [HttpGet("{id:guid}/prescription")]
    public async Task<ActionResult<PrescriptionDetailDto>> GetPrescription(Guid id)
    {
        var result = await _mediator.Send(new GetPrescriptionQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }
}
