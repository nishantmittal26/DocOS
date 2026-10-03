using DocOS.Application.Visits;
using DocOS.Domain.Common;
using DocOS.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

public record AssignDoctorRequest(string DoctorId);
public record UpdateStatusRequest(VisitStatus Status, string? DoctorId = null);

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
        var result = await _mediator.Send(new AddToQueueCommand(request.PatientId, request.DoctorId));
        return Ok(result);
    }

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<bool>> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var result = await _mediator.Send(new UpdateVisitStatusCommand(id, request.Status, request.DoctorId));
        return Ok(result);
    }

    [HttpPut("{id:guid}/assign-doctor")]
    public async Task<ActionResult<bool>> AssignDoctor(Guid id, [FromBody] AssignDoctorRequest request)
    {
        var result = await _mediator.Send(new AssignDoctorCommand(id, request.DoctorId));
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
    public async Task<ActionResult<List<VisitQueueDto>>> GetTodayQueue([FromQuery] string? doctorId = null)
    {
        var result = await _mediator.Send(new GetTodayQueueQuery(doctorId));
        return Ok(result);
    }

    [HttpGet("history")]
    public async Task<ActionResult<List<VisitQueueDto>>> GetVisitHistory(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? search,
        [FromQuery] VisitStatus? status,
        [FromQuery] string? doctorId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var result = await _mediator.Send(new GetVisitHistoryQuery(fromDate, toDate, search, status, doctorId, page, pageSize));
        return Ok(result);
    }

    [HttpPut("vitals")]
    public async Task<ActionResult<bool>> RecordVitals([FromBody] RecordVitalsRequest request)
    {
        var result = await _mediator.Send(new RecordVitalsCommand(request));
        return Ok(result);
    }

    [HttpPost("complete")]
    [Authorize(Roles = $"{Roles.Doctor},{Roles.ClinicAdmin}")]
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

    [HttpPost("prescriptions/{prescriptionId:guid}/share-token")]
    public async Task<ActionResult<GenerateShareTokenResponse>> GenerateShareToken(
        Guid prescriptionId,
        [FromQuery] int expiryDays = 7,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _mediator.Send(new GeneratePrescriptionShareTokenCommand(prescriptionId, expiryDays), cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("prescriptions/{prescriptionId:guid}/mark-printed")]
    public async Task<ActionResult<bool>> MarkPrescriptionPrinted(
        Guid prescriptionId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _mediator.Send(new MarkPrescriptionPrintedCommand(prescriptionId), cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
