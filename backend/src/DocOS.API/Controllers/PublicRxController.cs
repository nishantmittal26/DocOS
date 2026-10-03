using System.Collections.Concurrent;
using DocOS.Application.Visits;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocOS.API.Controllers;

[ApiController]
[Route("api/public/rx")]
[AllowAnonymous]
public class PublicRxController : ControllerBase
{
    private readonly IMediator _mediator;
    // Simple sliding-window rate limit: max 60 requests per minute per IP address
    private static readonly ConcurrentDictionary<string, (int Count, DateTime WindowStart)> _rateLimits = new();

    public PublicRxController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{token}")]
    public async Task<ActionResult<PrescriptionDetailDto>> GetPublicPrescription(string token, CancellationToken cancellationToken)
    {
        // Rate limiting check
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var now = DateTime.UtcNow;
        var limitEntry = _rateLimits.AddOrUpdate(
            ip,
            (1, now),
            (key, old) => now - old.WindowStart < TimeSpan.FromMinutes(1)
                ? (old.Count + 1, old.WindowStart)
                : (1, now)
        );

        if (limitEntry.Count > 60)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { message = "Too many requests. Please try again in a minute." });
        }

        var result = await _mediator.Send(new GetPublicPrescriptionQuery(token), cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = "Prescription not found or the shared link has expired." });
        }

        return Ok(result);
    }
}
