namespace DocOS.Domain.Common;

public static class SubscriptionTiers
{
    public const string Starter = "Starter";
    public const string MultiDoctor = "MultiDoctor";
    public const string Enterprise = "Enterprise";

    public static readonly IReadOnlyList<string> All = new[] { Starter, MultiDoctor, Enterprise };
}

public static class BillingCycles
{
    public const string Monthly = "Monthly";
    public const string Quarterly = "Quarterly";
    public const string Annual = "Annual";

    public static readonly IReadOnlyList<string> All = new[] { Monthly, Quarterly, Annual };
}

public static class SubscriptionStatuses
{
    public const string Trial = "Trial";
    public const string Active = "Active";
    public const string GracePeriod = "GracePeriod";
    public const string QuotaExceeded = "QuotaExceeded";
    public const string Suspended = "Suspended";

    public static readonly IReadOnlyList<string> All = new[] { Trial, Active, GracePeriod, QuotaExceeded, Suspended };
}

public static class PaymentMethods
{
    public const string UPI = "UPI";
    public const string Card = "Card";
    public const string NetBanking = "NetBanking";
    public const string Cash = "Cash";
    public const string Cheque = "Cheque";

    public static readonly IReadOnlyList<string> All = new[] { UPI, Card, NetBanking, Cash, Cheque };
}

public static class PaymentStatuses
{
    public const string Success = "Success";
    public const string Pending = "Pending";
    public const string Failed = "Failed";

    public static readonly IReadOnlyList<string> All = new[] { Success, Pending, Failed };
}
