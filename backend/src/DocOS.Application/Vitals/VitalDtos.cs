namespace DocOS.Application.Vitals;

public record VitalMasterDto(
    Guid Id,
    Guid? ClinicId,
    string Code,
    string DisplayName,
    string Unit,
    string InputType,
    string? PairGroup,
    decimal? NormalRangeMin,
    decimal? NormalRangeMax,
    int DefaultDisplayOrder,
    bool IsActive,
    bool IsCustom
);

public record ClinicVitalPreferenceDto(
    Guid Id,
    Guid VitalMasterId,
    string Code,
    string DisplayName,
    string Unit,
    string InputType,
    string? PairGroup,
    decimal? MasterRangeMin,
    decimal? MasterRangeMax,
    decimal? NormalRangeMinOverride,
    decimal? NormalRangeMaxOverride,
    decimal? EffectiveRangeMin,
    decimal? EffectiveRangeMax,
    bool IsEnabled,
    bool IsMandatory,
    int DisplayOrder,
    bool IsCustom
);

public record UpdateVitalPreferenceItem(
    Guid VitalMasterId,
    bool IsEnabled,
    bool IsMandatory,
    int DisplayOrder,
    decimal? NormalRangeMinOverride,
    decimal? NormalRangeMaxOverride
);

public record UpdateClinicVitalPreferencesRequest(
    List<UpdateVitalPreferenceItem> Preferences
);

public record CreateCustomVitalRequest(
    string Code,
    string DisplayName,
    string Unit,
    string InputType,
    string? PairGroup = null,
    decimal? NormalRangeMin = null,
    decimal? NormalRangeMax = null,
    int DisplayOrder = 0,
    bool IsMandatory = false
);

public record CreateGlobalVitalMasterRequest(
    string Code,
    string DisplayName,
    string Unit,
    string InputType,
    string? PairGroup = null,
    decimal? NormalRangeMin = null,
    decimal? NormalRangeMax = null,
    int DefaultDisplayOrder = 0
);

public record UpdateGlobalVitalMasterRequest(
    string DisplayName,
    string Unit,
    string InputType,
    string? PairGroup = null,
    decimal? NormalRangeMin = null,
    decimal? NormalRangeMax = null,
    int DefaultDisplayOrder = 0,
    bool IsActive = true
);

public record VisitVitalItemDto(
    Guid VitalMasterId,
    string Code,
    string DisplayName,
    string ValueText,
    decimal? ValueNumeric,
    string UnitSnapshot,
    bool IsAbnormal,
    string InputType,
    string? PairGroup,
    DateTime RecordedAt
);

public record RecordVisitVitalItemRequest(
    Guid? VitalMasterId,
    string? Code,
    string? ValueText,
    decimal? ValueNumeric
);

public record RecordVisitVitalsRequest(
    List<RecordVisitVitalItemRequest> Vitals
);
