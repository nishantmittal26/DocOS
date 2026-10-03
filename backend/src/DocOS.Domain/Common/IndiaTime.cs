namespace DocOS.Domain.Common;

/// <summary>
/// India Standard Time (Asia/Kolkata, UTC+5:30). DocOS persists clinic-facing
/// <c>datetime2</c> values as IST wall-clock (Unspecified kind), not UTC.
/// </summary>
public static class IndiaTime
{
    private static readonly TimeZoneInfo Ist = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");

    /// <summary>Current date and time in IST for database columns and business logic.</summary>
    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);

    /// <summary>Calendar date in IST (for VisitDate and queue "today").</summary>
    public static DateTime Today => Now.Date;

    /// <summary>Inclusive start and exclusive end of one IST calendar day.</summary>
    public static (DateTime StartInclusive, DateTime EndExclusive) DayRange(DateTime istCalendarDate)
    {
        var start = istCalendarDate.Date;
        return (start, start.AddDays(1));
    }

    public static DateTime ToIst(DateTime value)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
        return TimeZoneInfo.ConvertTimeFromUtc(utc, Ist);
    }
}
