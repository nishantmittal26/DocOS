using DocOS.Application.Common.Interfaces;
using DocOS.Application.Vitals;
using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using DocOS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace DocOS.Tests;

public class Phase2CTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private void SeedGlobalVitalMasters(ApplicationDbContext context)
    {
        var masters = new List<VitalMaster>
        {
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110001"), ClinicId = null, Code = "BP_SYS", DisplayName = "Systolic BP", Unit = "mmHg", InputType = "Paired", PairGroup = "BP", NormalRangeMin = 90m, NormalRangeMax = 120m, DefaultDisplayOrder = 1, IsActive = true },
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110002"), ClinicId = null, Code = "BP_DIA", DisplayName = "Diastolic BP", Unit = "mmHg", InputType = "Paired", PairGroup = "BP", NormalRangeMin = 60m, NormalRangeMax = 80m, DefaultDisplayOrder = 2, IsActive = true },
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110003"), ClinicId = null, Code = "PULSE", DisplayName = "Pulse Rate", Unit = "bpm", InputType = "Number", NormalRangeMin = 60m, NormalRangeMax = 100m, DefaultDisplayOrder = 3, IsActive = true },
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110004"), ClinicId = null, Code = "TEMP_F", DisplayName = "Temperature", Unit = "°F", InputType = "Decimal", NormalRangeMin = 97.0m, NormalRangeMax = 99.0m, DefaultDisplayOrder = 4, IsActive = true },
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110005"), ClinicId = null, Code = "SPO2", DisplayName = "SpO2", Unit = "%", InputType = "Number", NormalRangeMin = 95m, NormalRangeMax = 100m, DefaultDisplayOrder = 5, IsActive = true },
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110006"), ClinicId = null, Code = "WEIGHT", DisplayName = "Weight", Unit = "kg", InputType = "Decimal", NormalRangeMin = null, NormalRangeMax = null, DefaultDisplayOrder = 6, IsActive = true },
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110007"), ClinicId = null, Code = "HEIGHT", DisplayName = "Height", Unit = "cm", InputType = "Decimal", NormalRangeMin = null, NormalRangeMax = null, DefaultDisplayOrder = 7, IsActive = true },
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110008"), ClinicId = null, Code = "BMI", DisplayName = "BMI", Unit = "kg/m²", InputType = "Computed", NormalRangeMin = 18.5m, NormalRangeMax = 24.9m, DefaultDisplayOrder = 8, IsActive = true },
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111110009"), ClinicId = null, Code = "SUGAR", DisplayName = "Blood Sugar", Unit = "mg/dL", InputType = "Text", NormalRangeMin = null, NormalRangeMax = null, DefaultDisplayOrder = 9, IsActive = true },
        };
        context.VitalMasters.AddRange(masters);
        context.SaveChanges();
    }

    [Fact]
    public async Task GetClinicVitalPreferences_Lazily_Initializes_From_Global_Masters()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        SeedGlobalVitalMasters(context);

        var clinicId = Guid.NewGuid();
        var clinic = new Clinic { Id = clinicId, Name = "Test Clinic", Phone = "9999999999" };
        context.Clinics.Add(clinic);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);

        var handler = new VitalHandlers(context, mockUser.Object);

        // Act
        var preferences = await handler.Handle(new GetClinicVitalPreferencesQuery(), CancellationToken.None);

        // Assert
        preferences.Should().HaveCount(9);
        preferences.Should().Contain(p => p.Code == "BP_SYS" && p.PairGroup == "BP" && p.IsEnabled);
        preferences.Should().Contain(p => p.Code == "BMI" && p.InputType == "Computed");
        preferences.Should().Contain(p => p.Code == "SUGAR" && p.InputType == "Text");
        preferences.All(p => !p.IsCustom).Should().BeTrue();
    }

    [Fact]
    public async Task UpdateClinicVitalPreferences_Updates_Order_Mandatory_And_RangeOverrides()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        SeedGlobalVitalMasters(context);

        var clinicId = Guid.NewGuid();
        var clinic = new Clinic { Id = clinicId, Name = "Test Clinic", Phone = "9999999999" };
        context.Clinics.Add(clinic);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);

        var handler = new VitalHandlers(context, mockUser.Object);
        var initial = await handler.Handle(new GetClinicVitalPreferencesQuery(), CancellationToken.None);

        var pulsePref = initial.First(p => p.Code == "PULSE");

        // Act: update pulse to mandatory, change order, and override normal range to 55-95
        var updateRequest = new UpdateClinicVitalPreferencesRequest(new List<UpdateVitalPreferenceItem>
        {
            new(pulsePref.VitalMasterId, IsEnabled: true, IsMandatory: true, DisplayOrder: 1, NormalRangeMinOverride: 55m, NormalRangeMaxOverride: 95m)
        });

        await handler.Handle(new UpdateClinicVitalPreferencesCommand(updateRequest), CancellationToken.None);

        // Assert
        var updated = await handler.Handle(new GetClinicVitalPreferencesQuery(), CancellationToken.None);
        var updatedPulse = updated.First(p => p.Code == "PULSE");
        updatedPulse.IsMandatory.Should().BeTrue();
        updatedPulse.DisplayOrder.Should().Be(1);
        updatedPulse.NormalRangeMinOverride.Should().Be(55m);
        updatedPulse.NormalRangeMaxOverride.Should().Be(95m);
        updatedPulse.EffectiveRangeMin.Should().Be(55m);
        updatedPulse.EffectiveRangeMax.Should().Be(95m);
    }

    [Fact]
    public async Task CreateCustomVital_Fails_When_Plan_Does_Not_Have_HasCustomVitals()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        SeedGlobalVitalMasters(context);

        var clinicId = Guid.NewGuid();
        var plan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "STARTER",
            PlanName = "Starter Plan",
            Tier = SubscriptionTiers.Starter,
            HasCustomVitals = false, // Not entitled
            PriceINR = 999m,
            BillingCycle = BillingCycles.Monthly,
            IsActive = true
        };
        context.SubscriptionPlans.Add(plan);

        var sub = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PlanId = plan.Id,
            Plan = plan,
            Status = SubscriptionStatuses.Active,
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-5),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(25)
        };
        context.ClinicSubscriptions.Add(sub);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);

        var handler = new VitalHandlers(context, mockUser.Object);

        var createReq = new CreateCustomVitalRequest("HBA1C", "HbA1c", "%", "Decimal", NormalRangeMin: 4.0m, NormalRangeMax: 5.6m);

        // Act & Assert
        var act = async () => await handler.Handle(new CreateCustomVitalCommand(createReq), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*custom vitals feature*");
    }

    [Fact]
    public async Task CreateCustomVital_Succeeds_When_Plan_Has_HasCustomVitals()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        SeedGlobalVitalMasters(context);

        var clinicId = Guid.NewGuid();
        var plan = new SubscriptionPlanMaster
        {
            Id = Guid.NewGuid(),
            PlanCode = "ENTERPRISE",
            PlanName = "Enterprise Plan",
            Tier = SubscriptionTiers.Enterprise,
            HasCustomVitals = true, // Entitled!
            PriceINR = 2999m,
            BillingCycle = BillingCycles.Monthly,
            IsActive = true
        };
        context.SubscriptionPlans.Add(plan);

        var sub = new ClinicSubscription
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PlanId = plan.Id,
            Plan = plan,
            Status = SubscriptionStatuses.Active,
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-5),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(25)
        };
        context.ClinicSubscriptions.Add(sub);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);

        var handler = new VitalHandlers(context, mockUser.Object);

        var createReq = new CreateCustomVitalRequest("HBA1C", "HbA1c Glycated", "%", "Decimal", NormalRangeMin: 4.0m, NormalRangeMax: 5.6m);

        // Act
        var result = await handler.Handle(new CreateCustomVitalCommand(createReq), CancellationToken.None);

        // Assert
        result.Code.Should().Be("HBA1C");
        result.DisplayName.Should().Be("HbA1c Glycated");
        result.IsCustom.Should().BeTrue();
        result.EffectiveRangeMin.Should().Be(4.0m);
        result.EffectiveRangeMax.Should().Be(5.6m);

        var allPrefs = await handler.Handle(new GetClinicVitalPreferencesQuery(), CancellationToken.None);
        allPrefs.Should().Contain(p => p.Code == "HBA1C" && p.IsCustom);
    }

    [Fact]
    public async Task RecordVisitVitals_Computes_BMI_And_Flags_Abnormal_Values()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        SeedGlobalVitalMasters(context);

        var clinicId = Guid.NewGuid();
        var patientId = Guid.NewGuid();
        var visitId = Guid.NewGuid();

        var clinic = new Clinic { Id = clinicId, Name = "Test Clinic", Phone = "9999999999" };
        var patient = new Patient { Id = patientId, ClinicId = clinicId, PatientUid = "DOC-001", FullName = "Rahul Sharma", MobileNumber = "9876543210" };
        var visit = new Visit { Id = visitId, ClinicId = clinicId, PatientId = patientId, Status = VisitStatus.Waiting };

        context.Clinics.Add(clinic);
        context.Patients.Add(patient);
        context.Visits.Add(visit);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockUser.Setup(u => u.UserId).Returns("nurse-1");

        var handler = new VitalHandlers(context, mockUser.Object);

        // Initialize clinic preferences
        await handler.Handle(new GetClinicVitalPreferencesQuery(), CancellationToken.None);

        // Act: Enter Weight = 75 kg, Height = 175 cm, Systolic = 145 (High, normal is 90-120), Diastolic = 85 (High, normal is 60-80)
        var recordReq = new RecordVisitVitalsRequest(new List<RecordVisitVitalItemRequest>
        {
            new(null, "BP_SYS", "145", 145m),
            new(null, "BP_DIA", "85", 85m),
            new(null, "PULSE", "72", 72m), // Normal (60-100)
            new(null, "WEIGHT", "75", 75m),
            new(null, "HEIGHT", "175", 175m)
        });

        var resultDto = await handler.Handle(new RecordVisitVitalsCommand(visitId, recordReq), CancellationToken.None);

        // Assert
        resultDto.SystolicBp.Should().Be(145);
        resultDto.DiastolicBp.Should().Be(85);
        resultDto.PulseBpm.Should().Be(72);
        resultDto.WeightKg.Should().Be(75m);
        resultDto.HeightCm.Should().Be(175m);

        // BMI calculated: 75 / (1.75 * 1.75) = 24.489 -> 24.5
        resultDto.Bmi.Should().Be(24.5m);
        resultDto.HasAbnormal.Should().BeTrue();

        // Inspect individual VisitVitals
        var visitVitals = await context.VisitVitals
            .Include(v => v.VitalMaster)
            .Where(v => v.VisitId == visitId)
            .ToListAsync();

        visitVitals.Should().HaveCount(6); // BP_SYS, BP_DIA, PULSE, WEIGHT, HEIGHT, and computed BMI

        var bpSysVital = visitVitals.First(v => v.VitalMaster.Code == "BP_SYS");
        bpSysVital.IsAbnormal.Should().BeTrue(); // 145 > 120

        var pulseVital = visitVitals.First(v => v.VitalMaster.Code == "PULSE");
        pulseVital.IsAbnormal.Should().BeFalse(); // 72 is normal

        var bmiVital = visitVitals.First(v => v.VitalMaster.Code == "BMI");
        bmiVital.ValueNumeric.Should().Be(24.5m);
        bmiVital.IsAbnormal.Should().BeFalse(); // 24.5 is within 18.5 - 24.9
    }

    [Fact]
    public async Task RecordVisitVitals_Throws_When_Mandatory_Vital_Is_Missing()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        SeedGlobalVitalMasters(context);

        var clinicId = Guid.NewGuid();
        var patientId = Guid.NewGuid();
        var visitId = Guid.NewGuid();

        var clinic = new Clinic { Id = clinicId, Name = "Test Clinic", Phone = "9999999999" };
        var patient = new Patient { Id = patientId, ClinicId = clinicId, PatientUid = "DOC-001", FullName = "Amit Verma", MobileNumber = "9876543210" };
        var visit = new Visit { Id = visitId, ClinicId = clinicId, PatientId = patientId, Status = VisitStatus.Waiting };

        context.Clinics.Add(clinic);
        context.Patients.Add(patient);
        context.Visits.Add(visit);
        context.SaveChanges();

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.ClinicId).Returns(clinicId);

        var handler = new VitalHandlers(context, mockUser.Object);

        // Make SPO2 mandatory
        var prefs = await handler.Handle(new GetClinicVitalPreferencesQuery(), CancellationToken.None);
        var spo2Pref = prefs.First(p => p.Code == "SPO2");

        await handler.Handle(new UpdateClinicVitalPreferencesCommand(new UpdateClinicVitalPreferencesRequest(new List<UpdateVitalPreferenceItem>
        {
            new(spo2Pref.VitalMasterId, IsEnabled: true, IsMandatory: true, DisplayOrder: 5, null, null)
        })), CancellationToken.None);

        // Act: Submit vitals without SPO2
        var recordReq = new RecordVisitVitalsRequest(new List<RecordVisitVitalItemRequest>
        {
            new(null, "BP_SYS", "120", 120m),
            new(null, "BP_DIA", "80", 80m)
        });

        var act = async () => await handler.Handle(new RecordVisitVitalsCommand(visitId, recordReq), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*'SpO2' is mandatory*");
    }

    [Fact]
    public async Task PlatformAdmin_Can_Manage_Global_Vital_Masters()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        SeedGlobalVitalMasters(context);

        var mockUser = new Mock<ICurrentUserService>();
        mockUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var handler = new VitalHandlers(context, mockUser.Object);

        // 1. Get global masters
        var globals = await handler.Handle(new GetGlobalVitalMastersQuery(), CancellationToken.None);
        globals.Should().HaveCount(9);

        // 2. Create a new global master
        var createReq = new CreateGlobalVitalMasterRequest(
            Code: "RESP_RATE",
            DisplayName: "Respiratory Rate",
            Unit: "breaths/min",
            InputType: "Number",
            NormalRangeMin: 12m,
            NormalRangeMax: 20m,
            DefaultDisplayOrder: 10
        );
        var created = await handler.Handle(new CreateGlobalVitalMasterCommand(createReq), CancellationToken.None);
        created.Code.Should().Be("RESP_RATE");

        // 3. Update global master
        var updateReq = new UpdateGlobalVitalMasterRequest(
            DisplayName: "Respiratory Rate (Breaths)",
            Unit: "bpm",
            InputType: "Number",
            NormalRangeMin: 14m,
            NormalRangeMax: 20m,
            DefaultDisplayOrder: 10,
            IsActive: true
        );
        var updated = await handler.Handle(new UpdateGlobalVitalMasterCommand(created.Id, updateReq), CancellationToken.None);
        updated.DisplayName.Should().Be("Respiratory Rate (Breaths)");
        updated.NormalRangeMin.Should().Be(14m);
    }
}
