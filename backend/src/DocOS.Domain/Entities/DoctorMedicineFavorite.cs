using DocOS.Domain.Common;

namespace DocOS.Domain.Entities;

public class DoctorMedicineFavorite : BaseEntity
{
    public string UserId { get; set; } = string.Empty; // AspNetUsers.Id (Doctor)
    public Guid MedicineId { get; set; }
    public Medicine Medicine { get; set; } = null!;
}
