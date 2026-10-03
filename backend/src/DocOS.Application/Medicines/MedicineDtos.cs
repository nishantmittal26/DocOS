using DocOS.Domain.Enums;

namespace DocOS.Application.Medicines;

public record MedicineDto(
    Guid Id,
    string BrandName,
    string SaltComposition,
    DosageForm Form,
    string Strength,
    string? Manufacturer,
    bool IsCustom,
    string? DefaultDosage = null,
    DosageTiming? DefaultTiming = null,
    bool IsFavorite = false
);

public record AddCustomMedicineRequest(
    string BrandName,
    string SaltComposition,
    DosageForm Form,
    string Strength,
    string? Manufacturer,
    string? DefaultDosage = null,
    DosageTiming? DefaultTiming = null
);

public record UpdateCustomMedicineRequest(
    string BrandName,
    string SaltComposition,
    DosageForm Form,
    string Strength,
    string? Manufacturer,
    string? DefaultDosage = null,
    DosageTiming? DefaultTiming = null
);

public record ToggleMedicineFavoriteResponse(
    Guid MedicineId,
    bool IsFavorite
);
