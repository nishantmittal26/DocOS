using DocOS.Domain.Common;
using DocOS.Domain.Entities;

namespace DocOS.Application.Visits;

internal static class VisitDateQuery
{
    public static IQueryable<Visit> WhereOnIstCalendarDay(
        IQueryable<Visit> query,
        Guid clinicId,
        DateTime istCalendarDate)
    {
        var (start, end) = IndiaTime.DayRange(istCalendarDate);
        return query.Where(v => v.ClinicId == clinicId && v.VisitDate >= start && v.VisitDate < end);
    }

    public static bool IsOnIstCalendarDay(DateTime visitDate, DateTime istCalendarDate)
    {
        var (start, end) = IndiaTime.DayRange(istCalendarDate);
        return visitDate >= start && visitDate < end;
    }
}
