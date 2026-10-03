using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using DocOS.Domain.Common;
using DocOS.Infrastructure.Identity;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DocOS.Tests;

public class LocalApiSubscriptionDetailTests
{
    [Fact]
    public async Task Admin_Subscription_Endpoint_Returns_Sanjeevani_Detail_When_Api_Is_Running()
    {
        var appsettingsPath = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "DocOS.API", "appsettings.Local.json"));

        var config = new ConfigurationBuilder()
            .AddJsonFile(appsettingsPath, optional: true)
            .Build();

        if (string.IsNullOrWhiteSpace(config["Jwt:Secret"]))
        {
            return;
        }

        using var client = new HttpClient { BaseAddress = new Uri("http://localhost:5107") };
        try
        {
            using var probe = await client.GetAsync("/swagger/index.html");
            if (!probe.IsSuccessStatusCode)
            {
                return;
            }
        }
        catch (HttpRequestException)
        {
            return;
        }

        var tokenGenerator = new JwtTokenGenerator(config);
        var token = tokenGenerator.GenerateToken(
            userId: Guid.NewGuid().ToString(),
            email: "integration-test@docos.local",
            fullName: "Integration Test",
            clinicId: null,
            roles: new[] { Roles.PlatformAdmin });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var sanjeevaniId = Guid.Parse("7F10FD27-E898-4B04-8315-309C67E936A9");
        var response = await client.GetAsync($"/api/admin/clinics/{sanjeevaniId}/subscription");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("clinicName").GetString().Should().Be("Sanjeevani Clinic");
        doc.RootElement.GetProperty("paymentHistory").GetArrayLength().Should().BeGreaterThanOrEqualTo(0);

        var clinicsResponse = await client.GetAsync("/api/admin/clinics");
        clinicsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var clinicsDoc = JsonDocument.Parse(await clinicsResponse.Content.ReadAsStringAsync());
        var sanjeevani = clinicsDoc.RootElement.EnumerateArray()
            .FirstOrDefault(e => e.GetProperty("clinicName").GetString() == "Sanjeevani Clinic");
        sanjeevani.ValueKind.Should().NotBe(JsonValueKind.Undefined);
        sanjeevani.GetProperty("clinicId").GetString().Should().Be(sanjeevaniId.ToString());
    }
}
