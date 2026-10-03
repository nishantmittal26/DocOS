namespace DocOS.Domain.Common;

public static class Roles
{
    public const string PlatformAdmin = "PlatformAdmin";
    public const string SalesAgent = "SalesAgent";
    public const string ClinicAdmin = "ClinicAdmin";
    public const string Doctor = "Doctor";
    public const string Nurse = "Nurse";
    public const string Receptionist = "Receptionist";

    public static readonly IReadOnlyList<string> All = new[]
    {
        PlatformAdmin,
        SalesAgent,
        ClinicAdmin,
        Doctor,
        Nurse,
        Receptionist
    };

    public static bool RequiresClinic(string role) =>
        role != PlatformAdmin && role != SalesAgent;
}
