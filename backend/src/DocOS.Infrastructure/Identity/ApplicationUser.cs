using Microsoft.AspNetCore.Identity;

namespace DocOS.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public Guid ClinicId { get; set; }
    public string Role { get; set; } = "Doctor"; // "Doctor" or "Receptionist"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
