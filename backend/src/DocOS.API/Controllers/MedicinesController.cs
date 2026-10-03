using DocOS.Application.Medicines;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MedicinesController : ControllerBase
{
    private readonly IMediator _mediator;

    public MedicinesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<MedicineDto>>> Search([FromQuery] string? q, [FromQuery] bool onlyFavorites = false)
    {
        var result = await _mediator.Send(new SearchMedicinesQuery(q ?? string.Empty, onlyFavorites));
        return Ok(result);
    }

    [HttpGet("favorites")]
    public async Task<ActionResult<List<MedicineDto>>> GetFavorites()
    {
        var result = await _mediator.Send(new GetDoctorFavoriteMedicinesQuery());
        return Ok(result);
    }

    [HttpPost("{id:guid}/toggle-favorite")]
    public async Task<ActionResult<ToggleMedicineFavoriteResponse>> ToggleFavorite(Guid id)
    {
        var result = await _mediator.Send(new ToggleMedicineFavoriteCommand(id));
        return Ok(result);
    }

    [HttpGet("custom")]
    public async Task<ActionResult<List<MedicineDto>>> GetCustomMedicines()
    {
        var result = await _mediator.Send(new GetCustomMedicinesQuery());
        return Ok(result);
    }

    [HttpPost("custom")]
    [Authorize(Roles = "Doctor")]
    public async Task<ActionResult<MedicineDto>> AddCustomMedicine([FromBody] AddCustomMedicineRequest request)
    {
        var result = await _mediator.Send(new AddCustomMedicineCommand(request));
        return Ok(result);
    }

    [HttpPut("custom/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<ActionResult<MedicineDto>> UpdateCustomMedicine(Guid id, [FromBody] UpdateCustomMedicineRequest request)
    {
        var result = await _mediator.Send(new UpdateCustomMedicineCommand(id, request));
        return Ok(result);
    }

    [HttpDelete("custom/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<ActionResult<bool>> DeleteCustomMedicine(Guid id)
    {
        var result = await _mediator.Send(new DeleteCustomMedicineCommand(id));
        return Ok(result);
    }
}
