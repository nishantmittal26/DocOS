using DocOS.Domain.Common;
using DocOS.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace DocOS.Infrastructure.Seeding;

public static class RoleSeeder
{
    public static async Task SeedRolesAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        await SeedPlatformAdminAsync(serviceProvider);
    }

    public static async Task SeedPlatformAdminAsync(IServiceProvider serviceProvider)
    {
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = serviceProvider.GetService<ILoggerFactory>()?.CreateLogger("DocOS.Infrastructure.Seeding.RoleSeeder");

        const string adminEmail = "platformadmin@docos.com";

        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                FullName = "DocOS Platform Admin",
                PhoneNumber = "+919999999999",
                ClinicId = null,
                IsActive = true,
                CreatedAt = IndiaTime.Now
            };

            var createResult = await userManager.CreateAsync(adminUser, "Admin@123");
            if (createResult.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, Roles.PlatformAdmin);
                logger?.LogInformation("Successfully seeded default PlatformAdmin user: {Email}", adminEmail);
            }
            else
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                logger?.LogError("Failed to seed default PlatformAdmin user: {Errors}", errors);
            }
        }
        else
        {
            if (!await userManager.IsInRoleAsync(adminUser, Roles.PlatformAdmin))
            {
                await userManager.AddToRoleAsync(adminUser, Roles.PlatformAdmin);
                logger?.LogInformation("Assigned PlatformAdmin role to existing user: {Email}", adminEmail);
            }

            if (!await userManager.CheckPasswordAsync(adminUser, "Admin@123"))
            {
                adminUser.PasswordHash = userManager.PasswordHasher.HashPassword(adminUser, "Admin@123");
                await userManager.UpdateAsync(adminUser);
                logger?.LogInformation("Reset PlatformAdmin password to default for: {Email}", adminEmail);
            }
        }
    }
}

