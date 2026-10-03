namespace DocOS.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = IndiaTime.Now;
    public DateTime? UpdatedAt { get; set; }
}
