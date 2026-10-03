using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Payments;

public record RecordVisitPaymentCommand(Guid VisitId, RecordVisitPaymentRequest Request) : IRequest<VisitPaymentDto>;
public record GetVisitPaymentQuery(Guid VisitId) : IRequest<VisitPaymentDto?>;
public record GetDailyCollectionReportQuery(DateTime? Date = null) : IRequest<DailyCollectionReportDto>;

public class PaymentHandlers :
    IRequestHandler<RecordVisitPaymentCommand, VisitPaymentDto>,
    IRequestHandler<GetVisitPaymentQuery, VisitPaymentDto?>,
    IRequestHandler<GetDailyCollectionReportQuery, DailyCollectionReportDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IIdentityService _identityService;
    private readonly IAuditService _auditService;

    public PaymentHandlers(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IIdentityService identityService,
        IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _identityService = identityService;
        _auditService = auditService;
    }

    public async Task<VisitPaymentDto> Handle(RecordVisitPaymentCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User context is required");

        var visit = await _context.Visits
            .Include(v => v.Payment)
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Visit not found in current clinic");

        var method = request.Request.Method.Trim();
        if (!method.Equals("Cash", StringComparison.OrdinalIgnoreCase) &&
            !method.Equals("UPI", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Payment method must be either 'Cash' or 'UPI'");
        }

        string action;
        VisitPayment payment;
        if (visit.Payment != null)
        {
            action = "UPDATE";
            payment = visit.Payment;
            payment.Amount = request.Request.Amount;
            payment.Method = method;
            payment.Reference = string.IsNullOrWhiteSpace(request.Request.Reference) ? null : request.Request.Reference.Trim();
            payment.CollectedByUserId = userId;
            payment.CollectedAt = DateTime.UtcNow;
            payment.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            action = "CREATE";
            payment = new VisitPayment
            {
                VisitId = visit.Id,
                ClinicId = clinicId,
                Amount = request.Request.Amount,
                Method = method,
                Reference = string.IsNullOrWhiteSpace(request.Request.Reference) ? null : request.Request.Reference.Trim(),
                CollectedByUserId = userId,
                CollectedAt = DateTime.UtcNow
            };
            _context.VisitPayments.Add(payment);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action,
            nameof(VisitPayment),
            payment.Id.ToString(),
            clinicId: clinicId,
            userId: userId,
            cancellationToken: cancellationToken);

        var staffMembers = await _identityService.GetClinicStaffAsync(clinicId);
        var staffMember = staffMembers.FirstOrDefault(s => s.Id == userId);
        var staffName = staffMember?.FullName ?? "Staff";

        return new VisitPaymentDto(
            payment.Id,
            payment.VisitId,
            payment.ClinicId,
            payment.Amount,
            payment.Method,
            payment.Reference,
            payment.CollectedByUserId,
            staffName,
            payment.CollectedAt
        );
    }

    public async Task<VisitPaymentDto?> Handle(GetVisitPaymentQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var payment = await _context.VisitPayments
            .FirstOrDefaultAsync(p => p.VisitId == request.VisitId && p.ClinicId == clinicId, cancellationToken);

        if (payment == null) return null;

        var staffMembers = await _identityService.GetClinicStaffAsync(clinicId);
        var staffMember = staffMembers.FirstOrDefault(s => s.Id == payment.CollectedByUserId);
        var staffName = staffMember?.FullName ?? "Staff";

        return new VisitPaymentDto(
            payment.Id,
            payment.VisitId,
            payment.ClinicId,
            payment.Amount,
            payment.Method,
            payment.Reference,
            payment.CollectedByUserId,
            staffName,
            payment.CollectedAt
        );
    }

    public async Task<DailyCollectionReportDto> Handle(GetDailyCollectionReportQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var targetDate = (request.Date ?? DateTime.UtcNow).Date;
        var nextDate = targetDate.AddDays(1);

        var payments = await _context.VisitPayments
            .Where(p => p.ClinicId == clinicId && p.CollectedAt >= targetDate && p.CollectedAt < nextDate)
            .OrderByDescending(p => p.CollectedAt)
            .ToListAsync(cancellationToken);

        var staffMembers = await _identityService.GetClinicStaffAsync(clinicId);
        var staffMap = staffMembers.ToDictionary(s => s.Id, s => s.FullName);

        var paymentDtos = payments.Select(p => new VisitPaymentDto(
            p.Id,
            p.VisitId,
            p.ClinicId,
            p.Amount,
            p.Method,
            p.Reference,
            p.CollectedByUserId,
            staffMap.TryGetValue(p.CollectedByUserId, out var name) ? name : "Staff",
            p.CollectedAt
        )).ToList();

        decimal totalCash = payments.Where(p => p.Method.Equals("Cash", StringComparison.OrdinalIgnoreCase)).Sum(p => p.Amount);
        decimal totalUpi = payments.Where(p => p.Method.Equals("UPI", StringComparison.OrdinalIgnoreCase)).Sum(p => p.Amount);
        decimal grandTotal = totalCash + totalUpi;

        var staffSummaries = payments
            .GroupBy(p => p.CollectedByUserId)
            .Select(g => new DailyCollectionStaffSummaryDto(
                g.Key,
                staffMap.TryGetValue(g.Key, out var name) ? name : "Staff",
                g.Sum(p => p.Amount),
                g.Where(p => p.Method.Equals("Cash", StringComparison.OrdinalIgnoreCase)).Sum(p => p.Amount),
                g.Where(p => p.Method.Equals("UPI", StringComparison.OrdinalIgnoreCase)).Sum(p => p.Amount),
                g.Count()
            ))
            .ToList();

        return new DailyCollectionReportDto(
            targetDate,
            totalCash,
            totalUpi,
            grandTotal,
            payments.Count,
            staffSummaries,
            paymentDtos
        );
    }
}
