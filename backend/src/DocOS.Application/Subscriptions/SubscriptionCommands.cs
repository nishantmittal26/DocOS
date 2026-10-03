using MediatR;

namespace DocOS.Application.Subscriptions;

public record OnboardClinicCommand(OnboardClinicRequest Request) : IRequest<OnboardClinicResponse>;

public record UpdateClinicSubscriptionCommand(Guid ClinicId, UpdateClinicSubscriptionRequest Request) : IRequest<bool>;

public record AddTopUpVisitsCommand(Guid ClinicId, int AdditionalVisits) : IRequest<bool>;

public record RecordSubscriptionPaymentCommand(Guid ClinicId, RecordSubscriptionPaymentRequest Request) : IRequest<bool>;

public record GetSubscriptionPlansQuery : IRequest<List<SubscriptionPlanDto>>;

public record GetAdminClinicsQuery : IRequest<List<AdminClinicItemDto>>;

public record GetClinicSubscriptionDetailQuery(Guid ClinicId) : IRequest<ClinicSubscriptionDetailDto>;

public record GetClinicQuotaStatusQuery : IRequest<ClinicQuotaStatusDto>;
