# DocOS — Phase 2 Architecture Discussions & Design Decisions Record

**Date**: October 2, 2026  
**Document Status**: Final Architecture Review  
**Related Documents**:
- Baseline MVP Specification: [DocOS-(Phase 1).md](file:///c:/Nishant/Code/Antigravity/DocOS/DocOS-%28Phase%201%29.md)
- Active Phase 2 Master Specification: [DocOS-(Phase 2).md](file:///c:/Nishant/Code/Antigravity/DocOS/DocOS-%28Phase%202%29.md)
- Transition Execution Checklist: [DocOS-Phase2-Transition-Steps.md](file:///c:/Nishant/Code/Antigravity/DocOS/DocOS-Phase2-Transition-Steps.md)

---

## 1. Executive Summary

This document captures the architectural deliberations, technical decisions, and design principles agreed upon for transitioning **DocOS** from a single-clinic OPD prototype (Phase 1 / MVP) into a multi-tenant, commercially distributable SaaS with Super Administration and configurable clinical master data (Phase 2 / V2).

---

## 2. Project Separation & Isolation Strategy

### A. Preserving Phase 1 as an Immutable MVP
- **Decision**: Keep Phase 1 locked as a validated baseline (`DocOS-(Phase 1).md`).
- **Rationale**: Ensures the working MVP remains intact and functional for immediate demonstrations or independent deployment without being broken by experimental multi-tenant changes.

### B. Git Branching & Tagging
- **Decision**:
  1. Tag the current `main` branch with `v1.0-mvp`.
  2. Create and push a dedicated feature branch: `phase-2`.
  3. All Phase 2 architectural migrations and portal work will happen strictly on `phase-2`.

### C. Fresh Database for Phase 2
- **Decision**: A brand-new Supabase PostgreSQL project / connection string will be provided by the user for Phase 2.
- **Rationale**:
  - Phase 2 introduces table alterations (`Visits` adding `DoctorId`, `ApplicationUser` decoupling `ClinicId`, new master catalogs).
  - Isolating databases ensures zero risk of destructive migrations or data corruption on Phase 1 MVP records.

---

## 3. RBAC & Identity Evolution: Transitioning to `AspNetUserRoles`

### A. The Phase 1 Limitation
In Phase 1, user roles were stored as a simple string column directly on the `AspNetUsers` table:
```csharp
public class ApplicationUser : IdentityUser
{
    public Guid ClinicId { get; set; }
    public string Role { get; set; } = "Doctor"; // "Doctor" or "Receptionist"
}
```
While ASP.NET Identity tables (`AspNetRoles`, `AspNetUserRoles`) were created by EF Core, they remained unused. This created limitations:
- A user could not hold more than one role (e.g., a clinic owner who is both `ClinicAdmin` and `Doctor`).
- A `PlatformAdmin` (Super Admin) could not exist cleanly because `ClinicId` was non-nullable.
- Granular staff roles (Nurse, Assistant, Pharmacist) could not be assigned dynamically.

### B. The Phase 2 RBAC Design
1. **Activate `AspNetRoles` and `AspNetUserRoles`**:
   - Seed formal roles: `PlatformAdmin`, `ClinicAdmin`, `Doctor`, `Nurse`, `Receptionist`.
   - Manage user-role mappings using standard ASP.NET Identity: `UserManager.AddToRoleAsync(user, role)` and `UserManager.GetRolesAsync(user)`.
   - Store assignments in the relational `AspNetUserRoles` join table.
2. **Support Multi-Role Users**:
   - A doctor running their own practice holds both `ClinicAdmin` and `Doctor` roles.
3. **Decouple PlatformAdmin**:
   - In `ApplicationUser`, `ClinicId` becomes nullable (`Guid?`).
   - `PlatformAdmin` accounts have `ClinicId = null`, granting them platform-wide visibility rather than clinic-scoped boundaries.
4. **JWT Policy Authorization**:
   - JWT token generator emits all assigned roles as `ClaimTypes.Role` claims.
   - ASP.NET Core endpoints are secured via standard attributes: `[Authorize(Roles = "PlatformAdmin")]`, `[Authorize(Roles = "ClinicAdmin,Doctor")]`.

---

## 4. Master Data-Driven Architecture (Observation & Catalog Pattern)

### A. The Challenge with Hardcoded Vitals
In Phase 1, vitals were hardcoded columns on the `Visits` table (`TemperatureF`, `WeightKg`, `HeightCm`, `Bmi`, `PulseBpm`, `SugarFasting`, etc.).
- *Drawback*: Adding any new vital (e.g. Waist Circumference, SpO2 variations, Pediatric head circumference) required EF migrations, C# domain entity updates, DTO updates, and UI changes.

### B. The Architecture Pattern: Master-Transactional / Observation Pattern
In enterprise healthcare systems (such as **HL7 FHIR `ObservationDefinition` & `Observation`**), dynamic clinical measurements are structured via a **Master-Transactional** (or Observation) pattern:

#### 1. Master Table: `VitalMaster` (The Catalog / Definition)
Stores the definition and clinical validation rules of each vital:
- `Id`: Guid
- `ClinicId`: `Guid?` (`null` = global standard; non-null = clinic custom vital)
- `Code`: string (`BP_SYS`, `BP_DIA`, `PULSE`, `TEMP_F`, `SPO2`, `SUGAR_F`, `SUGAR_PP`, `BMI`, `WAIST`)
- `DisplayName`: string ("Blood Pressure (Systolic)", "Fasting Blood Sugar")
- `Unit`: string ("mmHg", "bpm", "°F", "mg/dL", "cm")
- `InputType`: string (`Number`, `Decimal`, `Text`, `Select`)
- `NormalRangeMin` / `NormalRangeMax`: decimal? (Reference ranges for abnormal triage alerting)
- `DisplayOrder`: int
- `IsRequired`: bool
- `IsActive`: bool

#### 2. Tenant Configuration: `ClinicVitalPreference`
Allows a clinic to tailor which vitals it collects:
- Enables / disables specific global vitals (e.g., Pediatrics disables adult fasting sugar, enables birth weight).
- Customizes display order / triage intake sequence.
- Sets clinic-specific mandatory flags.

#### 3. Transactional Table: `VisitVitals` (The Recorded Observation)
Stores the physical measurement recorded during a patient's visit:
- `Id`: Guid
- `VisitId`: Guid (FK &rarr; `Visits`)
- `PatientId`: Guid (FK &rarr; `Patients`)
- `VitalMasterId`: Guid (FK &rarr; `VitalMaster`)
- `Value`: string (e.g. "120", "98.6", "110")
- `Unit`: string (Historical snapshot of the unit)
- `RecordedAt`: DateTime
- `RecordedByUserId`: string (Staff member who captured the reading)

### C. Extension to Other Clinical Catalogs
This exact pattern is applied across the clinical workflow:
- **Lab Investigations**: `LabTestMaster` (Catalog) &rarr; `PrescriptionLabOrders` (Per visit).
- **Chief Complaints**: `ComplaintMaster` (Symptoms dictionary) &rarr; `VisitComplaints` (Recorded symptoms with durations).
- **Dosage Schedules**: `DosageFrequencyMaster` (`1-0-1`, `SOS`, `STAT`) &rarr; `PrescriptionItems`.
- **Clinical Advice**: `AdviceTemplateMaster` (Diet & post-op care snippets) &rarr; `PrescriptionAdvice`.

---

## 5. UI Configuration Screens & RBAC Access Matrix

To ensure non-technical users can configure the application without modifying code, DocOS Phase 2 establishes dedicated UI configuration screens segmented strictly by RBAC roles:

### A. Role-Based Access Matrix

| Configuration Module | PlatformAdmin (Super Admin) | ClinicAdmin (Practice Owner) | Doctor | Receptionist / Nurse |
| :--- | :---: | :---: | :---: | :---: |
| **Global Master Catalog Studio** (`/admin/masters`) | **Full Access** (Platform-wide) | No Access | No Access | No Access |
| **Clinic Vitals Workflow Settings** (`/settings/vitals`) | Audit / Supervise | **Full Access** (Enable/Disable/Reorder) | View / Suggest | Captures vitals dynamically |
| **Clinic Lab Panels** (`/settings/lab-tests`) | Manage Global Tests | **Full Access** (Create custom packages) | **Full Access** | Views on Rx print |
| **Advice & Lifestyle Templates** (`/settings/advice`) | Manage Global Presets | **Full Access** (Clinic templates) | **Full Access** (Doctor presets) | Views on Rx print |
| **Formulary / Custom Medicines** (`/settings/medicines`) | Approve & Promote to Global | Add Clinic Brands | Add / Personal Favorites | Read-only |

---

### B. UI Screen Breakdown

1. **Platform Master Catalog Studio (`/admin/masters`)** — *PlatformAdmin*:
   - `/admin/masters/vitals`: Manage standard vitals across all clinics with reference ranges and units.
   - `/admin/masters/lab-tests`: Manage system diagnostic test dictionary.
   - `/admin/masters/drugs`: Govern the 500+ Indian brand and generic salt formulary.
2. **Clinic Workflow & Vitals Configurator (`/settings/vitals`)** — *ClinicAdmin & Doctor*:
   - Toggle switches to enable/disable specific vitals for the clinic.
   - Drag-and-drop handles to reorder the vitals input sequence.
   - Checkboxes for mandatory intake flags.
   - "Add Custom Clinic Vital" modal for specialty practices (e.g. Pulmonology PEFR).
3. **Lab Investigation Panel Builder (`/settings/lab-tests`)** — *ClinicAdmin & Doctor*:
   - Bundle individual tests into 1-click orderable panels (e.g. *Fever Panel*, *Diabetic Annual Panel*).
4. **Clinical Advice Studio (`/settings/advice`)** — *ClinicAdmin & Doctor*:
   - Pre-configured dietary, lifestyle, and post-consultation advice templates.
5. **Dynamic Intake Modal (`VitalsModal.tsx`)** — *Receptionist & Nurse*:
   - Renders fields dynamically based on the clinic's active `VitalMaster` configuration.
   - Real-time physiological alert badges (amber/red) when readings fall outside `NormalRangeMin` or `NormalRangeMax`.

---

## 6. Multi-Database Provider Strategy (Factory Pattern: MS SQL Server & PostgreSQL)

### A. Business & Developer Need
- **Local Development**: Developer has Microsoft SQL Server locally on their laptop (offline, faster iteration, local SSMS tools).
- **Cloud & Live Demos**: Cloud deployments and live product demos run on Supabase PostgreSQL.
- **Requirement**: Ability to seamlessly switch between local MS SQL Server and cloud PostgreSQL using configuration without rewriting code.

### B. Clean Architecture Compatibility
Because DocOS strictly adheres to Clean Architecture:
- `DocOS.Domain`: Entities (`Clinic`, `Patient`, `Visit`, `Prescription`) are plain POCOs with zero database vendor attributes.
- `DocOS.Application`: Application business rules and MediatR handlers only interface with `IApplicationDbContext` abstractions.
- `DocOS.Infrastructure`: The only layer referencing database provider packages.

### C. Factory Pattern Implementation
1. **Configuration (`appsettings.json` / `appsettings.Development.json`)**:
   ```json
   {
     "DatabaseProvider": "SqlServer", // Options: "SqlServer" or "PostgreSQL"
     "ConnectionStrings": {
       "SqlServer": "Server=localhost;Database=DocOS_V2;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true",
       "PostgreSQL": "Host=db.xxx.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=xxx;SSL Mode=Require;Trust Server Certificate=true"
     }
   }
   ```

2. **Provider Factory in `DependencyInjection.cs`**:
   ```csharp
   var provider = configuration["DatabaseProvider"] ?? "PostgreSQL";

   services.AddDbContext<ApplicationDbContext>(options =>
   {
       if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
       {
           var connStr = configuration.GetConnectionString("SqlServer");
           options.UseSqlServer(connStr, b => 
               b.MigrationsAssembly("DocOS.Infrastructure"));
       }
       else
       {
           var connStr = configuration.GetConnectionString("PostgreSQL");
           options.UseNpgsql(connStr, b => 
               b.MigrationsAssembly("DocOS.Infrastructure"));
       }
   });
   ```

3. **Provider-Specific Migration Organization**:
   - `DocOS.Infrastructure/Migrations/SqlServer` (for local SQL Server)
   - `DocOS.Infrastructure/Migrations/PostgreSQL` (for Supabase cloud)
   - When generating migrations, output to the corresponding directory based on the active provider.

---

## 7. Granular Subscription Management, Metered vs. Unlimited Quotas & SaaS Owner Controls

### A. Business Need & Context
- Clinics in the Indian OPD ecosystem vary drastically in patient volume:
  - Small, starting practices with 150–300 patient visits/month prefer lower-cost, capped/metered plans.
  - Busy solo consultants or polyclinics with 1,000+ patient visits/month demand unlimited plans.
- The SaaS Owner (`PlatformAdmin`) requires total operational flexibility:
  - Both **Starter Clinic** and **Multi-Doctor Practice** tiers must offer both **Metered/Capped** and **Unlimited** options.
  - The SaaS Owner must be able to customize or override visit limits for any specific clinic, add top-ups in multiples (`+250`, `+500`, `+1,000` visits), or toggle a clinic directly to Unlimited.

### B. Core Decisions on Subscription Architecture
1. **Dual-Track Plan Options (Metered vs. Unlimited)**:
   - Every tier can be packaged as Capped or Unlimited.
   - Plans in `SubscriptionPlanMaster` store `IsUnlimitedVisits` (bool) and `DefaultMonthlyVisits` (int?).
2. **SaaS Owner Override Powers (`ClinicSubscription`)**:
   - The active clinic subscription holds `MonthlyVisitQuota` (int?) and `AdditionalTopUpVisits` (int).
   - The SaaS Owner can modify the quota for any clinic at will or grant extra visit top-up blocks.
3. **Usage Metering (`ClinicMonthlyUsage`)**:
   - Increments on completed consultations or generated prescriptions per billing cycle (`YearMonth`).
4. **Clinical Safety Guarantee (Soft Buffer + Read-Only Protection)**:
   - When a clinic reaches its quota, a soft safety buffer (+20 visits) allows in-progress clinics to finish without abrupt system locks.
   - Even when hard capped, all historical patient records, past vitals, and past prescriptions remain 100% accessible in read-only mode to prevent medicolegal risks.
5. **SaaS Owner UI (`/admin/clinics/{id}/subscription`)**:
   - Visual usage percentage bar (`380 / 500 Visits (76%)`).
   - One-click quick top-up buttons: `+250`, `+500`, `+1,000` visits.
   - Unlimited toggle switch and base quota input.
   - Offline payment recording (cash/UPI/cheque) with automatic receipt generation.

---

## 8. Implementation Readiness Checklist

When you are ready to begin Phase 2 code execution:
- [ ] Run Git commands to tag `v1.0-mvp` on `main` and checkout branch `phase-2`.
- [ ] Install `Microsoft.EntityFrameworkCore.SqlServer` NuGet package in `DocOS.Infrastructure`.
- [ ] Configure the `DatabaseProvider` toggle ("SqlServer" for local laptop, "PostgreSQL" for Supabase).
- [ ] Implement Milestone 1: PlatformAdmin authentication, `AspNetRoles` seeding (`PlatformAdmin`, `ClinicAdmin`, `Doctor`, `Nurse`, `Receptionist`), and Super Admin dashboard.
- [ ] Implement Milestone 2: `SubscriptionPlanMaster`, `ClinicSubscription`, and `ClinicMonthlyUsage` tables and SaaS Owner Quota Studio.
- [ ] Implement Milestone 3: `VitalMaster` and `VisitVitals` schema, migrations for both providers, and `/admin/masters` UI.
- [ ] Implement Milestone 4: Clinic tenant onboarding, multi-doctor queue routing, and `/settings/vitals` configurator.


