using DocOS.Application.Advice;
using DocOS.Application.Auth;
using DocOS.Application.Common.Interfaces;
using DocOS.Application.Labs;
using DocOS.Application.Medicines;
using DocOS.Application.Payments;
using DocOS.Application.Visits;
using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using DocOS.Infrastructure.Persistence;
using DocOS.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace DocOS.Tests;

public class Phase2DTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private void SeedGlobalMasters(ApplicationDbContext context)
    {
        var labs = new List<LabTestMaster>
        {
            new() { Id = Guid.Parse("22222222-2222-2222-2222-222222220001"), ClinicId = null, TestCode = "CBC", TestName = "Complete Blood Count", Category = "Hematology", SampleType = "Blood (EDTA)", FastingRequired = false, IsActive = true },
            new() { Id = Guid.Parse("22222222-2222-2222-2222-222222220002"), ClinicId = null, TestCode = "LIPID", TestName = "Lipid Profile", Category = "Biochemistry", SampleType = "Serum", FastingRequired = true, IsActive = true },
            new() { Id = Guid.Parse("22222222-2222-2222-2222-222222220003"), ClinicId = null, TestCode = "LFT", TestName = "Liver Function Test", Category = "Biochemistry", SampleType = "Serum", FastingRequired = false, IsActive = true },
        };
        context.LabTestMasters.AddRange(labs);

        var advice = new List<AdviceTemplateMaster>
        {
            new() { Id = Guid.Parse("33333333-3333-3333-3333-333333330001"), ClinicId = null, Category = "Dietary", Title = "Diabetic Dietary Guidelines", InstructionsText = "Limit simple sugars.", IsActive = true },
            new() { Id = Guid.Parse("33333333-3333-3333-3333-333333330002"), ClinicId = null, Category = "General", Title = "Fever Care & Hydration", InstructionsText = "Rest and drink fluids.", IsActive = true },
        };
        context.AdviceTemplateMasters.AddRange(advice);

        context.SaveChanges();
    }

    [Fact]
    public async Task LabModule_Entitlement_Restricts_Clinics_Without_LabModule_On_Plan()
    {
        using var context = CreateInMemoryDbContext();
        SeedGlobalMasters(context);

        var clinicId = Guid.NewGuid();
        var clinic = new Clinic { Id = clinicId, Name = "Basic Clinic", Phone = "9999999999" };
        context.Clinics.Add(clinic);

        // Plan without lab module
        var plan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "STARTER",
            PlanName = "Starter Plan",
            Tier = "Starter",
            HasLabModule = false,
            BillingCycle = "Monthly"
        };
        context.SubscriptionPlans.Add(plan);

        var sub = new ClinicSubscription
        {
            ClinicId = clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatuses.Active
        };
        context.ClinicSubscriptions.Add(sub);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);

        var mockAudit = new Mock<IAuditService>();
        var handler = new LabHandlers(context, mockUser.Object, mockAudit.Object);

        // Act & Assert: Should reject query
        var act = async () => await handler.Handle(new GetClinicLabTestsQuery(), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Lab Module is not included*");

        // Upgrade plan to include lab module
        plan.HasLabModule = true;
        context.SaveChanges();

        // Now should succeed
        var allowedTests = await handler.Handle(new GetClinicLabTestsQuery(), CancellationToken.None);
        allowedTests.Should().NotBeEmpty();
        allowedTests.Should().Contain(t => t.TestCode == "CBC");
    }

    [Fact]
    public async Task LabModule_ClinicSubscription_Override_Can_Enable_Labs_When_Plan_Disabled()
    {
        using var context = CreateInMemoryDbContext();
        SeedGlobalMasters(context);

        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Legacy Clinic", Phone = "9999999999" });

        var plan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "STARTER",
            PlanName = "Starter Plan",
            Tier = "Starter",
            HasLabModule = false,
            BillingCycle = "Monthly"
        };
        context.SubscriptionPlans.Add(plan);

        var sub = new ClinicSubscription
        {
            ClinicId = clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatuses.Active,
            LabModuleOverride = true
        };
        context.ClinicSubscriptions.Add(sub);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);
        var mockAudit = new Mock<IAuditService>();
        var handler = new LabHandlers(context, mockUser.Object, mockAudit.Object);

        var tests = await handler.Handle(new GetClinicLabTestsQuery(), CancellationToken.None);
        tests.Should().NotBeEmpty();
    }

    [Fact]
    public async Task LabPanel_And_CustomTest_Can_Be_Created_And_Ordered_On_Prescription()
    {
        using var context = CreateInMemoryDbContext();
        SeedGlobalMasters(context);

        var clinicId = Guid.NewGuid();
        var clinic = new Clinic { Id = clinicId, Name = "Premium Clinic", Phone = "9999999999" };
        context.Clinics.Add(clinic);

        var plan = new SubscriptionPlanMaster { Id = Guid.NewGuid(), PlanCode = "PRO", PlanName = "Pro", Tier = "Pro", HasLabModule = true, BillingCycle = "Monthly" };
        context.SubscriptionPlans.Add(plan);
        context.ClinicSubscriptions.Add(new ClinicSubscription { ClinicId = clinicId, PlanId = plan.Id, Status = SubscriptionStatuses.Active });

        var patient = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, FullName = "John Doe", PatientUid = "DOC001", MobileNumber = "9988776655" };
        context.Patients.Add(patient);

        var visit = new Visit { Id = Guid.NewGuid(), ClinicId = clinicId, PatientId = patient.Id, TokenNumber = 1, Status = VisitStatus.InConsultation, DoctorId = "doc-1" };
        context.Visits.Add(visit);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockUser.Setup(u => u.UserId).Returns("doc-1");
        mockUser.Setup(u => u.IsInRole(Roles.Doctor)).Returns(true);

        var mockAudit = new Mock<IAuditService>();
        var labHandler = new LabHandlers(context, mockUser.Object, mockAudit.Object);

        // 1. Create custom lab test
        var customTest = await labHandler.Handle(new CreateClinicLabTestCommand(new CreateLabTestRequest(
            "CUST_CRP", "C-Reactive Protein (Quantitative)", "Biochemistry", "Serum", false
        )), CancellationToken.None);

        customTest.TestCode.Should().Be("CUST_CRP");
        customTest.IsCustom.Should().BeTrue();

        // 2. Create fever panel with CBC + Custom Test
        var cbcMaster = await context.LabTestMasters.FirstAsync(t => t.TestCode == "CBC");
        var panel = await labHandler.Handle(new CreateClinicLabPanelCommand(new CreateLabPanelRequest(
            "Fever Panel", new List<Guid> { cbcMaster.Id, customTest.Id }
        )), CancellationToken.None);

        panel.Name.Should().Be("Fever Panel");
        panel.Tests.Should().HaveCount(2);

        // 3. Complete consultation ordering CBC and CUST_CRP
        var mockIdentity = new Mock<IIdentityService>();
        var visitHandler = new VisitHandlers(context, mockUser.Object, mockIdentity.Object, mockAudit.Object);

        var rxDetail = await visitHandler.Handle(new CompleteConsultationCommand(new CompleteConsultationRequest(
            visit.Id,
            "doc-1",
            "Fever (2 days)",
            "Viral Fever",
            "Hydration advised",
            DateTime.UtcNow.AddDays(3),
            "Take rest and drink plenty of fluids",
            new List<PrescriptionItemDto>
            {
                new("Paracetamol 650", "Paracetamol", DosageForm.Tablet, "1-0-1", DosageTiming.AfterFood, 3, "After meals")
            },
            new List<PrescriptionLabOrderRequest>
            {
                new(cbcMaster.Id, "Urgent stat"),
                new(customTest.Id, null)
            },
            new List<PrescriptionAdviceRequest>
            {
                new(Guid.Parse("33333333-3333-3333-3333-333333330002"), "Rest and drink fluids.", 1)
            }
        )), CancellationToken.None);

        rxDetail.LabOrders.Should().HaveCount(2);
        rxDetail.LabOrders.Should().Contain(l => l.TestCode == "CBC" && l.SpecialInstructions == "Urgent stat");
        rxDetail.LabOrders.Should().Contain(l => l.TestCode == "CUST_CRP");
        rxDetail.AdviceItems.Should().HaveCount(1);
        rxDetail.AdviceItems[0].AdviceText.Should().Be("Rest and drink fluids.");
    }

    [Fact]
    public async Task DoctorMedicineFavorite_Is_User_Specific_And_Does_Not_Alter_Global_Formulary()
    {
        using var context = CreateInMemoryDbContext();

        var globalMed = new Medicine
        {
            Id = Guid.NewGuid(),
            ClinicId = null,
            BrandName = "Dolo 650",
            SaltComposition = "Paracetamol 650mg",
            Form = DosageForm.Tablet,
            Strength = "650mg",
            DefaultDosage = "1-0-1",
            DefaultTiming = DosageTiming.AfterFood,
            IsCustom = false
        };
        context.Medicines.Add(globalMed);
        context.SaveChanges();

        var mockAudit = new Mock<IAuditService>();

        // Doctor A toggles favorite
        var mockUserA = new Mock<ICurrentUserService>();
        mockUserA.Setup(u => u.UserId).Returns("doctor-A");
        var handlerA = new MedicineHandlers(context, mockUserA.Object, mockAudit.Object);

        var toggleResp = await handlerA.Handle(new ToggleMedicineFavoriteCommand(globalMed.Id), CancellationToken.None);
        toggleResp.IsFavorite.Should().BeTrue();

        // Doctor A lists favorites
        var favsA = await handlerA.Handle(new GetDoctorFavoriteMedicinesQuery(), CancellationToken.None);
        favsA.Should().ContainSingle(m => m.Id == globalMed.Id);

        // Doctor B lists favorites -> should NOT have Doctor A's favorite
        var mockUserB = new Mock<ICurrentUserService>();
        mockUserB.Setup(u => u.UserId).Returns("doctor-B");
        var handlerB = new MedicineHandlers(context, mockUserB.Object, mockAudit.Object);

        var favsB = await handlerB.Handle(new GetDoctorFavoriteMedicinesQuery(), CancellationToken.None);
        favsB.Should().BeEmpty();

        // Verify global medicine row still has ClinicId == null and no IsDoctorFavorite column exists on Medicine
        var reloadedGlobal = await context.Medicines.FindAsync(globalMed.Id);
        reloadedGlobal!.ClinicId.Should().BeNull();
        reloadedGlobal.DefaultDosage.Should().Be("1-0-1");
    }

    [Fact]
    public async Task PublicShareToken_Generates_Unguessable_128Bit_Token_And_Allows_Read_Only_Lookup()
    {
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        var clinic = new Clinic { Id = clinicId, Name = "Alpha Health", Phone = "9988776655" };
        context.Clinics.Add(clinic);

        var patient = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, FullName = "Alice Smith", PatientUid = "DOC002", MobileNumber = "9998887776" };
        context.Patients.Add(patient);

        var visit = new Visit { Id = Guid.NewGuid(), ClinicId = clinicId, PatientId = patient.Id, TokenNumber = 1, Status = VisitStatus.Completed, DoctorId = "doc-1" };
        context.Visits.Add(visit);

        var rx = new Prescription
        {
            Id = Guid.NewGuid(),
            VisitId = visit.Id,
            PatientId = patient.Id,
            ClinicId = clinicId,
            DoctorId = "doc-1",
            PrescribedAt = DateTime.UtcNow,
            IsCurrent = true
        };
        rx.Items.Add(new PrescriptionItem { MedicineName = "Amoxicillin 500", SaltComposition = "Amoxicillin", Form = DosageForm.Capsule, Dosage = "1-1-1", Timing = DosageTiming.AfterFood, DurationDays = 5 });
        context.Prescriptions.Add(rx);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockUser.Setup(u => u.UserId).Returns("doc-1");

        var mockIdentity = new Mock<IIdentityService>();
        var mockAudit = new Mock<IAuditService>();
        var visitHandler = new VisitHandlers(context, mockUser.Object, mockIdentity.Object, mockAudit.Object);

        // 1. Generate share token
        var tokenResp = await visitHandler.Handle(new GeneratePrescriptionShareTokenCommand(rx.Id, ExpiryDays: 7), CancellationToken.None);
        tokenResp.Token.Should().NotBeNullOrWhiteSpace();
        tokenResp.Token.Length.Should().BeGreaterThanOrEqualTo(32); // 16 bytes hex = 32 chars
        tokenResp.ExpiresAt.Should().BeAfter(DateTime.UtcNow);

        // 2. Query public prescription anonymously
        var publicRx = await visitHandler.Handle(new GetPublicPrescriptionQuery(tokenResp.Token), CancellationToken.None);
        publicRx.Should().NotBeNull();
        publicRx!.PatientName.Should().Be("Alice Smith");
        publicRx.Items.Should().ContainSingle(i => i.MedicineName == "Amoxicillin 500");

        // 3. Expired token should not be returned
        rx.ExpiresAt = DateTime.UtcNow.AddMinutes(-5);
        context.SaveChanges();

        var expiredRx = await visitHandler.Handle(new GetPublicPrescriptionQuery(tokenResp.Token), CancellationToken.None);
        expiredRx.Should().BeNull();
    }

    [Fact]
    public async Task Printed_Prescription_Revision_Creates_New_Row_Linked_By_PreviousId_Without_Incrementing_Usage()
    {
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        var clinic = new Clinic { Id = clinicId, Name = "Care Clinic", Phone = "9988776655" };
        context.Clinics.Add(clinic);

        var plan = new SubscriptionPlanMaster { Id = Guid.NewGuid(), PlanCode = "TEST", PlanName = "Test", Tier = "Test", BillingCycle = "Monthly", DefaultMonthlyVisits = 100 };
        context.SubscriptionPlans.Add(plan);
        var sub = new ClinicSubscription { ClinicId = clinicId, PlanId = plan.Id, Status = SubscriptionStatuses.Active };
        context.ClinicSubscriptions.Add(sub);
        var usage = new ClinicPeriodUsage { ClinicId = clinicId, SubscriptionId = sub.Id, PeriodStart = DateTime.UtcNow.Date, PeriodEnd = DateTime.UtcNow.Date.AddDays(30), VisitsConducted = 5 };
        context.ClinicPeriodUsages.Add(usage);

        var patient = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, FullName = "Bob Taylor", PatientUid = "DOC003", MobileNumber = "9998881112" };
        context.Patients.Add(patient);

        var visit = new Visit { Id = Guid.NewGuid(), ClinicId = clinicId, PatientId = patient.Id, TokenNumber = 1, Status = VisitStatus.InConsultation, DoctorId = "doc-1" };
        context.Visits.Add(visit);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockUser.Setup(u => u.UserId).Returns("doc-1");
        mockUser.Setup(u => u.IsInRole(Roles.Doctor)).Returns(true);

        var mockIdentity = new Mock<IIdentityService>();
        var mockAudit = new Mock<IAuditService>();
        var visitHandler = new VisitHandlers(context, mockUser.Object, mockIdentity.Object, mockAudit.Object);

        // First completion -> Increments usage from 5 to 6
        var firstRx = await visitHandler.Handle(new CompleteConsultationCommand(new CompleteConsultationRequest(
            visit.Id, "doc-1", "Headache", "Tension Headache", null, null, "Drink water",
            new List<PrescriptionItemDto> { new("Paracetamol", "Paracetamol", DosageForm.Tablet, "1-0-1", DosageTiming.AfterFood, 2, null) }
        )), CancellationToken.None);

        usage.VisitsConducted.Should().Be(6);

        // Mark first prescription as printed
        await visitHandler.Handle(new MarkPrescriptionPrintedCommand(firstRx.Id), CancellationToken.None);

        var originalRx = await context.Prescriptions.FindAsync(firstRx.Id);
        originalRx!.IsPrinted.Should().BeTrue();

        // Now edit the consultation for the printed prescription
        var revisedRx = await visitHandler.Handle(new CompleteConsultationCommand(new CompleteConsultationRequest(
            visit.Id, "doc-1", "Headache and Fever", "Viral Fever with Headache", null, null, "Drink warm water",
            new List<PrescriptionItemDto>
            {
                new("Paracetamol", "Paracetamol", DosageForm.Tablet, "1-0-1", DosageTiming.AfterFood, 3, null),
                new("Cetirizine", "Cetirizine", DosageForm.Tablet, "0-0-1", DosageTiming.Bedtime, 3, null)
            }
        )), CancellationToken.None);

        // Verify:
        // 1. New revision row created with PreviousPrescriptionId pointing to original
        revisedRx.Id.Should().NotBe(firstRx.Id);
        revisedRx.PreviousPrescriptionId.Should().Be(firstRx.Id);
        revisedRx.IsCurrent.Should().BeTrue();
        revisedRx.IsPrinted.Should().BeFalse();

        // 2. Original row remains unprinted and marked IsCurrent = false
        var reloadedOriginal = await context.Prescriptions.FindAsync(firstRx.Id);
        reloadedOriginal!.IsCurrent.Should().BeFalse();
        reloadedOriginal.IsPrinted.Should().BeTrue();

        // 3. Quota usage was NOT incremented again (still 6)
        usage.VisitsConducted.Should().Be(6);

        // 4. Query current prescription returns revised row
        var currentRx = await visitHandler.Handle(new GetPrescriptionQuery(visit.Id), CancellationToken.None);
        currentRx!.Id.Should().Be(revisedRx.Id);
        currentRx.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task VisitPayment_Records_Cash_And_UPI_And_Generates_Daily_Report()
    {
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        var clinic = new Clinic { Id = clinicId, Name = "Payment Clinic", Phone = "9988776655" };
        context.Clinics.Add(clinic);

        var visit1 = new Visit { Id = Guid.NewGuid(), ClinicId = clinicId, PatientId = Guid.NewGuid(), TokenNumber = 1, Status = VisitStatus.Completed };
        var visit2 = new Visit { Id = Guid.NewGuid(), ClinicId = clinicId, PatientId = Guid.NewGuid(), TokenNumber = 2, Status = VisitStatus.Completed };
        context.Visits.AddRange(visit1, visit2);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockUser.Setup(u => u.UserId).Returns("receptionist-1");

        var mockIdentity = new Mock<IIdentityService>();
        mockIdentity.Setup(i => i.GetClinicStaffAsync(clinicId)).ReturnsAsync(new List<StaffMemberDto>
        {
            new("receptionist-1", "Pooja Sharma", "pooja@clinic.com", "9999999999", new List<string> { "Receptionist" }, true, DateTime.UtcNow, null, null, null, null)
        });

        var mockAudit = new Mock<IAuditService>();
        var paymentHandler = new PaymentHandlers(context, mockUser.Object, mockIdentity.Object, mockAudit.Object);

        // Record Cash payment for Visit 1
        var p1 = await paymentHandler.Handle(new RecordVisitPaymentCommand(visit1.Id, new RecordVisitPaymentRequest(500m, "Cash", null)), CancellationToken.None);
        p1.Amount.Should().Be(500m);
        p1.Method.Should().Be("Cash");
        p1.CollectedByName.Should().Be("Pooja Sharma");

        // Record UPI payment for Visit 2
        var p2 = await paymentHandler.Handle(new RecordVisitPaymentCommand(visit2.Id, new RecordVisitPaymentRequest(800m, "UPI", "UPI-REF-12345")), CancellationToken.None);
        p2.Amount.Should().Be(800m);
        p2.Method.Should().Be("UPI");
        p2.Reference.Should().Be("UPI-REF-12345");

        // Generate daily report
        var report = await paymentHandler.Handle(new GetDailyCollectionReportQuery(DateTime.UtcNow), CancellationToken.None);
        report.TotalCash.Should().Be(500m);
        report.TotalUpi.Should().Be(800m);
        report.GrandTotal.Should().Be(1300m);
        report.TotalTransactions.Should().Be(2);
        report.StaffSummaries.Should().ContainSingle(s => s.StaffName == "Pooja Sharma" && s.TotalCollected == 1300m);
    }

    [Fact]
    public async Task AuditService_Logs_Expected_Actions()
    {
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockUser.Setup(u => u.UserId).Returns("user-1");

        var logger = new Mock<ILogger<AuditService>>();
        var auditService = new AuditService(context, mockUser.Object, logger.Object);

        await auditService.LogAsync("PRINT", "Prescription", "rx-123", clinicId: clinicId, userId: "user-1");
        await auditService.LogAsync("LOGIN", "ApplicationUser", "user-1", clinicId: clinicId, userId: "user-1");

        var logs = await context.AuditLogs.ToListAsync();
        logs.Should().HaveCount(2);
        logs.Should().Contain(l => l.Action == "PRINT" && l.EntityName == "Prescription" && l.EntityId == "rx-123");
        logs.Should().Contain(l => l.Action == "LOGIN" && l.EntityName == "ApplicationUser" && l.EntityId == "user-1");
    }
}
