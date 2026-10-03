using DocOS.Application.Visits;
using DocOS.Domain.Entities;

namespace DocOS.Application.Vitals;

public static class VitalsMapper
{
    public static VitalsDto? MapToVitalsDto(IEnumerable<VisitVitals>? vitals)
    {
        if (vitals == null) return null;
        var list = vitals.ToList();
        if (list.Count == 0) return null;

        int? sysBp = (int?)list.FirstOrDefault(v => v.VitalMaster?.Code == "BP_SYS")?.ValueNumeric;
        int? diaBp = (int?)list.FirstOrDefault(v => v.VitalMaster?.Code == "BP_DIA")?.ValueNumeric;
        int? pulse = (int?)list.FirstOrDefault(v => v.VitalMaster?.Code == "PULSE")?.ValueNumeric;
        decimal? temp = list.FirstOrDefault(v => v.VitalMaster?.Code == "TEMP_F")?.ValueNumeric;
        int? spo2 = (int?)list.FirstOrDefault(v => v.VitalMaster?.Code == "SPO2")?.ValueNumeric;
        decimal? weight = list.FirstOrDefault(v => v.VitalMaster?.Code == "WEIGHT")?.ValueNumeric;
        decimal? height = list.FirstOrDefault(v => v.VitalMaster?.Code == "HEIGHT")?.ValueNumeric;
        decimal? bmi = list.FirstOrDefault(v => v.VitalMaster?.Code == "BMI")?.ValueNumeric;
        string? sugar = list.FirstOrDefault(v => v.VitalMaster?.Code == "SUGAR")?.ValueText;

        var items = list.Select(v => new VisitVitalItemDto(
            v.VitalMasterId,
            v.VitalMaster?.Code ?? string.Empty,
            v.VitalMaster?.DisplayName ?? string.Empty,
            v.ValueText,
            v.ValueNumeric,
            v.UnitSnapshot,
            v.IsAbnormal,
            v.VitalMaster?.InputType ?? "Text",
            v.VitalMaster?.PairGroup,
            v.RecordedAt
        )).ToList();

        bool hasAbnormal = list.Any(v => v.IsAbnormal);

        return new VitalsDto(
            sysBp,
            diaBp,
            pulse,
            temp,
            spo2,
            weight,
            height,
            bmi,
            sugar,
            items,
            hasAbnormal
        );
    }
}
