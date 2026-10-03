using Microsoft.AspNetCore.Identity;

using DocOS.Domain.Common;

namespace DocOS.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public Guid? ClinicId { get; set; }
    public string? Qualifications { get; set; }
    public string? MedicalCouncilRegistrationNumber { get; set; }
    public string? Speciality { get; set; }
    public decimal? ConsultationFee { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = IndiaTime.Now;
}
