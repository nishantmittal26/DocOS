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

// B13 Catalog Administration & Plan Change Commands
public record ChangeClinicCatalogPlanCommand(Guid ClinicId, ChangeClinicPlanRequest Request) : IRequest<ClinicSubscriptionDetailDto>;

public record GetSubscriptionPlansAdminQuery : IRequest<List<SubscriptionPlanDto>>;

public record CreateSubscriptionPlanCommand(CreateSubscriptionPlanRequest Request) : IRequest<SubscriptionPlanDto>;

public record UpdateSubscriptionPlanCommand(Guid Id, UpdateSubscriptionPlanRequest Request) : IRequest<SubscriptionPlanDto>;

// B14 Sales Agent Management Commands
public record GetSalesAgentsQuery : IRequest<List<SalesAgentDto>>;

public record CreateSalesAgentCommand(CreateSalesAgentRequest Request) : IRequest<SalesAgentDto>;

public record UpdateSalesAgentStatusCommand(string UserId, bool IsActive) : IRequest<bool>;

