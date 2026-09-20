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

// CORS for React Vite frontend (http://localhost:5173) and any local network access
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowDocOSClient", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
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

    logger.LogInformation("Seeding Indian Drug Formulary (500+ generic salts & top brands)...");
    await IndianDrugFormularySeeder.SeedFormularyAsync(dbContext);
    logger.LogInformation("Formulary seeding check completed.");
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "Note: Database initialization deferred (PostgreSQL might not be reachable yet). Configure your Supabase/Postgres connection string in appsettings.json.");
}

app.Run();
