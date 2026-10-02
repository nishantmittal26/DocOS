# DocOS — Phase 2 Master Specification

Phase 2 turns the single-doctor MVP into a sellable multi-doctor SaaS. It is built as four sequential parts. Each part ships on its own and leaves the previous part working.

| Part | What it delivers |
| :--- | :--- |
| **2A** | Identity, roles, multi-doctor queues, per-doctor letterhead, SQL Server foundation |
| **2B** | Sales onboarding, plans, quotas, SaaS billing history |
| **2C** | Dynamic vitals |
| **2D** | Labs, advice snippets, medicine favorites, public prescription link, OPD fee collection, audit, printed-prescription revisions |
| **Later** | Work that is specified so it is not rebuilt by accident, and is outside Phase 2 execution |

Column-level detail is in [DocOS-Phase2-Database-Schema.md](DocOS-Phase2-Database-Schema.md). The decision record is in [DocOS-Phase2-Architecture-Discussions.md](DocOS-Phase2-Architecture-Discussions.md). Phase 1 stays the locked MVP baseline in `DocOS-(Phase 1).md`.

---

## 1. Locked decisions

1. **Database.** Phase 2 uses Microsoft SQL Server only: local SQL Server on the developer laptop, and a hosted SQL Server instance when the product is deployed. There is one EF Core migration folder, `DocOS.Infrastructure/Migrations`. `Guid` maps to `uniqueidentifier`, date-time maps to `datetime2`, and strings map to `nvarchar`. The Phase 1 database (PostgreSQL via EF Core Npgsql) stays the historical MVP. Phase 2 points at a new SQL Server database. Git: tag current `main` as `v1.0-mvp` and do the work on branch `phase-2`.
2. **Phasing.** Implement only the current part. Do not create tables, screens, or handlers that belong to a later part.
3. **Tenant key.** `ClinicId` on the signed-in user is the tenant key through all of Phase 2. Clinic-scoped handlers refuse a caller whose `ClinicId` is null. PlatformAdmin and SalesAgent therefore cannot read patients, visits, or prescriptions through the clinic APIs. Isolation is this guard plus tests, including a test named “platform admin cannot read clinic clinical records.” SQL Server row-level security is not used.
4. **Identity keys.** `AspNetUsers.Id` is `nvarchar(450)`. `Visit.DoctorId` and `Prescription.DoctorId` are the same string type. They are never `uniqueidentifier`.
5. **Clinic lifecycle.** Subscription status, plan, quota, and doctor cap live on `ClinicSubscription` and `SubscriptionPlanMaster` (part 2B). The `Clinics` table has no status, tier, expiry, or max-doctors column.
6. **Clinical speed stays.** Through 2A and 2B, vitals remain columns on `Visit`, chief complaints remain free text, and dosage remains the existing shorthand string plus the `DosageTiming` enum. Prescription lines keep a snapshot of what was printed. Dynamic vitals arrive in 2C. Complaint dictionaries, dosage master tables, and a pharmacist role are deferred.
7. **Print, queue, formulary.** The React print portal (`@media print`), the visit status lifecycle, the allergy banner, and formulary search (global medicines where `ClinicId` is null, plus that clinic’s custom medicines) keep working after every part.

---

## 2. Inherited stack and codebase

Phase 1 is a working Clean Architecture app. Phase 2 extends it. The Phase 2 database provider is SQL Server.

### Technology

- **Backend:** .NET (`net10.0`). Projects: `DocOS.Domain`, `DocOS.Application`, `DocOS.Infrastructure`, `DocOS.API`.
- **Application style:** CQRS with MediatR, FluentValidation pipeline behaviors, result pattern.
- **Auth:** ASP.NET Core Identity and JWT bearer. Part 2A activates roles and hardens token signing (see 2A).
- **ORM:** EF Core against SQL Server (`UseSqlServer`). One migration history.
- **Frontend:** React with TypeScript and Vite. Existing routes that must keep working: `/`, `/history`, `/patients`, `/consultation/:visitId`, `/settings`.
- **Formulary:** Seeded Indian brands and salts on `Medicines` (`ClinicId` null), plus clinic-custom rows.

### Directory map

```
DocOS/
├── backend/
│   ├── DocOS.slnx
│   └── src/
│       ├── DocOS.Domain/             # Entities
│       ├── DocOS.Application/        # Commands, queries, validators, DTOs
│       ├── DocOS.Infrastructure/     # EF Core SQL Server, Identity, Migrations/, formulary seed
│       └── DocOS.API/                # Controllers, JWT, Program.cs
└── frontend/
    └── src/
        ├── api/
        ├── context/                  # Auth session, role claims
        ├── components/               # Includes VitalsModal and the print portal
        ├── pages/                    # Queue, consultation, history, patients, settings
        └── types/
```

### What Phase 1 already stores (carry forward)

Domain entities use `BaseEntity`: `Id` (`uniqueidentifier`), `CreatedAt`, `UpdatedAt` (`datetime2`).

- **ApplicationUser:** `FullName`, non-null `ClinicId`, and a string `Role` of `Doctor` or `Receptionist`. `AspNetRoles` exists and is unused until 2A. JWT today emits one role claim and `ClinicId`. Handlers filter by the caller’s `ClinicId`. There is no EF global query filter.
- **Clinic:** `Name`, `DoctorName`, `RegNumber`, `Qualifications`, `Specialization`, `Phone`, `Email`, `Address`, `LogoUrl`, `LetterheadMarginTopMm` (default 60), `PatientIdPrefix` (default `DOC`), `LastPatientSequence`. One doctor’s letterhead identity sits on the clinic.
- **Patient:** `ClinicId`, `PatientUid`, `FullName`, `Age` (no date of birth), `Gender`, `MobileNumber`, `Email`, `BloodGroup`, `Address`, `Allergies`, `MedicalHistory`. Unique `(ClinicId, PatientUid)`.
- **Visit:** vital columns `SystolicBp`, `DiastolicBp`, `PulseBpm`, `TemperatureF`, `Spo2`, `WeightKg`, `HeightCm`, `Bmi`, and `Sugar` (one free-text string). Clinical columns: `ChiefComplaints`, `Diagnosis`, `ClinicalNotes`, `FollowUpDate`, `TokenNumber`, `VisitDate`, `Status` (`Waiting`, `InConsultation`, `Completed`, `Cancelled`). No `DoctorId` yet.
- **Prescription:** `VisitId`, `PatientId`, `ClinicId`, `PrescribedAt`, `GeneralAdvice`. No `DoctorId`.
- **PrescriptionItem:** `MedicineName`, `SaltComposition`, `Form`, `Dosage` (for example `1-0-1`), `Timing` (`DosageTiming`), `DurationDays` (`int`), `Instructions`. No required medicine foreign key. Print uses these snapshot columns.
- **Medicine:** `ClinicId` nullable, `BrandName`, `SaltComposition`, `Form`, `Strength`, `Manufacturer`, `IsCustom`.

### Rules for implementers

1. Implement the earliest part whose done-when list is still open. Do not pull a later part’s tables forward. Deferred columns and tables stay in the Later section until a future spec promotes them.
2. Preserve Phase 1 behavior that this spec keeps: patient registration and `PatientUid` sequencing, queue statuses, allergy banner, brand-plus-salt formulary search, dosage shorthand, and the dual-mode letterhead print engine (blank A4 and pre-printed pad).
3. Put entities in `DocOS.Domain`, handlers and DTOs in `DocOS.Application`, EF mappings and SQL Server in `DocOS.Infrastructure`, and controllers that only dispatch MediatR in `DocOS.API`.
4. Authorize with `[Authorize(Roles = "...")]` against `ClaimTypes.Role`. Clinic-scoped handlers also require a non-null `ClinicId` and filter every query by that id.
5. Configure SQL Server with a single connection string and `UseSqlServer`. Generate migrations only under `DocOS.Infrastructure/Migrations`.

---

## 3. Phase 2A — Identity and multi-doctor

**Goal.** A clinic can have several doctors, each with a queue and letterhead identity, on a new SQL Server database. Platform staff can exist without a clinic. The Phase 1 clinical workflow still runs.

### In scope

- Activate `AspNetRoles` and `AspNetUserRoles`. Seed only: `PlatformAdmin`, `SalesAgent`, `ClinicAdmin`, `Doctor`, `Nurse`, `Receptionist`.
- A user may hold more than one role. A clinic owner is `ClinicAdmin` and `Doctor`.
- Remove the string `Role` column from `ApplicationUser` after roles live in `AspNetUserRoles`. The JWT emits every role as `ClaimTypes.Role`, and still emits `ClinicId`.
- `ApplicationUser.ClinicId` becomes `uniqueidentifier` null. Null is allowed only for `PlatformAdmin` and `SalesAgent`. Clinic staff always have a `ClinicId`.
- Move letterhead identity onto the user: `Qualifications`, `MedicalCouncilRegistrationNumber` (today’s clinic `RegNumber`), `Speciality` (today’s `Specialization`), `ConsultationFee` (`decimal(10,2)`). The doctor’s name is `FullName`.
- `Clinics` keeps `Name`, `Phone`, `Email`, `Address`, `LogoUrl`, `LetterheadMarginTopMm`, `PatientIdPrefix`, `LastPatientSequence`. Add `PrintBottomMarginMm` (`int`, default 0), `HideLetterheadOnPrint` (`bit`, default false), and `ClinicTimings` (nullable). When `HideLetterheadOnPrint` is false, print draws the digital letterhead. When it is true, print leaves the letterhead block blank and applies the top and bottom margins so a pre-printed pad lines up.
- Drop clinic columns `DoctorName`, `RegNumber`, `Qualifications`, and `Specialization`.
- `Visit.DoctorId` and `Prescription.DoctorId`: `nvarchar(450)` foreign keys to `AspNetUsers.Id`. `Prescription.DoctorId` is required when a consult is saved. `Visit.DoctorId` is nullable until check-in assigns a doctor, and required before status `InConsultation`. The prescription’s doctor is the visit’s assigned doctor.
- Token numbers are per doctor, per clinic, per calendar day. Unique index `(ClinicId, DoctorId, VisitDate, TokenNumber)` for rows that have a doctor. The receptionist chooses the doctor at check-in. Each doctor has a separate queue.
- Staff invite and deactivate. `ClinicAdmin` invites `Doctor`, `Nurse`, and `Receptionist`. `IsActive` on the user; deactivating hides login and does not delete rows or historical visits.
- Tenant guard described in section 1. `SalesAgent` can be seeded and can sign in. Clinic onboarding UI is part 2B, so `Clinics.OnboardedByUserId` is not added in 2A.
- Auth hardening: the JWT signing key is read from configuration only (remove the in-code fallback secret). Access tokens use a short lifetime suitable for a staff session.
- Keep visit vital columns, free-text `ChiefComplaints`, dosage string, `DosageTiming`, prescription-line snapshots, `PatientIdPrefix`, `LastPatientSequence`, and unique `(ClinicId, PatientUid)`.
- Seed the global Indian formulary (`Medicines.ClinicId` null) into the new database so search behaves as in Phase 1.
- Stand up a new SQL Server database. Tag `main` as `v1.0-mvp`. Develop on `phase-2`.

`AspNetRoleClaims`, `AspNetUserClaims`, `AspNetUserLogins`, and `AspNetUserTokens` are the standard Identity tables EF creates. Part 2A does not design a custom permission-claim model. Authorization is by role.

### Out of scope for 2A

- Subscription tables, quota enforcement, the onboarding wizard, and `OnboardedByUserId`.
- `VitalMaster`, `VisitVitals`, and any rewrite of the vitals modal.
- Labs, advice templates, favorites, OPD fee collection, `PdfShareToken`, audit logs, and prescription revisions.
- `HprId` and every Later item.

### Main tables

Touched: `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, `Clinics`, `Visits`, `Prescriptions`.

Unchanged in shape: `Patients`, `PrescriptionItems`, `Medicines`, and the visit vital columns.

### Main screens

| Screen | Who | Behavior |
| :--- | :--- | :--- |
| `/` queue | Receptionist, Nurse, Doctor, ClinicAdmin | Doctor picker at check-in. Queue filtered by doctor. Status flow unchanged. |
| `/consultation/:visitId` | Doctor (and ClinicAdmin who is also a Doctor) | Letterhead identity comes from the assigned doctor user. Print portal unchanged in structure. |
| `/patients`, `/history` | Clinic staff | Still scoped to `ClinicId`. Allergy banner still reads `Patient.Allergies`. |
| `/settings` | ClinicAdmin | Clinic name, contacts, timings, logo, prefix, and print margins / hide-letterhead. |
| `/settings/staff` | ClinicAdmin | Invite Doctor, Nurse, or Receptionist. Deactivate with `IsActive`. |
| Doctor profile | ClinicAdmin, that Doctor | Qualifications, council number, speciality, consultation fee. |

Nurse records vitals on the existing columns and can see the clinic queue. Prescribing stays with the Doctor role.

### Done when

- [ ] `main` is tagged `v1.0-mvp`. Phase 2 work is on branch `phase-2` against a new SQL Server database.
- [ ] Migrations live only in `DocOS.Infrastructure/Migrations` and apply with `UseSqlServer`.
- [ ] The six roles are seeded. A user can be ClinicAdmin and Doctor. The `Role` string column is gone. JWT contains one `ClaimTypes.Role` per role.
- [ ] PlatformAdmin and SalesAgent have null `ClinicId` and receive an authorization failure from patient, visit, and prescription APIs. The test “platform admin cannot read clinic clinical records” passes.
- [ ] Clinic staff cannot be saved without `ClinicId`.
- [ ] Two doctors in one clinic have independent token sequences on the same calendar day. A visit cannot enter `InConsultation` without `DoctorId`. A saved prescription has `DoctorId`.
- [ ] Print still supports blank A4 and pad margin, using the doctor’s qualifications and council number and the clinic’s logo, margins, and hide-letterhead flag.
- [ ] Deactivated staff cannot sign in. Their past visits still display.
- [ ] Formulary search, allergy banner, free-text complaints, vital columns, and `1-0-1` dosage lines still work.
- [ ] JWT signing key comes from configuration. Access-token lifetime is short.

---

## 4. Phase 2B — Onboarding and entitlements

**Goal.** A PlatformAdmin or SalesAgent can open a clinic, attach a plan and a visit quota, and hand the doctor a login. Usage follows the subscription period. Patient care history stays readable when the quota is exhausted.

### In scope

- Wizard `/admin/onboard-doctor`, four steps:
  1. **Clinic and primary doctor.** Clinic trade name and the doctor’s name, qualifications, council number, speciality, fee, mobile, and email. This creates the clinic and a user with `ClinicAdmin` and `Doctor`.
  2. **Plan and quota.** Choose a `SubscriptionPlanMaster` row and the starting `ClinicSubscription` (including Trial or Active, period dates, and quota or unlimited).
  3. **Letterhead preview.** Blank A4 versus pad margin (`HideLetterheadOnPrint`, `LetterheadMarginTopMm`, `PrintBottomMarginMm`).
  4. **Handover.** On-screen portal URL, username, and password, plus a QR code that opens the login page. The URL is the shared DocOS login. The tenant is the user’s `ClinicId` after sign-in.
- `Clinics.OnboardedByUserId` (`nvarchar(450)`, nullable) and `Clinics.SalesNotes`. A clinic created in 2A receives one `ClinicSubscription` when this part is applied.
- `SubscriptionPlanMaster`: `PlanCode` unique, `PlanName`, `Tier` (`Starter`, `MultiDoctor`, `Enterprise`), `IsUnlimitedVisits`, `DefaultMonthlyVisits` (null when unlimited), `MaxDoctors`, `MaxStaff`, `PriceINR` `decimal(10,2)`, `BillingCycle` (`Monthly`, `Quarterly`, `Annual`), `HasCustomVitals`, `HasLabModule`, `IsActive`. The flags are stored here. The features they name arrive in 2C and 2D.
- `ClinicSubscription`, one row per clinic (unique `ClinicId`): `PlanId`, `IsUnlimitedVisits` override, `MonthlyVisitQuota` (null when unlimited), `AdditionalTopUpVisits` (`int`, default 0), `MaxDoctorsOverride` (`int`, nullable), `Status` (`Trial`, `Active`, `GracePeriod`, `QuotaExceeded`, `Suspended`), `CurrentPeriodStart`, `CurrentPeriodEnd`, `GracePeriodDays` (default 5), `Notes`. This is the only clinic lifecycle status.
- `ClinicPeriodUsage`: `ClinicId`, `SubscriptionId`, `PeriodStart`, `PeriodEnd`, `VisitsConducted`, `LastVisitRecordedAt`. Unique `(ClinicId, PeriodStart)`. Increment `VisitsConducted` once, when a visit first becomes `Completed` (prescription generated). A later prescription revision (2D) does not increment again.
- Allowed visits for the period: unlimited, or `MonthlyVisitQuota + AdditionalTopUpVisits`. After that number, allow 20 further completed visits and show a navbar warning. Past the buffer, block new queue tokens. History, past vitals, and past prescriptions stay readable. Set status `QuotaExceeded` when the hard cap is reached.
- Top-ups apply to the current period only. When the next period starts, `AdditionalTopUpVisits` returns to 0 and a new `ClinicPeriodUsage` row is opened. Unused base quota is not copied forward. PlatformAdmin may raise `MonthlyVisitQuota` or turn on `IsUnlimitedVisits` at any time; the new allowance applies immediately.
- After `CurrentPeriodEnd`, status may be `GracePeriod` for `GracePeriodDays` (default 5). The clinic can keep issuing tokens during grace. After grace, status `Suspended` blocks new tokens and leaves history readable.
- `SubscriptionPaymentHistory` records SaaS invoices: methods `UPI`, `Card`, `NetBanking`, `Cash`, `Cheque`, plus invoice number and UTR (`TransactionReference`). This is the platform’s invoice to the clinic. It is separate from the receptionist’s daily OPD fee (part 2D).
- PlatformAdmin screen `/admin/clinics/{id}/subscription`: usage meter, unlimited toggle, quota input, top-up buttons +250, +500, and +1000, and a manual payment record.
- SalesAgent clinic lists return rows where `OnboardedByUserId` equals that agent’s user id. PlatformAdmin sees every clinic. SalesAgent still cannot open clinical APIs.

### Out of scope for 2B

- Dynamic vitals, labs, advice templates, favorites, public prescription links, OPD collection, and audit logs.
- WhatsApp or SMS handover.
- Subdomain routing.
- Enforcing `HasCustomVitals` or `HasLabModule` before those modules exist. Store the flags only.

### Main tables

`SubscriptionPlanMaster`, `ClinicSubscription`, `ClinicPeriodUsage`, `SubscriptionPaymentHistory`. Columns added on `Clinics`: `OnboardedByUserId`, `SalesNotes`.

### Main screens

`/admin/onboard-doctor`, `/admin/clinics` (PlatformAdmin: all; SalesAgent: own), `/admin/clinics/{id}/subscription` (PlatformAdmin).

### Done when

- [ ] A SalesAgent completes the four-step wizard and sees only clinics they onboarded. The handover screen shows URL, credentials, and a login QR. No message is sent to a phone network.
- [ ] The new clinic has one `ClinicSubscription` and no status column on `Clinics`.
- [ ] Completing a visit increments `ClinicPeriodUsage` for `CurrentPeriodStart`, not for a calendar `YearMonth` string.
- [ ] A top-up increases the current period only. The next period starts at 0 top-up and does not inherit unused quota.
- [ ] From the quota through 20 extra completed visits, the navbar warns and new tokens still issue. Visit 21 beyond the quota is refused. Existing history still opens.
- [ ] PlatformAdmin can set unlimited, edit the quota, add +250 / +500 / +1000, set `MaxDoctorsOverride`, and record a SaaS payment with invoice number and UTR.
- [ ] 2A queues, print, and the tenant guard still pass.

---

## 5. Phase 2C — Dynamic vitals

**Goal.** Each clinic chooses which vitals appear, in which order, with optional range overrides. Historical Phase 1 readings remain visible. Print and the queue read the new rows.

### In scope

- `VitalMaster`: `ClinicId` nullable (null means global), `Code`, `DisplayName`, `Unit`, `InputType`, `NormalRangeMin`, `NormalRangeMax`, `DefaultDisplayOrder`, `IsActive`, and nullable `PairGroup`.
- `InputType`: `Number`, `Decimal`, `Text`, `Select`, `Computed`, `Paired`.
  - **Computed.** BMI is calculated from weight and height. Staff do not type it.
  - **Paired.** Blood pressure is two codes, `BP_SYS` and `BP_DIA`, sharing `PairGroup` `BP`, rendered as one control.
- `ClinicVitalPreference`: `ClinicId`, `VitalMasterId`, `IsEnabled`, `IsMandatory`, `DisplayOrder`, `NormalRangeMinOverride`, `NormalRangeMaxOverride`. Unique `(ClinicId, VitalMasterId)`. A null override uses the master range.
- `VisitVitals`: `VisitId`, `PatientId`, `VitalMasterId`, `ValueText`, `ValueNumeric` `decimal(12,4)` nullable, `UnitSnapshot`, `IsAbnormal`, `RecordedAt`, `RecordedByUserId`. `ValueNumeric` is required when `InputType` is `Number`, `Decimal`, or `Computed`.
- Seed global masters and copy existing visit columns into `VisitVitals`, then stop writing the old columns. After print and the queue read `VisitVitals`, drop the old columns.

| Visit column | Vital code | Input |
| :--- | :--- | :--- |
| `SystolicBp` | `BP_SYS` | Paired, group `BP` |
| `DiastolicBp` | `BP_DIA` | Paired, group `BP` |
| `PulseBpm` | `PULSE` | Number |
| `TemperatureF` | `TEMP_F` | Decimal |
| `Spo2` | `SPO2` | Number |
| `WeightKg` | `WEIGHT` | Decimal |
| `HeightCm` | `HEIGHT` | Decimal |
| `Bmi` | `BMI` | Computed |
| `Sugar` | `SUGAR` | Text |

`Sugar` stays one text vital because Phase 1 stored free text such as `140 PP`. Separate fasting, post-prandial, or random masters are added only when a clinic creates them as custom vitals.

- `/settings/vitals` for ClinicAdmin and Doctor: enable, reorder, mandatory, custom vital, range override. Custom vitals are allowed when the clinic’s plan has `HasCustomVitals`.
- `VitalsModal` renders from that clinic’s enabled preferences, in `DisplayOrder`, with unit labels and out-of-range warning colors. The effective range is the override when set, otherwise the master range.
- `/admin/masters/vitals` for PlatformAdmin: the global catalog.
- Print and queue cards read `VisitVitals`.

### Out of scope for 2C

- Labs, advice, favorites, OPD payments, share tokens, audit, and prescription revisions.
- Complaint dictionaries and dosage master tables.
- Changing `ChiefComplaints` or prescription line columns.

### Main tables

`VitalMaster`, `ClinicVitalPreference`, `VisitVitals`. `Visits` loses the nine vital columns at the end of this part.

### Main screens

`/settings/vitals`, `/admin/masters/vitals`, and the existing queue and consultation flows whose vitals UI is now preference-driven.

### Done when

- [ ] Historical visits show the same readings after the copy, including sugar strings such as `140 PP`.
- [ ] BMI fills from weight and height and is not a typed field. Systolic and diastolic render as one blood-pressure control.
- [ ] A clinic can disable, reorder, mark mandatory, override a range, and add a custom vital (when the plan flag allows).
- [ ] Out-of-range values show a warning color. Print and queue cards match `VisitVitals`.
- [ ] New visits do not write the old vital columns, and those columns are dropped.
- [ ] 2A and 2B flows still pass, including quota checks on completed visits.

---

## 6. Phase 2D — Labs, advice, public link, OPD payments, audit, favorites

**Goal.** The consultation can order labs and attach advice snippets, a doctor can star medicines, a patient can open one shared prescription, reception can record the day’s OPD fees, and printed prescriptions are revised by adding a row.

### In scope

- `LabTestMaster`: `ClinicId` nullable, `TestCode`, `TestName`, `Category`, `SampleType`, `FastingRequired`, `IsActive`.
- `LabTestPanel` and `LabTestPanelItem`. Panels are clinic-scoped (Fever Panel, Diabetic Review). Ordering a panel creates one `PrescriptionLabOrders` row per test.
- `PrescriptionLabOrders`: `PrescriptionId`, `LabTestMasterId`, `SpecialInstructions`, `Status` (`Ordered`, `Completed`).
- `AdviceTemplateMaster`: `ClinicId` nullable, `Category`, `Title`, `InstructionsText`, `IsActive`.
- `PrescriptionAdvice` rows for the snippets selected on a prescription (store the advice text on the row so a later template edit does not change a printed script). `Prescription.GeneralAdvice` remains an optional free-text line.
- `DoctorMedicineFavorite`: `UserId` plus `MedicineId`, unique. Favorites are per doctor. `Medicines` does not gain an `IsDoctorFavorite` flag.
- `Medicines` stays `ClinicId` nullable, `BrandName`, `SaltComposition`, `Form`, `Strength`, `Manufacturer`, `IsCustom`. Optional nullable `DefaultDosage` and `DefaultTiming` may be added in this part to prefill a line. The line still stores its own snapshot. The salt column name stays `SaltComposition`.
- Lab and advice settings screens for ClinicAdmin and Doctor: `/settings/lab-tests` (including the panel bundler) and `/settings/advice`. Global catalogs for PlatformAdmin live under `/admin/masters`. Clinic use of the lab module follows `HasLabModule`.
- `VisitPayment`: `VisitId`, `ClinicId`, `Amount`, `Method` (`Cash`, `UPI`), `Reference`, `CollectedByUserId`, `CollectedAt`. One collection row per visit. Receptionist daily collection report for the clinic. This table is the OPD fee, not `SubscriptionPaymentHistory`.
- `PdfShareToken` on `Prescription`: unique, unguessable, at least 128 bits of entropy, `ExpiresAt` required whenever a token is issued. The public route reads that one prescription and nothing else. No patient list sits behind the token. Rate-limit the public endpoint.
- `AuditLogs`: actions `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `PRINT`. Do not log routine `VIEW` of the queue. `ClinicId` is null for platform actions. `ChangesJson` is an ordinary audit column. The table is a normal SQL table, not a tamper-proof ledger.
- After a prescription is printed (`IsPrinted`, or the first `PRINT` audit), further edits insert a new prescription row with `PreviousPrescriptionId` pointing at the printed row. The visit keeps one current prescription. Older revisions remain. Completing the visit already counted usage in 2B; a revision does not count again.

### Out of scope for 2D

- Every item in section 7.
- `ComplaintMaster`, dosage master tables, and a pharmacist role.

### Main tables

`LabTestMaster`, `LabTestPanel`, `LabTestPanelItem`, `PrescriptionLabOrders`, `AdviceTemplateMaster`, `PrescriptionAdvice`, `DoctorMedicineFavorite`, `VisitPayment`, `AuditLogs`. Extended: `Prescriptions` (token, expiry, `IsPrinted`, `PreviousPrescriptionId`, current-revision marker), `Medicines` (optional defaults only).

### Main screens

`/settings/lab-tests`, `/settings/advice`, favorites on the prescription medicine search, public `/rx/{token}`, receptionist daily collection report, and the subscription studio’s existing SaaS payments left unchanged.

### Done when

- [ ] A doctor orders a panel and the prescription stores one lab row per test, plus optional `GeneralAdvice` and selected advice snippets.
- [ ] Starring a medicine creates a `DoctorMedicineFavorite` for that user only. A global formulary row is not flagged on `Medicines`.
- [ ] A share link opens one prescription until `ExpiresAt`, and does not list patients. The public endpoint is rate-limited.
- [ ] Reception records Cash or UPI against a visit and can list that day’s collections. SaaS invoices remain on `SubscriptionPaymentHistory`.
- [ ] Audit rows exist for create, update, delete, login, and print. Opening the queue does not write a view audit.
- [ ] Editing a printed prescription creates a new revision linked by `PreviousPrescriptionId`. The visit shows the new row. The printed row is unchanged. Usage does not increment again.
- [ ] Print still renders medicines, advice, labs, and letterhead. Parts 2A–2C still pass.

---

## 7. Later

These items are outside Phase 2 execution. Do not add their tables or UI while building 2A–2D.

- **WhatsApp and SMS.** Needs a provider, a template approval, and patient or doctor consent. The 2B handover does not call WhatsApp or SMS.
- **ABDM / NHA APIs.** Optional identifier columns `AbhaNumber`, `AbhaAddress`, `IsAbhaVerified`, `HfrId`, `HprId`, and `EnableAbdmIntegration` wait until this work starts. When they are added, `EnableAbdmIntegration` defaults to false. Storing an identifier is not ABDM compliance. `IsAbhaVerified` stays false until a real verification flow exists. ABDM is not a plan differentiator (`HasAbdmIntegration` is not a column on `SubscriptionPlanMaster`).
- **Subdomain tenant routing and wildcard DNS.** `ClinicId` on the JWT remains the tenant key through Phase 2.
- **Kubernetes, Helm, and white-label packaging.**
- **Analytics dashboards and daily revenue charts** beyond the 2D `VisitPayment` report.
- **`ComplaintMaster` and `VisitComplaints`.** `ChiefComplaints` stays free text.
- **`DosageFrequencyMaster` and `DosageTimingMaster`.** Dosage stays the shorthand string and the `DosageTiming` enum. `DurationDays` stays an `int`.
- **Pharmacist role.**
- **PostgreSQL or Supabase as a Phase 2 provider.**
- **An audit row for every VIEW.**

---

## 8. Companion documents

- [DocOS-Phase2-Database-Schema.md](DocOS-Phase2-Database-Schema.md) — tables, columns, indexes, and an ERD per part.
- [DocOS-Phase2-Architecture-Discussions.md](DocOS-Phase2-Architecture-Discussions.md) — why these choices were locked on 3 October 2026.
- `DocOS-(Phase 1).md` — locked MVP baseline. Do not revise it for Phase 2.
