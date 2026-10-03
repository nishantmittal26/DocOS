namespace DocOS.Application.Advice;

public record AdviceTemplateDto(
    Guid Id,
    Guid? ClinicId,
    string Category,
    string Title,
    string InstructionsText,
    bool IsActive,
    bool IsCustom
);

public record CreateAdviceTemplateRequest(
    string Category,
    string Title,
    string InstructionsText
);

public record UpdateAdviceTemplateRequest(
    string Category,
    string Title,
    string InstructionsText,
    bool IsActive
);

public record PrescriptionAdviceDto(
    Guid Id,
    Guid? AdviceTemplateId,
    string AdviceText,
    int DisplayOrder
);
