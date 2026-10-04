using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DocOS.Application.Auth;
using DocOS.Application.Auth.Commands;
using DocOS.Application.Clinics;
using DocOS.Application.Common.Interfaces;
using DocOS.Application.Patients;
using DocOS.Application.Visits;
using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using DocOS.Infrastructure.Identity;
using DocOS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit; 

namespace DocOS.Tests;

public class Phase2ATests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task Platform_Admin_Cannot_Read_Clinic_Clinical_Records()
    {
        // Arrange: Caller is a PlatformAdmin with null ClinicId
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Test Clinic", Phone = "9999999999" });
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.UserId).Returns("platform-admin-id");
        mockCurrentUser.Setup(u => u.ClinicId).Returns((Guid?)null); // Null ClinicId
        mockCurrentUser.Setup(u => u.Role).Returns(Roles.PlatformAdmin);
        mockCurrentUser.Setup(u => u.Roles).Returns(new List<string> { Roles.PlatformAdmin });
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);
        mockCurrentUser.Setup(u => u.IsAuthenticated).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();

        var visitHandlers = new VisitHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);
        var patientHandlers = new PatientHandlers(context, mockCurrentUser.Object);

        // Act & Assert: Visit endpoints reject null ClinicId
        var actQueue = () => visitHandlers.Handle(new GetTodayQueueQuery(), CancellationToken.None);
        await actQueue.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Active clinic context is required*");

        var actHistory = () => visitHandlers.Handle(new GetVisitHistoryQuery(), CancellationToken.None);
        await actHistory.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Active clinic context is required*");

        var actPrescription = () => visitHandlers.Handle(new GetPrescriptionQuery(Guid.NewGuid()), CancellationToken.None);
        await actPrescription.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Active clinic context is required*");

        // Act & Assert: Patient endpoints reject null ClinicId
        var actPatients = () => patientHandlers.Handle(new SearchPatientsQuery("test"), CancellationToken.None);
        await actPatients.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Active clinic context is required*");

        var actPatientById = () => patientHandlers.Handle(new GetPatientByIdQuery(Guid.NewGuid()), CancellationToken.None);
        await actPatientById.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Active clinic context is required*");
    }

    [Fact]
    public async Task Two_Doctors_In_One_Clinic_Have_Independent_Token_Sequences_On_Same_Day()
    {
        // Arrange: A clinic with two distinct doctors
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Multi-Doctor Care", Phone = "9876543210" });

        var patient1 = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, PatientUid = "DOC-001", FullName = "Patient One", MobileNumber = "9000000001" };
        var patient2 = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, PatientUid = "DOC-002", FullName = "Patient Two", MobileNumber = "9000000002" };
        var patient3 = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, PatientUid = "DOC-003", FullName = "Patient Three", MobileNumber = "9000000003" };
        var patient4 = new Patient { Id = Guid.NewGuid(), ClinicId = clinicId, PatientUid = "DOC-004", FullName = "Patient Four", MobileNumber = "9000000004" };

        context.Patients.AddRange(patient1, patient2, patient3, patient4);
        await context.SaveChangesAsync();

        var doctorAId = "doctor-A-id";
        var doctorBId = "doctor-B-id";

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(It.IsAny<string>())).Returns(false);

        var mockIdentityService = new Mock<IIdentityService>();
        mockIdentityService.Setup(i => i.GetDoctorProfileAsync(doctorAId))
            .ReturnsAsync(new DoctorProfileDto(doctorAId, "Dr. Alice", "MBBS", "111", "General", 500));
        mockIdentityService.Setup(i => i.GetDoctorProfileAsync(doctorBId))
            .ReturnsAsync(new DoctorProfileDto(doctorBId, "Dr. Bob", "MBBS, MD", "222", "Pediatrics", 700));

        var handlers = new VisitHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act: Add patients for Doctor A and Doctor B on the same calendar day
        var visitA1 = await handlers.Handle(new AddToQueueCommand(patient1.Id, doctorAId), CancellationToken.None);
        var visitB1 = await handlers.Handle(new AddToQueueCommand(patient2.Id, doctorBId), CancellationToken.None);
        var visitA2 = await handlers.Handle(new AddToQueueCommand(patient3.Id, doctorAId), CancellationToken.None);
        var visitB2 = await handlers.Handle(new AddToQueueCommand(patient4.Id, doctorBId), CancellationToken.None);

        // Assert: Both doctors start their own token sequence at 1
        visitA1.TokenNumber.Should().Be(1, "First patient for Doctor A should receive Token #1");
        visitB1.TokenNumber.Should().Be(1, "First patient for Doctor B should also receive Token #1 on the same day");
        visitA2.TokenNumber.Should().Be(2, "Second patient for Doctor A should receive Token #2");
        visitB2.TokenNumber.Should().Be(2, "Second patient for Doctor B should receive Token #2");
    }

    [Fact]
    public async Task Visit_Cannot_Enter_InConsultation_Without_DoctorId()
    {
        // Arrange: A visit in queue with DoctorId = null
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        var patientId = Guid.NewGuid();
        var visit = new Visit
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientId = patientId,
            DoctorId = null, // No assigned doctor
            TokenNumber = 1,
            VisitDate = DateTime.UtcNow.Date,
            Status = VisitStatus.Waiting
        };
        context.Visits.Add(visit);
        await context.SaveChangesAsync();

        // Receptionist caller (not a doctor)
        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.UserId).Returns("receptionist-id");
        mockCurrentUser.Setup(u => u.IsInRole(Roles.Doctor)).Returns(false);

        var mockIdentityService = new Mock<IIdentityService>();
        var handlers = new VisitHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act & Assert: Attempting to enter InConsultation without an assigned DoctorId must fail
        var act = () => handlers.Handle(new UpdateVisitStatusCommand(visit.Id, VisitStatus.InConsultation, DoctorId: null), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*A visit cannot enter InConsultation without an assigned Doctor.*");
    }

    [Fact]
    public async Task Saved_Prescription_Has_DoctorId_And_Letterhead_Uses_Doctor_Credentials()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        var doctorId = "doctor-consulting-id";

        var clinic = new Clinic
        {
            Id = clinicId,
            Name = "City Health Clinic",
            Phone = "011-23456789",
            Email = "contact@cityhealth.in",
            Address = "12 Main St, Delhi",
            LetterheadMarginTopMm = 55,
            PrintBottomMarginMm = 15,
            HideLetterheadOnPrint = false,
            ClinicTimings = "10 AM - 6 PM"
        };
        context.Clinics.Add(clinic);

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientUid = "DOC-2026-0042",
            FullName = "Ramesh Kumar",
            MobileNumber = "9811122233"
        };
        context.Patients.Add(patient);

        var visit = new Visit
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            PatientId = patient.Id,
            DoctorId = doctorId,
            TokenNumber = 3,
            VisitDate = DateTime.UtcNow.Date,
            Status = VisitStatus.InConsultation
        };
        context.Visits.Add(visit);
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.UserId).Returns(doctorId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.Doctor)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        mockIdentityService.Setup(i => i.GetDoctorProfileAsync(doctorId))
            .ReturnsAsync(new DoctorProfileDto(
                doctorId,
                "Dr. Vikram Sarabhai",
                "MBBS, MS (ENT)",
                "DMC-54321",
                "ENT Specialist",
                600
            ));

        var handlers = new VisitHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        // Act: Complete consultation
        var request = new CompleteConsultationRequest(
            VisitId: visit.Id,
            DoctorId: doctorId,
            ChiefComplaints: "Ear pain for 2 days",
            Diagnosis: "Otitis Media",
            ClinicalNotes: "Mild redness in left tympanic membrane",
            FollowUpDate: DateTime.UtcNow.AddDays(5),
            GeneralAdvice: "Keep ear dry",
            Items: new List<PrescriptionItemDto>
            {
                new("Otorex Drops", "Chloramphenicol", DosageForm.Drops, "2 drops", DosageTiming.AfterFood, 5, "Instill twice daily")
            }
        );

        var result = await handlers.Handle(new CompleteConsultationCommand(request), CancellationToken.None);

        // Assert: Prescription has required DoctorId
        result.DoctorId.Should().Be(doctorId);
        result.DoctorName.Should().Be("Dr. Vikram Sarabhai");

        // Verify letterhead pulls doctor's credentials and clinic's print margins
        result.Clinic.DoctorName.Should().Be("Dr. Vikram Sarabhai");
        result.Clinic.Qualifications.Should().Be("MBBS, MS (ENT)");
        result.Clinic.RegNumber.Should().Be("DMC-54321");
        result.Clinic.Specialization.Should().Be("ENT Specialist");
        result.Clinic.PrintBottomMarginMm.Should().Be(15);
        result.Clinic.HideLetterheadOnPrint.Should().BeFalse();
        result.Clinic.ClinicTimings.Should().Be("10 AM - 6 PM");

        // Verify database persistence
        var dbPrescription = await context.Prescriptions.FirstOrDefaultAsync(p => p.VisitId == visit.Id);
        dbPrescription.Should().NotBeNull();
        dbPrescription!.DoctorId.Should().Be(doctorId);
    }

    [Fact]
    public async Task Clinic_Staff_Cannot_Be_Saved_Without_ClinicId()
    {
        // Arrange
        var mockUserStore = new Mock<IUserStore<ApplicationUser>>();
        var userManager = new Mock<UserManager<ApplicationUser>>(mockUserStore.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        var roleManager = new Mock<RoleManager<IdentityRole>>(new Mock<IRoleStore<IdentityRole>>().Object, null!, null!, null!, null!);

        var identityService = new IdentityService(userManager.Object, roleManager.Object);

        // Act: Try creating staff (Doctor, Nurse, Receptionist, ClinicAdmin) with clinicId: null
        var docResult = await identityService.CreateUserAsync("doc@test.com", "Pass123", "Dr. Test", null, new[] { Roles.Doctor });
        var nurseResult = await identityService.CreateUserAsync("nurse@test.com", "Pass123", "Nurse Test", null, new[] { Roles.Nurse });
        var recepResult = await identityService.CreateUserAsync("recep@test.com", "Pass123", "Receptionist Test", null, new[] { Roles.Receptionist });
        var adminResult = await identityService.CreateUserAsync("admin@test.com", "Pass123", "Clinic Admin Test", null, new[] { Roles.ClinicAdmin });

        // Assert: All clinic staff roles require ClinicId
        docResult.Success.Should().BeFalse();
        docResult.Error.Should().Contain("Clinic staff cannot be created without a ClinicId");

        nurseResult.Success.Should().BeFalse();
        nurseResult.Error.Should().Contain("Clinic staff cannot be created without a ClinicId");

        recepResult.Success.Should().BeFalse();
        recepResult.Error.Should().Contain("Clinic staff cannot be created without a ClinicId");

        adminResult.Success.Should().BeFalse();
        adminResult.Error.Should().Contain("Clinic staff cannot be created without a ClinicId");
    }

    [Fact]
    public async Task Deactivated_Staff_Cannot_Sign_In()
    {
        // Arrange: Inactive user
        var inactiveUser = new ApplicationUser
        {
            Id = "inactive-user-id",
            Email = "inactive@clinic.com",
            UserName = "inactive@clinic.com",
            FullName = "Deactivated Doctor",
            IsActive = false // Inactive
        };

        var mockUserStore = new Mock<IUserStore<ApplicationUser>>();
        var userManager = new Mock<UserManager<ApplicationUser>>(mockUserStore.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        userManager.Setup(m => m.FindByEmailAsync("inactive@clinic.com")).ReturnsAsync(inactiveUser);

        var roleManager = new Mock<RoleManager<IdentityRole>>(new Mock<IRoleStore<IdentityRole>>().Object, null!, null!, null!, null!);
        var identityService = new IdentityService(userManager.Object, roleManager.Object);

        // Act: Try validating credentials for deactivated user
        var (success, error, _, _, _, _) = await identityService.ValidateCredentialsAsync("inactive@clinic.com", "Secret123!");

        // Assert
        success.Should().BeFalse();
        error.Should().Contain("Your account has been deactivated");
    }

    [Fact]
    public async Task ClinicAdmin_Cannot_Deactivate_Own_Account()
    {
        // Arrange
        var clinicId = Guid.NewGuid();
        const string currentAdminId = "admin-user-123";

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.IsInRole(Roles.ClinicAdmin)).Returns(true);
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.UserId).Returns(currentAdminId);

        var mockIdentityService = new Mock<IIdentityService>();
        var mockJwtGenerator = new Mock<IJwtTokenGenerator>();
        var mockAuditService = new Mock<IAuditService>();
        using var context = CreateInMemoryDbContext();

        var handler = new AuthCommandHandler(
            context,
            mockIdentityService.Object,
            mockJwtGenerator.Object,
            mockCurrentUser.Object,
            mockAuditService.Object
        );

        // Act & Assert: Attempting to deactivate own account must throw InvalidOperationException
        var deactivateOwnCommand = new ToggleStaffActiveCommand(new ToggleStaffActiveRequest(currentAdminId, false));
        var act = () => handler.Handle(deactivateOwnCommand, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("You cannot deactivate your own account.");

        // And verify identity service was never invoked for self-deactivation
        mockIdentityService.Verify(i => i.SetUserActiveStatusAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public void Jwt_Token_Emits_One_ClaimTypes_Role_Per_Role_And_ClinicId_Without_InCode_Fallback()
    {
        // Arrange
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Jwt:Secret"]).Returns("ThisIsAVeryLongHardenedSecretKeyForTestingOnly2026!!");
        mockConfig.Setup(c => c["Jwt:Issuer"]).Returns("DocOS.API");
        mockConfig.Setup(c => c["Jwt:Audience"]).Returns("DocOS.Client");
        mockConfig.Setup(c => c["Jwt:ExpiryHours"]).Returns("12");

        var generator = new JwtTokenGenerator(mockConfig.Object);
        var clinicId = Guid.NewGuid();
        var roles = new[] { Roles.ClinicAdmin, Roles.Doctor };

        // Act: Generate token
        var tokenString = generator.GenerateToken("user-123", "doc@clinic.com", "Dr. Clinic Owner", clinicId, roles);

        // Assert: Read claims
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(tokenString);

        var roleClaims = token.Claims.Where(c => c.Type == ClaimTypes.Role || c.Type == "role").Select(c => c.Value).ToList();
        roleClaims.Should().Contain(Roles.ClinicAdmin);
        roleClaims.Should().Contain(Roles.Doctor);

        var clinicClaim = token.Claims.FirstOrDefault(c => c.Type == "ClinicId");
        clinicClaim.Should().NotBeNull();
        clinicClaim!.Value.Should().Be(clinicId.ToString());

        // Token lifetime should be short (12 hours)
        var expiration = token.ValidTo;
        (expiration - DateTime.UtcNow).TotalHours.Should().BeInRange(11.5, 12.5);
    }

    [Fact]
    public async Task PlatformAdmin_Seeder_Creates_Default_Admin_With_PlatformAdmin_Role()
    {
        // Arrange
        var services = new Microsoft.Extensions.DependencyInjection.ServiceCollection();
        using var context = CreateInMemoryDbContext();

        services.AddLogging();
        services.AddIdentityCore<ApplicationUser>(options =>
        {
            options.Password.RequireDigit = false;
            options.Password.RequiredLength = 6;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
        })
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<ApplicationDbContext>();

        services.AddScoped<ApplicationDbContext>(_ => context);

        var serviceProvider = services.BuildServiceProvider();

        // Act: Seed roles and PlatformAdmin
        await DocOS.Infrastructure.Seeding.RoleSeeder.SeedRolesAsync(serviceProvider);

        // Assert: User exists with PlatformAdmin role and null ClinicId
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var admin = await userManager.FindByEmailAsync("platformadmin@docos.com");

        admin.Should().NotBeNull();
        admin!.Email.Should().Be("platformadmin@docos.com");
        admin.FullName.Should().Be("DocOS Platform Admin");
        admin.ClinicId.Should().BeNull();
        admin.IsActive.Should().BeTrue();

        var isPlatformAdmin = await userManager.IsInRoleAsync(admin, Roles.PlatformAdmin);
        isPlatformAdmin.Should().BeTrue();

        var checkPassword = await userManager.CheckPasswordAsync(admin, "Admin@123");
        checkPassword.Should().BeTrue();
    }

    [Fact]
    public async Task E13_UpdateClinicLetterhead_Requires_At_Least_One_Contact_Number()
    {
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Alpha Clinic", Phone = "9876543210" });
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.ClinicAdmin)).Returns(true);

        var handler = new ClinicHandlers(context, mockCurrentUser.Object);

        // Act: Attempt to clear both phone and landline
        var req = new UpdateClinicLetterheadRequest(
            ClinicName: "Alpha Clinic",
            Phone: "",
            Landline: null,
            Email: "info@alpha.com",
            Address: "Delhi",
            LogoUrl: null,
            LetterheadMarginTopMm: 60,
            PrintBottomMarginMm: 0,
            HideLetterheadOnPrint: false,
            ClinicTimings: "10am-5pm"
        );

        var act = () => handler.Handle(new UpdateClinicLetterheadCommand(req), CancellationToken.None);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*At least one contact number*");
    }

    [Fact]
    public async Task E13_UpdateClinicLetterhead_Validates_Max_Digits()
    {
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Alpha Clinic", Phone = "9876543210" });
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.Doctor)).Returns(true);

        var handler = new ClinicHandlers(context, mockCurrentUser.Object);

        // 11-digit mobile
        var reqExcessMobile = new UpdateClinicLetterheadRequest(
            ClinicName: "Alpha Clinic",
            Phone: "98765432101",
            Landline: null,
            Email: null,
            Address: null,
            LogoUrl: null,
            LetterheadMarginTopMm: 60,
            PrintBottomMarginMm: 0,
            HideLetterheadOnPrint: false,
            ClinicTimings: null
        );
        var actMobile = () => handler.Handle(new UpdateClinicLetterheadCommand(reqExcessMobile), CancellationToken.None);
        await actMobile.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Mobile number cannot exceed 10 digits*");

        // 13-digit landline
        var reqExcessLandline = new UpdateClinicLetterheadRequest(
            ClinicName: "Alpha Clinic",
            Phone: null,
            Landline: "0112345678901",
            Email: null,
            Address: null,
            LogoUrl: null,
            LetterheadMarginTopMm: 60,
            PrintBottomMarginMm: 0,
            HideLetterheadOnPrint: false,
            ClinicTimings: null
        );
        var actLandline = () => handler.Handle(new UpdateClinicLetterheadCommand(reqExcessLandline), CancellationToken.None);
        await actLandline.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Landline number cannot exceed 12 digits*");
    }

    [Fact]
    public async Task E13_UpdateClinicLetterhead_Saves_Mobile_And_Landline_Successfully()
    {
        using var context = CreateInMemoryDbContext();
        var clinicId = Guid.NewGuid();
        context.Clinics.Add(new Clinic { Id = clinicId, Name = "Alpha Clinic", Phone = "9876543210" });
        await context.SaveChangesAsync();

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.ClinicId).Returns(clinicId);
        mockCurrentUser.Setup(u => u.IsInRole(Roles.ClinicAdmin)).Returns(true);

        var handler = new ClinicHandlers(context, mockCurrentUser.Object);

        // Save both 10-digit mobile and 11-digit landline
        var req = new UpdateClinicLetterheadRequest(
            ClinicName: "Alpha Care Clinic",
            Phone: "9876543210",
            Landline: "01123456789",
            Email: "care@alphaclinic.com",
            Address: "Connaught Place, New Delhi",
            LogoUrl: null,
            LetterheadMarginTopMm: 65,
            PrintBottomMarginMm: 10,
            HideLetterheadOnPrint: true,
            ClinicTimings: "Mon-Sat 9am-8pm"
        );

        var updated = await handler.Handle(new UpdateClinicLetterheadCommand(req), CancellationToken.None);

        updated.Phone.Should().Be("9876543210");
        updated.Landline.Should().Be("01123456789");

        var dbClinic = await context.Clinics.FindAsync(clinicId);
        dbClinic!.Phone.Should().Be("9876543210");
        dbClinic.Landline.Should().Be("01123456789");
    }
}

