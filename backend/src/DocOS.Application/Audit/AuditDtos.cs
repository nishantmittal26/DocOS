namespace DocOS.Application.Audit;

public record AuditLogDto(
    Guid Id,
    Guid? ClinicId,
    string? UserId,
    string Action,
    string EntityName,
    string EntityId,
    DateTime Timestamp,
    string? IpAddress,
    string? ChangesJson
);
