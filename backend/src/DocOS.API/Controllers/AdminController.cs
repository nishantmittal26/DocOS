using DocOS.Application.Subscriptions;
using DocOS.Application.Vitals;
using DocOS.Domain.Common;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("plans")]
    [Authorize(Roles = $"{Roles.PlatformAdmin},{Roles.SalesAgent}")]
    public async Task<ActionResult<List<SubscriptionPlanDto>>> GetPlans()
    {
        var result = await _mediator.Send(new GetSubscriptionPlansQuery());
        return Ok(result);
    }

    [HttpPost("onboard")]
    [Authorize(Roles = $"{Roles.PlatformAdmin},{Roles.SalesAgent}")]
    public async Task<ActionResult<OnboardClinicResponse>> OnboardClinic([FromBody] OnboardClinicRequest request)
    {
        var result = await _mediator.Send(new OnboardClinicCommand(request));
        return Ok(result);
    }

    [HttpGet("clinics")]
    [Authorize(Roles = $"{Roles.PlatformAdmin},{Roles.SalesAgent}")]
    public async Task<ActionResult<List<AdminClinicItemDto>>> GetClinics()
    {
        var result = await _mediator.Send(new GetAdminClinicsQuery());
        return Ok(result);
    }

    [HttpGet("clinics/{clinicId:guid}/subscription")]
    [Authorize(Roles = Roles.PlatformAdmin)]
    public async Task<ActionResult<ClinicSubscriptionDetailDto>> GetClinicSubscription(Guid clinicId)
    {
        var result = await _mediator.Send(new GetClinicSubscriptionDetailQuery(clinicId));
        return Ok(result);
    }

    [HttpPut("clinics/{clinicId:guid}/subscription")]
    [Authorize(Roles = Roles.PlatformAdmin)]
    public async Task<ActionResult<bool>> UpdateClinicSubscription(Guid clinicId, [FromBody] UpdateClinicSubscriptionRequest request)
    {
        var result = await _mediator.Send(new UpdateClinicSubscriptionCommand(clinicId, request));
        return Ok(result);
    }

    [HttpPost("clinics/{clinicId:guid}/subscription/topup")]
    [Authorize(Roles = Roles.PlatformAdmin)]
    public async Task<ActionResult<bool>> AddTopUpVisits(Guid clinicId, [FromBody] AddTopUpVisitsRequest request)
    {
        var result = await _mediator.Send(new AddTopUpVisitsCommand(clinicId, request.AdditionalVisits));
        return Ok(result);
    }

    [HttpPost("clinics/{clinicId:guid}/subscription/payments")]
    [Authorize(Roles = Roles.PlatformAdmin)]
    public async Task<ActionResult<bool>> RecordSubscriptionPayment(Guid clinicId, [FromBody] RecordSubscriptionPaymentRequest request)
    {
        var result = await _mediator.Send(new RecordSubscriptionPaymentCommand(clinicId, request));
        return Ok(result);
    }

    [HttpGet("masters/vitals")]
    [Authorize(Roles = Roles.PlatformAdmin)]
    public async Task<ActionResult<List<VitalMasterDto>>> GetGlobalVitals(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetGlobalVitalMastersQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("masters/vitals")]
    [Authorize(Roles = Roles.PlatformAdmin)]
    public async Task<ActionResult<VitalMasterDto>> CreateGlobalVital(
        [FromBody] CreateGlobalVitalMasterRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new CreateGlobalVitalMasterCommand(request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("masters/vitals/{id:guid}")]
    [Authorize(Roles = Roles.PlatformAdmin)]
    public async Task<ActionResult<VitalMasterDto>> UpdateGlobalVital(
        Guid id,
        [FromBody] UpdateGlobalVitalMasterRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(new UpdateGlobalVitalMasterCommand(id, request), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
