namespace DocOS.Domain.Enums;

public enum UserRole
{
    Doctor,
    Receptionist
}

public enum Gender
{
    Male,
    Female,
    Other
}

public enum VisitStatus
{
    Waiting,
    InConsultation,
    Completed,
    Cancelled
}

public enum DosageTiming
{
    AfterFood,
    BeforeFood,
    WithFood,
    Bedtime,
    EmptyStomach
}

public enum DosageForm
{
    Tablet,
    Capsule,
    Syrup,
    Injection,
    Ointment,
    Drops,
    Inhaler,
    Powder,
    Lotion,
    Other
}
