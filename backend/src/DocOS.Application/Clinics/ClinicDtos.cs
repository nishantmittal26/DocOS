namespace DocOS.Application.Clinics;

public record UpdateClinicLetterheadRequest(
    string ClinicName,
    string Phone,
    string? Email,
    string? Address,
    string? LogoUrl,
    int LetterheadMarginTopMm,
    int PrintBottomMarginMm,
    bool HideLetterheadOnPrint,
    string? ClinicTimings
);

public record ClinicProfileDto(
    Guid Id,
    string Name,
    string Phone,
    string? Email,
    string? Address,
    string? LogoUrl,
    int LetterheadMarginTopMm,
    int PrintBottomMarginMm,
    bool HideLetterheadOnPrint,
    string? ClinicTimings,
    string PatientIdPrefix,
    int TotalPatientsRegistered
);
