using DocOS.Application.Common.Interfaces;
using DocOS.Application.Subscriptions;
using DocOS.Domain.Common;
using DocOS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace DocOS.Tests;

public class LocalDbSubscriptionDetailTests
{
    private const string LocalConnection =
        "Server=localhost;Database=DocOS_Dev;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

    [Fact]
    public async Task GetClinicSubscriptionDetail_Loads_Sanjeevani_From_Local_Dev_Database()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(LocalConnection)
            .Options;

        await using var context = new ApplicationDbContext(options);
        if (!await context.Database.CanConnectAsync())
        {
            return;
        }

        var sanjeevaniId = Guid.Parse("7F10FD27-E898-4B04-8315-309C67E936A9");
        if (!await context.Clinics.AnyAsync(c => c.Id == sanjeevaniId))
        {
            return;
        }

        var mockCurrentUser = new Mock<ICurrentUserService>();
        mockCurrentUser.Setup(u => u.IsInRole(Roles.PlatformAdmin)).Returns(true);

        var mockIdentityService = new Mock<IIdentityService>();
        var handlers = new SubscriptionHandlers(context, mockCurrentUser.Object, mockIdentityService.Object);

        var detail = await handlers.Handle(new GetClinicSubscriptionDetailQuery(sanjeevaniId), CancellationToken.None);

        detail.ClinicName.Should().Be("Sanjeevani Clinic");
        detail.PlanName.Should().NotBeNullOrWhiteSpace();
        detail.PaymentHistory.Should().NotBeNull();
    }
}
