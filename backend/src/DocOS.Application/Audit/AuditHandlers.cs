using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Audit;

public record GetAuditLogsQuery(Guid? ClinicId = null, string? Action = null, int Limit = 100) : IRequest<List<AuditLogDto>>;

public class AuditHandlers : IRequestHandler<GetAuditLogsQuery, List<AuditLogDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AuditHandlers(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<AuditLogDto>> Handle(GetAuditLogsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.AuditLogs.AsNoTracking();

        if (!_currentUser.IsInRole(Roles.PlatformAdmin))
        {
            var clinicId = _currentUser.ClinicId
                ?? throw new UnauthorizedAccessException("Clinic context is required");
            query = query.Where(a => a.ClinicId == clinicId);
        }
        else if (request.ClinicId.HasValue)
        {
            query = query.Where(a => a.ClinicId == request.ClinicId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Action))
        {
            var act = request.Action.Trim().ToUpperInvariant();
            query = query.Where(a => a.Action == act);
        }

        var limit = request.Limit > 0 && request.Limit <= 500 ? request.Limit : 100;

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .Select(a => new AuditLogDto(
                a.Id,
                a.ClinicId,
                a.UserId,
                a.Action,
                a.EntityName,
                a.EntityId,
                a.Timestamp,
                a.IpAddress,
                a.ChangesJson
            ))
            .ToListAsync(cancellationToken);

        return logs;
    }
}
