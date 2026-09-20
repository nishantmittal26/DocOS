namespace DocOS.Application.Common.Interfaces;

public interface ICurrentUserService
{
    string? UserId { get; }
    Guid? ClinicId { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
}
