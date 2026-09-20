using DocOS.Application.Patients;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PatientsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<ActionResult<PatientDto>> CreatePatient([FromBody] CreatePatientRequest request)
    {
        var result = await _mediator.Send(new CreatePatientCommand(request));
        return CreatedAtAction(nameof(GetPatientById), new { id = result.Id }, result);
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<PatientSearchResultDto>>> SearchPatients([FromQuery] string? q)
    {
        var result = await _mediator.Send(new SearchPatientsQuery(q ?? string.Empty));
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PatientDto>> GetPatientById(Guid id)
    {
        var result = await _mediator.Send(new GetPatientByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }
}
