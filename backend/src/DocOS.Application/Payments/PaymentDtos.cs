namespace DocOS.Application.Payments;

public record VisitPaymentDto(
    Guid Id,
    Guid VisitId,
    Guid ClinicId,
    decimal Amount,
    string Method,
    string? Reference,
    string CollectedByUserId,
    string CollectedByName,
    DateTime CollectedAt
);

public record RecordVisitPaymentRequest(
    decimal Amount,
    string Method,
    string? Reference
);

public record DailyCollectionStaffSummaryDto(
    string StaffId,
    string StaffName,
    decimal TotalCollected,
    decimal CashCollected,
    decimal UpiCollected,
    int TransactionsCount
);

public record DailyCollectionReportDto(
    DateTime Date,
    decimal TotalCash,
    decimal TotalUpi,
    decimal GrandTotal,
    int TotalTransactions,
    List<DailyCollectionStaffSummaryDto> StaffSummaries,
    List<VisitPaymentDto> Payments
);
