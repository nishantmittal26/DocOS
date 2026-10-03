using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace DocOS.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AuditService> _logger;

    public AuditService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<AuditService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task LogAsync(
        string action,
        string entityName,
        string entityId,
        Guid? clinicId = null,
        string? userId = null,
        string? ipAddress = null,
        string? changesJson = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var auditLog = new AuditLog
            {
                ClinicId = clinicId ?? _currentUserService.ClinicId,
                UserId = userId ?? _currentUserService.UserId,
                Action = action.ToUpperInvariant(),
                EntityName = entityName,
                EntityId = entityId,
                Timestamp = IndiaTime.Now,
                IpAddress = ipAddress,
                ChangesJson = changesJson
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit logging should not crash the primary clinical flow if DB error occurs
            _logger.LogError(ex, "Failed to record audit log for Action: {Action}, Entity: {EntityName}, Id: {EntityId}",
                action, entityName, entityId);
        }
    }
}
