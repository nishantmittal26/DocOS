namespace DocOS.Application.Labs;

public record LabTestMasterDto(
    Guid Id,
    Guid? ClinicId,
    string TestCode,
    string TestName,
    string Category,
    string? SampleType,
    bool FastingRequired,
    bool IsActive,
    bool IsCustom
);

public record LabTestPanelDto(
    Guid Id,
    Guid ClinicId,
    string Name,
    bool IsActive,
    List<LabTestMasterDto> Tests
);

public record CreateLabTestRequest(
    string TestCode,
    string TestName,
    string Category,
    string? SampleType,
    bool FastingRequired
);

public record UpdateLabTestRequest(
    string TestCode,
    string TestName,
    string Category,
    string? SampleType,
    bool FastingRequired,
    bool IsActive
);

public record CreateLabPanelRequest(
    string Name,
    List<Guid> TestIds
);

public record UpdateLabPanelRequest(
    string Name,
    bool IsActive,
    List<Guid> TestIds
);

public record PrescriptionLabOrderDto(
    Guid Id,
    Guid LabTestMasterId,
    string TestCode,
    string TestName,
    string Category,
    string? SampleType,
    bool FastingRequired,
    string? SpecialInstructions,
    string Status
);
