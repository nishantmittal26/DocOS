namespace DocOS.Domain.Common;

public static class PatientIdPrefixRules
{
    private const string FallbackPrefix = "DOC";
    private const int DefaultLength = 4;
    public const int MaxLength = 20;

    /// <summary>First four letters (A–Z) from the clinic name in order; pad with X if fewer than four; DOC if none.</summary>
    public static string DeriveFromClinicName(string clinicName)
    {
        var letters = new string(clinicName.Where(char.IsLetter).ToArray()).ToUpperInvariant();
        if (letters.Length >= DefaultLength)
        {
            return letters[..DefaultLength];
        }

        if (letters.Length > 0)
        {
            return letters.PadRight(DefaultLength, 'X');
        }

        return FallbackPrefix;
    }

    /// <summary>Uses explicit prefix when provided; otherwise derives from clinic name.</summary>
    public static string Resolve(string? requestedPrefix, string clinicName)
    {
        if (!string.IsNullOrWhiteSpace(requestedPrefix))
        {
            var sanitized = new string(requestedPrefix.Trim().Where(char.IsLetter).ToArray()).ToUpperInvariant();
            if (sanitized.Length == 0)
            {
                throw new InvalidOperationException("Patient ID prefix must contain at least one letter (A–Z).");
            }

            if (sanitized.Length > MaxLength)
            {
                sanitized = sanitized[..MaxLength];
            }

            return sanitized;
        }

        return DeriveFromClinicName(clinicName);
    }
}
