using System.Text.Json.Serialization;
using DocOS.API.Middleware;
using DocOS.API.Services;
using DocOS.Application;
using DocOS.Application.Common.Interfaces;
using DocOS.Infrastructure;
using DocOS.Infrastructure.Persistence;
using DocOS.Infrastructure.Seeding;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Load appsettings.Local.json to override settings locally for local development
var localCandidates = new[]
{
    Path.Combine(builder.Environment.ContentRootPath, "appsettings.Local.json"),
    Path.Combine(AppContext.BaseDirectory, "appsettings.Local.json"),
    Path.Combine(Directory.GetCurrentDirectory(), "src", "DocOS.API", "appsettings.Local.json"),
    Path.Combine(Directory.GetCurrentDirectory(), "appsettings.Local.json")
};

string? loadedLocalPath = null;
foreach (var candidate in localCandidates)
{
    if (File.Exists(candidate))
    {
        builder.Configuration.AddJsonFile(candidate, optional: true, reloadOnChange: true);
        loadedLocalPath = candidate;
        break;
    }
}
builder.Configuration.AddEnvironmentVariables();

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// Clean Architecture Layer registrations
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Dynamic CORS configuration based on environment settings (Cors:AllowedOrigins)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowDocOSClient", policy =>
    {
        // If wildcard '*' or empty in config, allow any origin (with credentials)
        if (allowedOrigins.Length == 0 || allowedOrigins.Contains("*"))
        {
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin)) return false;

                foreach (var pattern in allowedOrigins)
                {
                    if (string.IsNullOrWhiteSpace(pattern)) continue;

                    if (pattern == "*" || pattern.Equals(origin, StringComparison.OrdinalIgnoreCase))
                        return true;

                    // Wildcard matching e.g. "https://*.github.io" or "http://localhost:*"
                    if (pattern.Contains("*"))
                    {
                        var regex = "^" + System.Text.RegularExpressions.Regex.Escape(pattern).Replace("\\*", ".*") + "$";
                        if (System.Text.RegularExpressions.Regex.IsMatch(origin, regex, System.Text.RegularExpressions.RegexOptions.IgnoreCase))
                            return true;
                    }
                }
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
    });
});

// Swagger & OpenAPI with Bearer Auth
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DocOS - OPD Clinic SaaS API",
        Version = "v1",
        Description = "Clean Architecture API for Outpatient Department (OPD) Doctors & Clinics in India."
    });

    var securitySchema = new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Format: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    };

    c.AddSecurityDefinition("Bearer", securitySchema);
    var schemeRef = new OpenApiSecuritySchemeReference("Bearer");
    c.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        { schemeRef, new List<string>() }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "DocOS API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowDocOSClient");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Auto-migrate or ensure database exists & seed Indian Drug Formulary
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    logger.LogInformation("Applying EF Core migrations...");
    await dbContext.Database.MigrateAsync();

    var existingFormularyCount = await dbContext.Medicines.CountAsync(m => m.ClinicId == null);
    if (existingFormularyCount > 0)
    {
        logger.LogInformation("Indian Drug Formulary already seeded ({Count} medicines found in catalog). Skipping seeding.", existingFormularyCount);
    }
    else
    {
        logger.LogInformation("Seeding Indian Drug Formulary (generic salts & top brands)...");
        await IndianDrugFormularySeeder.SeedFormularyAsync(dbContext);
        logger.LogInformation("Indian Drug Formulary seeded successfully.");
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "Note: Database initialization deferred (PostgreSQL might not be reachable yet). Configure your Supabase/Postgres connection string in appsettings.json.");
}

app.Run();
