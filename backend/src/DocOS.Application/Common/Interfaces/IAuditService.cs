namespace DocOS.Application.Common.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        string action,
        string entityName,
        string entityId,
        Guid? clinicId = null,
        string? userId = null,
        string? ipAddress = null,
        string? changesJson = null,
        CancellationToken cancellationToken = default);
}
