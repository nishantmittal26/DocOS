using DocOS.Domain.Enums;

namespace DocOS.Application.Medicines;

public record MedicineDto(
    Guid Id,
    string BrandName,
    string SaltComposition,
    DosageForm Form,
    string Strength,
    string? Manufacturer,
    bool IsCustom
);

public record AddCustomMedicineRequest(
    string BrandName,
    string SaltComposition,
    DosageForm Form,
    string Strength,
    string? Manufacturer
);
