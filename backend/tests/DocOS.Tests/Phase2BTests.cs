using DocOS.Application.Common.Interfaces;
using DocOS.Application.Patients;
using DocOS.Application.Subscriptions;
using DocOS.Application.Visits;
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
            PlanId: plan.Id,
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

        var subscription = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatuses.Active,
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(30),
            MonthlyVisitQuota = 10,
            AdditionalTopUpVisits = 0
        };
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

        var subscription = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatuses.Active,
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(30),
            MonthlyVisitQuota = 10,
            AdditionalTopUpVisits = 0
        };
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

        var subscription = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatuses.QuotaExceeded,
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(10),
            MonthlyVisitQuota = 10,
            AdditionalTopUpVisits = 0
        };
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

        var subscription = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatuses.Suspended,
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-40),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(-10), // Ended 10 days ago (past 5 day grace)
            GracePeriodDays = 5,
            MonthlyVisitQuota = 10,
            AdditionalTopUpVisits = 0
        };
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
        detail.PlanId.Should().Be(plan.Id);

        var saved = await context.ClinicSubscriptions.FirstOrDefaultAsync(s => s.ClinicId == clinicId);
        saved.Should().NotBeNull();
        saved!.PlanId.Should().Be(plan.Id);
    }

    [Fact]
    public async Task PlatformAdmin_Can_Record_SaaS_Payment_Invoice()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var plan = SeedStarterPlan(context);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Epsilon Clinic", Phone = "9999999999" });

        var subscription = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatuses.Active,
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(30),
            MonthlyVisitQuota = 10,
            AdditionalTopUpVisits = 0
        };
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
}

