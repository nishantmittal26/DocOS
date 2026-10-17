using DocOS.Application.Auth;
using DocOS.Application.Auth.Commands;
using DocOS.Application.Common.Interfaces;
using DocOS.Application.Patients;
using DocOS.Application.Subscriptions;
using DocOS.Application.Visits;
using DocOS.Application.Vitals;
using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using DocOS.Infrastructure.Identity;
using DocOS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace DocOS.Tests;

public class Phase2BTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private SubscriptionPlanMaster SeedStarterPlan(ApplicationDbContext context)
    {
        var plan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "STARTER_TEST",
            PlanName = "Starter Test Plan",
            Tier = SubscriptionTiers.Starter,
            IsUnlimitedVisits = false,
            DefaultMonthlyVisits = 10,
            MaxDoctors = 1,
            MaxStaff = 2,
            PriceINR = 999m,
            BillingCycle = BillingCycles.Monthly,
            IsActive = true
        };
        context.SubscriptionPlans.Add(plan);
        context.SaveChanges();
        return plan;
    }

    private ClinicSubscription CreateTestSubscription(Guid clinicId, SubscriptionPlanMaster plan, Action<ClinicSubscription>? configure = null)
    {
        var subscription = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Status = SubscriptionStatuses.Active,
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(30),
            MonthlyVisitQuota = plan.DefaultMonthlyVisits,
            AdditionalTopUpVisits = 0
        };
        subscription.ApplyCatalogPlan(plan, IndiaTime.Now);
        configure?.Invoke(subscription);
        return subscription;
    }

    [Fact]
    public async Task SalesAgent_Can_Onboard_Clinic_And_Sees_Only_Own_Clinics()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var agent1Id = "sales-agent-1";
        var agent2Id = "sales-agent-2";

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns(agent1Id);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.SalesAgent)).Returns(true);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(false);

        var mockIdentityService = new Mock<IIdentityService>();
        mockIdentityService.Setup(i => i.CreateUserAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<IEnumerable<string>>(),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<decimal?>()))
            .ReturnsAsync((true, null, "doc-user-123"));
        mockIdentityService.Setup(i => i.GetDoctorNamesAsync(It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync(new Dictionary<string, string>());
        mockIdentityService.Setup(i => i.GetClinicDoctorsAsync(It.IsAny<Guid>()))
            .ReturnsAsync(new List<DocOS.Application.Auth.DoctorProfileDto>());

        var handler = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act 1: Onboard clinic as agent 1
        var onboardReq = new OnboardClinicRequest(
            ClinicName: "City Heart Clinic",
            Phone: "9876543210",
            Email: "dr.heart@city.com",
            Address: "123 MG Road",
            DoctorName: "Dr. Sharma",
            RegNumber: "MCI-12345",
            Qualifications: "MBBS, MD",
            Specialization: "Cardiology",
            ConsultationFee: 800m,
            ClinicTimings: "10am - 7pm",
            DoctorPassword: "Password@123",
            CatalogPlanId: plan.Id,
            IsTrial: false,
            MonthlyVisitQuotaOverride: null,
            IsUnlimitedOverride: false,
            LetterheadMarginTopMm: 60,
            PrintBottomMarginMm: 15,
            HideLetterheadOnPrint: false,
            SalesNotes: "Lead converted via doctor referral"
        );

        var response = await handler.Handle(new OnboardClinicCommand(onboardReq), CancellationToken.None);

        // Assert 1: Handover details generated
        response.ClinicName.Should().Be("City Heart Clinic");
        response.DoctorUserId.Should().Be("doc-user-123");
        response.InitialPassword.Should().Be("Password@123");
        response.MonthlyVisitQuota.Should().Be(10);
        response.SubscriptionStatus.Should().Be(SubscriptionStatuses.Active);

        // Verify Clinic in DB
        var savedClinic = await context.Clinics.Include(c => c.Subscription).FirstOrDefaultAsync(c => c.Id == response.ClinicId);
        savedClinic.Should().NotBeNull();
        savedClinic!.OnboardedByUserId.Should().Be(agent1Id);
        savedClinic.PatientIdPrefix.Should().Be("CITY");
        savedClinic.SalesNotes.Should().Be("Lead converted via doctor referral");
        response.PatientIdPrefix.Should().Be("CITY");
        savedClinic.Subscription.Should().NotBeNull();
        savedClinic.Subscription!.Status.Should().Be(SubscriptionStatuses.Active);

        // Act 2: Agent 1 queries clinics list
        var agent1Clinics = await handler.Handle(new GetAdminClinicsQuery(), CancellationToken.None);
        agent1Clinics.Should().HaveCount(1);
        agent1Clinics[0].ClinicName.Should().Be("City Heart Clinic");

        // Act 3: Agent 2 queries clinics list -> should be empty for agent 2
        mockCurrentUser.Setup(u => u.UserId).Returns(agent2Id);
        var agent2Clinics = await handler.Handle(new GetAdminClinicsQuery(), CancellationToken.None);
        agent2Clinics.Should().BeEmpty();

        // Act 4: PlatformAdmin queries clinics list -> sees all
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);
        var platformClinics = await handler.Handle(new GetAdminClinicsQuery(), CancellationToken.None);
        platformClinics.Should().HaveCount(1);
    }

    [Fact]
    public async Task Visit_Completion_Increments_VisitsConducted_Once()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var clinicId = Guid.NewGuid();
        var clinic = new Clinic { Id = clinicId, Name = "Alpha Clinic", Phone = "9999999999" };
        context.Clinics.Add(clinic);

        var subscription = CreateTestSubscription(clinicId, plan);
        context.ClinicSubscriptions.Add(subscription);

        var periodUsage = new ClinicPeriodUsage
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Subscription = subscription,
            PeriodStart = subscription.CurrentPeriodStart,
            PeriodEnd = subscription.CurrentPeriodEnd,
            VisitsConducted = 0
        };
        context.ClinicPeriodUsages.Add(periodUsage);

        var patient = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, FullName = "John Patient", MobileNumber = "9999999999", PatientUid = "DOC-001" };
        context.Patients.Add(patient);

        var visit = new Visit
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientId = patient.Id,
            DoctorId = "doctor-1",
            VisitDate = DateTime.UtcNow.Date,
            TokenNumber = 1,
            Status = VisitStatus.Waiting
        };
        context.Visits.Add(visit);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns("doctor-1");
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.Doctor)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        mockIdentityService.Setup(i => i.GetDoctorProfileAsync("doctor-1"))
            .ReturnsAsync(new DocOS.Application.Auth.DoctorProfileDto("doctor-1", "Dr. One", "MBBS", "REG1", "General", 500m));

        var visitHandlers = new VisitHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act 1: Complete visit with prescription
        var completeCmd1 = new CompleteConsultationCommand(new CompleteConsultationRequest(
            VisitId: visit.Id,
            DoctorId: "doctor-1",
            ChiefComplaints: "Fever",
            Diagnosis: "Viral fever",
            ClinicalNotes: "Rest and hydration",
            FollowUpDate: null,
            GeneralAdvice: "Drink plenty of water",
            Items: new List<PrescriptionItemDto>()
        ));

        await visitHandlers.Handle(completeCmd1, CancellationToken.None);

        // Assert 1: VisitsConducted incremented to 1
        var updatedUsage = await context.ClinicPeriodUsages.FirstOrDefaultAsync(u => u.ClinicId == clinicId);
        updatedUsage!.VisitsConducted.Should().Be(1);
        updatedUsage.LastVisitRecordedAt.Should().NotBeNull();

        // Act 2: Update prescription on already completed visit
        var completeCmd2 = new CompleteConsultationCommand(new CompleteConsultationRequest(
            VisitId: visit.Id,
            DoctorId: "doctor-1",
            ChiefComplaints: "Fever and mild cough",
            Diagnosis: "Viral fever",
            ClinicalNotes: "Added cough syrup",
            FollowUpDate: null,
            GeneralAdvice: "Drink warm water",
            Items: new List<PrescriptionItemDto>()
        ));

        await visitHandlers.Handle(completeCmd2, CancellationToken.None);

        // Assert 2: VisitsConducted remains 1 (did not double increment)
        updatedUsage = await context.ClinicPeriodUsages.FirstOrDefaultAsync(u => u.ClinicId == clinicId);
        updatedUsage!.VisitsConducted.Should().Be(1);
    }

    [Fact]
    public async Task Quota_Buffer_Allows_Tokens_And_Blocks_At_Hard_Cap()
    {
        // Arrange: Quota = 10. Buffer = 20. Total allowed with buffer = 30.
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Beta Clinic", Phone = "9999999999" });

        var subscription = CreateTestSubscription(clinicId, plan);
        context.ClinicSubscriptions.Add(subscription);

        // Period usage already at 25 visits (in buffer: 10 + 15)
        var periodUsage = new ClinicPeriodUsage
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Subscription = subscription,
            PeriodStart = subscription.CurrentPeriodStart,
            PeriodEnd = subscription.CurrentPeriodEnd,
            VisitsConducted = 25
        };
        context.ClinicPeriodUsages.Add(periodUsage);

        var patient1 = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, FullName = "Patient One", MobileNumber = "9999999991", PatientUid = "DOC-001" };
        var patient2 = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, FullName = "Patient Two", MobileNumber = "9999999992", PatientUid = "DOC-002" };
        context.Patients.AddRange(patient1, patient2);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns("receptionist-1");
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.Receptionist)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var visitHandlers = new VisitHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);
        var subHandlers = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act 1: Check quota status when in buffer (25 conducted on 10 quota)
        var quotaStatus = await subHandlers.Handle(new GetClinicQuotaStatusQuery(), CancellationToken.None);
        quotaStatus.IsWithinBuffer.Should().BeTrue();
        quotaStatus.RemainingBufferVisits.Should().Be(5); // 30 - 25 = 5
        quotaStatus.CanIssueTokens.Should().BeTrue();

        // Act 2: Check in patient while within buffer -> SUCCESS
        var addQueueResult = await visitHandlers.Handle(new AddToQueueCommand(patient1.Id, "doc-1"), CancellationToken.None);
        addQueueResult.TokenNumber.Should().Be(1);

        // Act 3: Now simulate that visits reached 30 (hard cap)
        periodUsage.VisitsConducted = 30;
        await context.SaveChangesAsync();

        // Act 4: Trying to check in patient at hard cap -> BLOCKED
        var actBlocked = () => visitHandlers.Handle(new AddToQueueCommand(patient2.Id, "doc-1"), CancellationToken.None);
        await actBlocked.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Monthly visit quota exceeded*");

        // Verify status marked QuotaExceeded
        var reloadedSub = await context.ClinicSubscriptions.FirstOrDefaultAsync(s => s.ClinicId == clinicId);
        reloadedSub!.Status.Should().Be(SubscriptionStatuses.QuotaExceeded);

        // But patient history is still completely readable!
        var history = await visitHandlers.Handle(new GetVisitHistoryQuery(), CancellationToken.None);
        history.Should().NotBeNull();
    }

    [Fact]
    public async Task TopUp_Visits_Increases_Quota_And_Restores_Status()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Gamma Clinic", Phone = "9999999999" });

        var subscription = CreateTestSubscription(clinicId, plan, s =>
        {
            s.Status = SubscriptionStatuses.QuotaExceeded;
            s.CurrentPeriodEnd = DateTime.UtcNow.AddDays(10);
        });
        context.ClinicSubscriptions.Add(subscription);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns("platform-admin");
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var subHandlers = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act: Add 250 top up visits
        var result = await subHandlers.Handle(new AddTopUpVisitsCommand(clinicId, 250), CancellationToken.None);
        result.Should().BeTrue();

        // Assert: Top up added and status restored to Active
        var updatedSub = await context.ClinicSubscriptions.FirstOrDefaultAsync(s => s.ClinicId == clinicId);
        updatedSub!.AdditionalTopUpVisits.Should().Be(250);
        updatedSub.TotalAllowedVisits.Should().Be(260); // 10 + 250
        updatedSub.Status.Should().Be(SubscriptionStatuses.Active);
    }

    [Fact]
    public async Task Suspended_Clinic_Blocks_New_Tokens_While_Preserving_History()
    {
        // Arrange: Subscription period ended past grace period
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Delta Clinic", Phone = "9999999999" });

        var subscription = CreateTestSubscription(clinicId, plan, s =>
        {
            s.Status = SubscriptionStatuses.Suspended;
            s.CurrentPeriodStart = DateTime.UtcNow.AddDays(-40);
            s.CurrentPeriodEnd = DateTime.UtcNow.AddDays(-10);
            s.GracePeriodDays = 5;
        });
        context.ClinicSubscriptions.Add(subscription);

        var patient = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, FullName = "Suspended Patient", MobileNumber = "9999999999", PatientUid = "DOC-001" };
        context.Patients.Add(patient);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.UserId).Returns("staff-1");
        mockCurrentUser.Setup(u => u.IsInRole(Roles.Receptionist)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var visitHandlers = new VisitHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act & Assert 1: New token issuance BLOCKED
        var act = () => visitHandlers.Handle(new AddToQueueCommand(patient.Id, "doc-1"), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Clinic subscription is suspended*");

        // Act & Assert 2: Past history query still SUCCEEDS
        var history = await visitHandlers.Handle(new GetVisitHistoryQuery(), CancellationToken.None);
        history.Should().NotBeNull();
    }

    [Fact]
    public async Task PlatformAdmin_GetClinicSubscriptionDetail_Auto_Provisions_Missing_Subscription()
    {
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Legacy Clinic Without Subscription", Phone = "9999999999" });
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var handlers = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        var detail = await handlers.Handle(new GetClinicSubscriptionDetailQuery(clinicId), CancellationToken.None);

        detail.ClinicName.Should().Be("Legacy Clinic Without Subscription");
        detail.CatalogPlanId.Should().Be(plan.Id);

        var saved = await context.ClinicSubscriptions.FirstOrDefaultAsync(s => s.ClinicId == clinicId);
        saved.Should().NotBeNull();
        saved!.CatalogPlanId.Should().Be(plan.Id);
    }

    [Fact]
    public async Task PlatformAdmin_Can_Record_SaaS_Payment_Invoice()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Epsilon Clinic", Phone = "9999999999" });

        var subscription = CreateTestSubscription(clinicId, plan);
        context.ClinicSubscriptions.Add(subscription);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns("platform-admin");
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var subHandlers = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act: Record payment invoice
        var paymentReq = new RecordSubscriptionPaymentRequest(
            InvoiceNumber: "INV-2026-0001",
            Amount: 999m,
            PaymentMethod: PaymentMethods.UPI,
            TransactionReference: "UPI/20261003/1234567890",
            PaymentDate: DateTime.UtcNow,
            Status: PaymentStatuses.Success
        );

        var result = await subHandlers.Handle(new RecordSubscriptionPaymentCommand(clinicId, paymentReq), CancellationToken.None);
        result.Should().BeTrue();

        // Assert: Invoice stored in DB
        var invoice = await context.SubscriptionPayments.FirstOrDefaultAsync(p => p.InvoiceNumber == "INV-2026-0001");
        invoice.Should().NotBeNull();
        invoice!.Amount.Should().Be(999m);
        invoice.PaymentMethod.Should().Be(PaymentMethods.UPI);
        invoice.TransactionReference.Should().Be("UPI/20261003/1234567890");

        // Act 2: Attempting duplicate invoice number should fail
        var duplicateAct = () => subHandlers.Handle(new RecordSubscriptionPaymentCommand(clinicId, paymentReq), CancellationToken.None);
        await duplicateAct.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*has already been recorded*");
    }

    [Fact]
    public async Task SearchPatients_Can_Filter_By_Doctor_And_Enrich_Queue_Status_With_Doctor_Name()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        var doc1Id = "doctor-1";
        var doc2Id = "doctor-2";

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.UserId).Returns("receptionist-1");

        var mockIdentityService = new Mock<IIdentityService>();
        mockIdentityService.Setup(i => i.GetDoctorNamesAsync(It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync(new Dictionary<string, string>
            {
                { doc1Id, "Dr. Ramesh Gupta" },
                { doc2Id, "Dr. Priya Sharma" }
            });

        // Patients
        var patient1 = new Patient
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientUid = "DOC-2026-0001",
            FullName = "Aarav Patel",
            Age = 35,
            Gender = Gender.Male,
            MobileNumber = "9988776655"
        };
        var patient2 = new Patient
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientUid = "DOC-2026-0002",
            FullName = "Ananya Singh",
            Age = 28,
            Gender = Gender.Female,
            MobileNumber = "9988776644"
        };
        context.Patients.AddRange(patient1, patient2);

        // Previous visits linking patient1 to doc1, patient2 to doc2
        context.Visits.Add(new Visit
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientId = patient1.Id,
            DoctorId = doc1Id,
            TokenNumber = 1,
            VisitDate = DateTime.UtcNow.Date.AddDays(-2),
            Status = VisitStatus.Completed
        });
        context.Visits.Add(new Visit
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientId = patient2.Id,
            DoctorId = doc2Id,
            TokenNumber = 1,
            VisitDate = DateTime.UtcNow.Date.AddDays(-1),
            Status = VisitStatus.Completed
        });

        // Today's active queue visit for patient 1 with doctor 1
        context.Visits.Add(new Visit
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientId = patient1.Id,
            DoctorId = doc1Id,
            TokenNumber = 5,
            VisitDate = DateTime.UtcNow.Date,
            Status = VisitStatus.Waiting
        });

        await context.SaveChangesAsync();

        var patientHandlers = new PatientHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act 1: Search filtered by doc1 -> Only patient 1 should be returned
        var doc1Patients = await patientHandlers.Handle(new SearchPatientsQuery(string.Empty, doc1Id), CancellationToken.None);
        doc1Patients.Should().HaveCount(1);
        doc1Patients[0].FullName.Should().Be("Aarav Patel");
        doc1Patients[0].LastDoctorId.Should().Be(doc1Id);
        doc1Patients[0].LastDoctorName.Should().Be("Dr. Ramesh Gupta");
        doc1Patients[0].TodayVisitDoctorId.Should().Be(doc1Id);
        doc1Patients[0].TodayVisitDoctorName.Should().Be("Dr. Ramesh Gupta");
        doc1Patients[0].TodayVisitTokenNumber.Should().Be(5);
        doc1Patients[0].TodayVisitStatus.Should().Be("Waiting");

        // Act 2: Search filtered by doc2 -> Only patient 2 should be returned
        var doc2Patients = await patientHandlers.Handle(new SearchPatientsQuery(string.Empty, doc2Id), CancellationToken.None);
        doc2Patients.Should().HaveCount(1);
        doc2Patients[0].FullName.Should().Be("Ananya Singh");
        doc2Patients[0].LastDoctorName.Should().Be("Dr. Priya Sharma");
        doc2Patients[0].TodayVisitDoctorId.Should().BeNull();

        // Act 3: Clinic-wide search without doctor filter -> returns all
        var allPatients = await patientHandlers.Handle(new SearchPatientsQuery(string.Empty), CancellationToken.None);
        allPatients.Should().HaveCount(2);
    }

    [Fact]
    public async Task InviteStaff_Enforces_Doctor_Seat_Limit_Per_Plan()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context); // MaxDoctors = 1

        var clinicId = Guid.NewGuid();
        var adminId = "admin-user-1";

        var subscription = CreateTestSubscription(clinicId, plan);
        context.ClinicSubscriptions.Add(subscription);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns(adminId);
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.ClinicAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        // 1 active doctor already exists
        mockIdentityService.Setup(i => i.GetClinicDoctorsAsync(clinicId))
            .ReturnsAsync(new List<DoctorProfileDto>
            {
                new("doc-1", "Dr. Initial", "MBBS", "REG-1", "GP", 500m)
            });
        mockIdentityService.Setup(i => i.CreateUserAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<IEnumerable<string>>(),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<decimal?>()))
            .ReturnsAsync((true, null, "new-user-id"));

        var mockJwtGenerator = new Mock<IJwtTokenGenerator>();
        var mockAuditService = new Mock<IAuditService>();

        var handler = new AuthCommandHandler(
            context,
            mockIdentityService.Object,
            mockJwtGenerator.Object,
            mockCurrentUser.Object,
            mockAuditService.Object
        );

        // Act 1: Attempt to invite a 2nd doctor when Starter plan max is 1 -> Should Throw
        var inviteDoctorReq = new InviteStaffRequest(
            FullName: "Dr. Second",
            Email: "second@clinic.com",
            Password: "Pass@123",
            Role: Roles.Doctor,
            Phone: "9876543210",
            Qualifications: "MBBS",
            RegNumber: "REG-2",
            Specialization: "Cardio",
            ConsultationFee: 700m
        );
        var actDoctor = () => handler.Handle(new InviteStaffCommand(inviteDoctorReq), CancellationToken.None);

        await actDoctor.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Doctor seat limit reached (1/1 doctor(s) assigned)*");

        // Act 2: Inviting a Nurse is NOT restricted by doctor seat limit
        var inviteNurseReq = new InviteStaffRequest(
            FullName: "Nurse Joy",
            Email: "nurse@clinic.com",
            Password: "Pass@123",
            Role: Roles.Nurse,
            Phone: "9876543211"
        );
        var nurseResult = await handler.Handle(new InviteStaffCommand(inviteNurseReq), CancellationToken.None);

        nurseResult.Should().BeTrue();
    }

    [Fact]
    public async Task InviteStaff_Allows_Additional_Doctor_When_MaxDoctorsOverride_Is_Configured()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context); // Default MaxDoctors = 1

        var clinicId = Guid.NewGuid();
        var adminId = "admin-user-1";

        var subscription = CreateTestSubscription(clinicId, plan, s => s.MaxDoctorsOverride = 2);
        context.ClinicSubscriptions.Add(subscription);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns(adminId);
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.ClinicAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        // Currently 1 active doctor
        var doctorList = new List<DoctorProfileDto>
        {
            new("doc-1", "Dr. Initial", "MBBS", "REG-1", "GP", 500m)
        };
        mockIdentityService.Setup(i => i.GetClinicDoctorsAsync(clinicId))
            .ReturnsAsync(() => doctorList);

        mockIdentityService.Setup(i => i.CreateUserAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<IEnumerable<string>>(),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<decimal?>()))
            .ReturnsAsync((true, null, "doc-2"));

        var mockJwtGenerator = new Mock<IJwtTokenGenerator>();
        var mockAuditService = new Mock<IAuditService>();

        var handler = new AuthCommandHandler(
            context,
            mockIdentityService.Object,
            mockJwtGenerator.Object,
            mockCurrentUser.Object,
            mockAuditService.Object
        );

        // Act 1: Inviting 2nd doctor succeeds because override is 2
        var inviteDoctor2 = new InviteStaffRequest(
            FullName: "Dr. Second",
            Email: "second@clinic.com",
            Password: "Pass@123",
            Role: Roles.Doctor,
            Phone: "9876543210",
            Qualifications: "MBBS",
            RegNumber: "REG-2",
            Specialization: "Cardio",
            ConsultationFee: 700m
        );
        var result2 = await handler.Handle(new InviteStaffCommand(inviteDoctor2), CancellationToken.None);
        result2.Should().BeTrue();

        // Now clinic has 2 active doctors
        doctorList.Add(new("doc-2", "Dr. Second", "MBBS", "REG-2", "Cardio", 700m));

        // Act 2: Attempting to invite 3rd doctor must throw because override of 2 is now reached
        var inviteDoctor3 = new InviteStaffRequest(
            FullName: "Dr. Third",
            Email: "third@clinic.com",
            Password: "Pass@123",
            Role: Roles.Doctor,
            Phone: "9876543212",
            Qualifications: "MBBS",
            RegNumber: "REG-3",
            Specialization: "Derma",
            ConsultationFee: 800m
        );
        var actDoctor3 = () => handler.Handle(new InviteStaffCommand(inviteDoctor3), CancellationToken.None);

        await actDoctor3.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Doctor seat limit reached (2/2 doctor(s) assigned)*");
    }

    [Fact]
    public async Task ToggleStaffActive_Enforces_Doctor_Seat_Limit_When_Activating_Doctor()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context); // MaxDoctors = 1

        var clinicId = Guid.NewGuid();
        var adminId = "admin-user-1";
        var inactiveDoctorId = "doc-inactive";

        var subscription = CreateTestSubscription(clinicId, plan);
        context.ClinicSubscriptions.Add(subscription);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns(adminId);
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.ClinicAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        // 1 active doctor already exists
        mockIdentityService.Setup(i => i.GetClinicDoctorsAsync(clinicId))
            .ReturnsAsync(new List<DoctorProfileDto>
            {
                new("doc-active", "Dr. Active", "MBBS", "REG-1", "GP", 500m)
            });

        // Staff list has 1 active doctor and 1 inactive doctor
        mockIdentityService.Setup(i => i.GetClinicStaffAsync(clinicId))
            .ReturnsAsync(new List<StaffMemberDto>
            {
                new("doc-active", "Dr. Active", "active@clinic.com", "9876543210", new List<string> { Roles.Doctor }, true, DateTime.UtcNow, "MBBS", "REG-1", "GP", 500m),
                new(inactiveDoctorId, "Dr. Inactive", "inactive@clinic.com", "9876543219", new List<string> { Roles.Doctor }, false, DateTime.UtcNow, "MBBS", "REG-2", "ENT", 600m)
            });

        mockIdentityService.Setup(i => i.SetUserActiveStatusAsync(inactiveDoctorId, clinicId, true))
            .ReturnsAsync((true, null));

        var mockJwtGenerator = new Mock<IJwtTokenGenerator>();
        var mockAuditService = new Mock<IAuditService>();

        var handler = new AuthCommandHandler(
            context,
            mockIdentityService.Object,
            mockJwtGenerator.Object,
            mockCurrentUser.Object,
            mockAuditService.Object
        );

        // Act 1: Activating inactive doctor when limit is 1/1 -> Throws
        var activateCommand = new ToggleStaffActiveCommand(new ToggleStaffActiveRequest(inactiveDoctorId, true));
        var act = () => handler.Handle(activateCommand, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cannot activate doctor: Doctor seat limit reached (1/1 doctor(s) assigned)*");

        // Act 2: If subscription has MaxDoctorsOverride = 2, activating succeeds
        subscription.MaxDoctorsOverride = 2;
        await context.SaveChangesAsync();

        var successResult = await handler.Handle(activateCommand, CancellationToken.None);
        successResult.Should().BeTrue();
        mockIdentityService.Verify(i => i.SetUserActiveStatusAsync(inactiveDoctorId, clinicId, true), Times.Once);
    }

    [Fact]
    public async Task ClinicQuotaStatus_Exposes_Used_And_Remaining_Prescription_Metrics()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context); // 10 monthly visits

        var clinicId = Guid.NewGuid();
        var clinic = new Clinic
        {
            Id = clinicId,
            Name = "Apollo Express",
            Phone = "9988776655",
            Address = "Connaught Place",
            CreatedAt = IndiaTime.Now,
            UpdatedAt = IndiaTime.Now
        };
        context.Clinics.Add(clinic);

        var subscription = CreateTestSubscription(clinicId, plan, s =>
        {
            s.MonthlyVisitQuota = 100;
            s.AdditionalTopUpVisits = 50;
            s.CurrentPeriodStart = IndiaTime.Now.AddDays(-10);
            s.CurrentPeriodEnd = IndiaTime.Now.AddDays(20);
        });
        context.ClinicSubscriptions.Add(subscription);

        var periodUsage = new ClinicPeriodUsage
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            SubscriptionId = subscription.Id,
            PeriodStart = subscription.CurrentPeriodStart,
            PeriodEnd = subscription.CurrentPeriodEnd,
            VisitsConducted = 42,
            LastVisitRecordedAt = IndiaTime.Now,
            CreatedAt = IndiaTime.Now,
            UpdatedAt = IndiaTime.Now
        };
        context.ClinicPeriodUsages.Add(periodUsage);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.Doctor)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var subHandlers = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act
        var status = await subHandlers.Handle(new GetClinicQuotaStatusQuery(), CancellationToken.None);

        // Assert: 100 base + 50 top-up = 150 total. 42 conducted -> 108 remaining.
        status.VisitsConducted.Should().Be(42);
        status.TotalAllowed.Should().Be(150);
        status.RemainingVisits.Should().Be(108);

        status.UsedPrescriptions.Should().Be(42);
        status.TotalAllowedPrescriptions.Should().Be(150);
        status.RemainingPrescriptions.Should().Be(108);
        status.IsUnlimited.Should().BeFalse();

        // Unlimited plan check
        subscription.IsUnlimitedVisits = true;
        await context.SaveChangesAsync();

        var unlimitedStatus = await subHandlers.Handle(new GetClinicQuotaStatusQuery(), CancellationToken.None);
        unlimitedStatus.IsUnlimited.Should().BeTrue();
        unlimitedStatus.UsedPrescriptions.Should().Be(42);
        unlimitedStatus.RemainingPrescriptions.Should().BeNull();
        unlimitedStatus.TotalAllowedPrescriptions.Should().BeNull();
    }

    [Fact]
    public async Task OnboardClinic_With_InstantDiscount_Sets_PriceOverride_And_DiscountAmount()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "PRO_MONTHLY",
            PlanName = "Pro Plan",
            Tier = "MultiDoctor",
            BillingCycle = BillingCycles.Monthly,
            PriceINR = 2499m,
            IsUnlimitedVisits = false,
            DefaultMonthlyVisits = 500,
            MaxDoctors = 3,
            MaxStaff = 10,
            HasCustomVitals = true,
            HasLabModule = true,
            IsActive = true
        };
        context.SubscriptionPlans.Add(plan);
        await context.SaveChangesAsync();

        var agentId = "agent-discount-1";
        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns(agentId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.SalesAgent)).Returns(true);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        mockIdentityService.Setup(s => s.CreateUserAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>(),
            It.IsAny<string[]>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<decimal?>()
        )).ReturnsAsync((true, null, "doc-user-discount"));

        var handler = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        var req = new OnboardClinicRequest(
            ClinicName: "Discount Health Clinic",
            Phone: "9876500000",
            Email: "dr.discount@health.com",
            Address: "100 High Street",
            DoctorName: "Dr. Verma",
            RegNumber: "MCI-99887",
            Qualifications: "MBBS",
            Specialization: "General Physician",
            ConsultationFee: 500m,
            ClinicTimings: "10am - 6pm",
            DoctorPassword: "Password@123",
            CatalogPlanId: plan.Id,
            IsTrial: false,
            MonthlyVisitQuotaOverride: null,
            IsUnlimitedOverride: false,
            LetterheadMarginTopMm: 60,
            PrintBottomMarginMm: 15,
            HideLetterheadOnPrint: false,
            SalesNotes: "Discount approved by sales manager",
            DiscountAmountINR: 500m
        );

        // Act
        var res = await handler.Handle(new OnboardClinicCommand(req), CancellationToken.None);

        // Assert response
        res.DiscountAmountINR.Should().Be(500m);
        res.PriceOverrideINR.Should().Be(1999m);
        res.EffectivePriceINR.Should().Be(1999m);

        // Assert database entity
        var savedSub = await context.ClinicSubscriptions.Include(s => s.CatalogPlan).FirstOrDefaultAsync(s => s.ClinicId == res.ClinicId);
        savedSub.Should().NotBeNull();
        savedSub!.DiscountAmountINR.Should().Be(500m);
        savedSub.PriceOverrideINR.Should().Be(1999m);
        savedSub.EffectivePriceINR.Should().Be(1999m);

        // Assert detail DTO
        var detail = await handler.Handle(new GetClinicSubscriptionDetailQuery(res.ClinicId), CancellationToken.None);
        detail.PriceINR.Should().Be(2499m);
        detail.DiscountAmountINR.Should().Be(500m);
        detail.PriceOverrideINR.Should().Be(1999m);
        detail.EffectivePriceINR.Should().Be(1999m);
    }

    [Fact]
    public async Task OnboardClinic_With_CustomPrice_Calculates_DiscountAmount()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "STARTER_CUSTOM",
            PlanName = "Starter Plan",
            Tier = "Starter",
            BillingCycle = BillingCycles.Monthly,
            PriceINR = 1000m,
            IsUnlimitedVisits = false,
            DefaultMonthlyVisits = 200,
            MaxDoctors = 1,
            MaxStaff = 2,
            HasCustomVitals = false,
            HasLabModule = false,
            IsActive = true
        };
        context.SubscriptionPlans.Add(plan);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns("agent-custom");
        mockCurrentUser.Setup(u => u.IsInRole(Roles.SalesAgent)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        mockIdentityService.Setup(s => s.CreateUserAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>(),
            It.IsAny<string[]>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<decimal?>()
        )).ReturnsAsync((true, null, "doc-user-custom"));

        var handler = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        var req = new OnboardClinicRequest(
            ClinicName: "Custom Price Clinic",
            Phone: "9876511111",
            Email: "dr.custom@health.com",
            Address: "200 Market Street",
            DoctorName: "Dr. Joshi",
            RegNumber: "MCI-77665",
            Qualifications: "MBBS",
            Specialization: "Family Medicine",
            ConsultationFee: 400m,
            ClinicTimings: "9am - 5pm",
            DoctorPassword: "Password@123",
            CatalogPlanId: plan.Id,
            IsTrial: false,
            MonthlyVisitQuotaOverride: null,
            IsUnlimitedOverride: false,
            LetterheadMarginTopMm: 60,
            PrintBottomMarginMm: 15,
            HideLetterheadOnPrint: false,
            SalesNotes: "Negotiated custom rate",
            CustomPriceINR: 750m
        );

        // Act
        var res = await handler.Handle(new OnboardClinicCommand(req), CancellationToken.None);

        // Assert response
        res.PriceOverrideINR.Should().Be(750m);
        res.DiscountAmountINR.Should().Be(250m);
        res.EffectivePriceINR.Should().Be(750m);
    }

    [Fact]
    public async Task B13_Editing_Catalog_Plan_Does_Not_Change_Existing_Clinic_Contract_Entitlements()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "PRO_ORIGINAL",
            PlanName = "Pro Original Plan",
            Tier = SubscriptionTiers.MultiDoctor,
            DefaultMonthlyVisits = 500,
            MaxDoctors = 5,
            MaxStaff = 10,
            PriceINR = 2499m,
            BillingCycle = BillingCycles.Monthly,
            HasCustomVitals = true,
            HasLabModule = true,
            IsActive = true
        };
        context.SubscriptionPlans.Add(plan);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Immutable Contract Clinic", Phone = "9988776655" });

        var subscription = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Status = SubscriptionStatuses.Active,
            CurrentPeriodStart = IndiaTime.Now,
            CurrentPeriodEnd = IndiaTime.Now.AddDays(30),
            MonthlyVisitQuota = 500,
            AdditionalTopUpVisits = 0
        };
        subscription.ApplyCatalogPlan(plan, IndiaTime.Now);
        context.ClinicSubscriptions.Add(subscription);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.UserId).Returns("doctor-1");
        mockCurrentUser.Setup(u => u.IsInRole(Roles.Doctor)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var handler = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Verify initial entitlements on contract
        var initialQuota = await handler.Handle(new GetClinicQuotaStatusQuery(), CancellationToken.None);
        initialQuota.HasLabModule.Should().BeTrue();
        initialQuota.HasCustomVitals.Should().BeTrue();
        initialQuota.PlanName.Should().Be("Pro Original Plan");
        initialQuota.EffectiveMaxDoctors.Should().Be(5);

        // Act: Catalog admin modifies the master catalog plan (drops labs, custom vitals, decreases max doctors, raises price)
        plan.PlanName = "Pro Deprecated";
        plan.HasLabModule = false;
        plan.HasCustomVitals = false;
        plan.MaxDoctors = 2;
        plan.PriceINR = 3999m;
        await context.SaveChangesAsync();

        // Assert: Existing clinic's contract snapshot is UNCHANGED!
        var quotaAfterCatalogEdit = await handler.Handle(new GetClinicQuotaStatusQuery(), CancellationToken.None);
        quotaAfterCatalogEdit.PlanName.Should().Be("Pro Original Plan");
        quotaAfterCatalogEdit.HasLabModule.Should().BeTrue();
        quotaAfterCatalogEdit.HasCustomVitals.Should().BeTrue();
        quotaAfterCatalogEdit.EffectiveMaxDoctors.Should().Be(5);

        // Vitals entitlement check also preserves entitlement from contract snapshot
        var vitalHandler = new VitalHandlers(context, mockCurrentUser.Object);
        var customVitalReq = new CreateCustomVitalRequest("RANDOM_BG", "Random Blood Sugar", "mg/dL", "Decimal", NormalRangeMin: 70, NormalRangeMax: 140);
        var createdVital = await vitalHandler.Handle(new CreateCustomVitalCommand(customVitalReq), CancellationToken.None);
        createdVital.Should().NotBeNull();
        createdVital.Code.Should().Be("RANDOM_BG");
    }

    [Fact]
    public async Task B13_ChangeClinicCatalogPlan_Copies_New_Snapshot_And_Sets_PlanAssignedAt_IST()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var starterPlan = SeedStarterPlan(context); // Price = 999, Visits = 10, MaxDoctors = 1

        var enterprisePlan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "ENTERPRISE_TEST",
            PlanName = "DocOS Hospital Enterprise",
            Tier = SubscriptionTiers.Enterprise,
            IsUnlimitedVisits = true,
            DefaultMonthlyVisits = null,
            MaxDoctors = 25,
            MaxStaff = 50,
            PriceINR = 29999m,
            BillingCycle = BillingCycles.Annual,
            HasCustomVitals = true,
            HasLabModule = true,
            IsActive = true
        };
        context.SubscriptionPlans.Add(enterprisePlan);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Upgrade Target Clinic", Phone = "9988776655" });

        var subscription = CreateTestSubscription(clinicId, starterPlan);
        subscription.PriceOverrideINR = 899m; // Existing custom override
        subscription.DiscountAmountINR = 100m;
        context.ClinicSubscriptions.Add(subscription);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var handler = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act: Platform admin runs Change plan to Enterprise
        var changeReq = new ChangeClinicPlanRequest(enterprisePlan.Id, "Upgraded to Enterprise annual package");
        var detail = await handler.Handle(new ChangeClinicCatalogPlanCommand(clinicId, changeReq), CancellationToken.None);

        // Assert: Contract snapshot reflects new plan
        detail.CatalogPlanId.Should().Be(enterprisePlan.Id);
        detail.PlanName.Should().Be("DocOS Hospital Enterprise");
        detail.PlanTier.Should().Be(SubscriptionTiers.Enterprise);
        detail.SubscribedHasLabModule.Should().BeTrue();
        detail.EffectiveHasLabModule.Should().BeTrue();
        detail.SubscribedHasCustomVitals.Should().BeTrue();
        detail.EffectiveMaxDoctors.Should().Be(25);
        detail.PriceINR.Should().Be(29999m); // SubscribedPriceINR baseline
        detail.EffectivePriceINR.Should().Be(899m); // PriceOverrideINR preserved
        detail.Notes.Should().Contain("Upgraded to Enterprise annual package");
        detail.PlanAssignedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task B13_PlatformAdmin_Can_Perform_Catalog_Plan_CRUD()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var handler = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // 1. Create a new plan
        var createReq = new CreateSubscriptionPlanRequest(
            PlanCode: "CUSTOM_TIER",
            PlanName: "Custom Specialized Clinic",
            Tier: "Specialty",
            IsUnlimitedVisits: false,
            DefaultMonthlyVisits: 750,
            MaxDoctors: 3,
            MaxStaff: 6,
            PriceINR: 1899m,
            BillingCycle: BillingCycles.Monthly,
            HasCustomVitals: true,
            HasLabModule: true,
            IsActive: true
        );

        var created = await handler.Handle(new CreateSubscriptionPlanCommand(createReq), CancellationToken.None);
        created.PlanCode.Should().Be("CUSTOM_TIER");
        created.PriceINR.Should().Be(1899m);

        // 2. Query admin plans list (includes inactive and active)
        var allPlans = await handler.Handle(new GetSubscriptionPlansAdminQuery(), CancellationToken.None);
        allPlans.Should().ContainSingle(p => p.PlanCode == "CUSTOM_TIER");

        // 3. Update the plan (deactivate and update price)
        var updateReq = new UpdateSubscriptionPlanRequest(
            PlanName: "Custom Specialized Clinic (Archived)",
            Tier: "Specialty",
            IsUnlimitedVisits: false,
            DefaultMonthlyVisits: 750,
            MaxDoctors: 3,
            MaxStaff: 6,
            PriceINR: 1999m,
            BillingCycle: BillingCycles.Monthly,
            HasCustomVitals: true,
            HasLabModule: true,
            IsActive: false // soft-deactivated
        );

        var updated = await handler.Handle(new UpdateSubscriptionPlanCommand(created.Id, updateReq), CancellationToken.None);
        updated.IsActive.Should().BeFalse();
        updated.PlanName.Should().Be("Custom Specialized Clinic (Archived)");
        updated.PriceINR.Should().Be(1999m);

        // 4. Regular GetSubscriptionPlansQuery (for onboarding picker) should filter out inactive plan
        var activePlans = await handler.Handle(new GetSubscriptionPlansQuery(), CancellationToken.None);
        activePlans.Should().NotContain(p => p.Id == created.Id);
    }

    [Fact]
    public async Task B14_PlatformAdmin_Can_Create_List_And_Toggle_SalesAgents()
    {
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var agentId = "sales-agent-b14";
        context.Clinics.Add(new Clinic
        {
            Id = Guid.NewGuid(),
            Name = "Onboarded By Agent Clinic",
            Phone = "9876543210",
            OnboardedByUserId = agentId
        });
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns("platform-admin-1");
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        mockIdentityService.Setup(i => i.CreateSalesAgentAsync(
            "rohan@docos.com", "Sales@2026", "Rohan Mehta", "9876501234"))
            .ReturnsAsync((true, null, agentId));

        mockIdentityService.Setup(i => i.GetUsersInRoleAsync(Roles.SalesAgent))
            .ReturnsAsync(new List<DocOS.Application.Auth.StaffMemberDto>
            {
                new(agentId, "Rohan Mehta", "rohan@docos.com", "9876501234",
                    new List<string> { Roles.SalesAgent }, true, IndiaTime.Now, null, null, null, null)
            });

        mockIdentityService.Setup(i => i.SetPlatformUserActiveStatusAsync(agentId, false))
            .ReturnsAsync((true, null));

        var handler = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // 1. Create Sales Agent with default password
        var created = await handler.Handle(new CreateSalesAgentCommand(new CreateSalesAgentRequest(
            FullName: "Rohan Mehta",
            Email: "rohan@docos.com",
            Password: null,
            PhoneNumber: "9876501234"
        )), CancellationToken.None);

        created.Id.Should().Be(agentId);
        created.FullName.Should().Be("Rohan Mehta");
        created.Email.Should().Be("rohan@docos.com");
        created.InitialPassword.Should().Be("Sales@2026");
        created.IsActive.Should().BeTrue();

        // 2. List Sales Agents -> includes OnboardedClinicsCount
        var agents = await handler.Handle(new GetSalesAgentsQuery(), CancellationToken.None);
        agents.Should().ContainSingle();
        agents[0].Id.Should().Be(agentId);
        agents[0].OnboardedClinicsCount.Should().Be(1);

        // 3. Deactivate Sales Agent
        var toggled = await handler.Handle(new UpdateSalesAgentStatusCommand(agentId, false), CancellationToken.None);
        toggled.Should().BeTrue();
    }

    [Fact]
    public async Task B14_SalesAgent_Cannot_Manage_SalesAgents_Or_ClinicSubscriptions()
    {
        using var context = CreateInMemoryDbContext();
        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns("sales-agent-only");
        mockCurrentUser.Setup(u => u.IsInRole(Roles.SalesAgent)).Returns(true);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(false);

        var mockIdentityService = new Mock<IIdentityService>();
        var handler = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            handler.Handle(new GetSalesAgentsQuery(), CancellationToken.None));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            handler.Handle(new CreateSalesAgentCommand(new CreateSalesAgentRequest("Agent Two", "two@docos.com")), CancellationToken.None));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            handler.Handle(new UpdateSalesAgentStatusCommand("any-id", false), CancellationToken.None));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            handler.Handle(new GetClinicSubscriptionDetailQuery(Guid.NewGuid()), CancellationToken.None));
    }
}

