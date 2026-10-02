# DocOS — Phase 2 Architecture Decision Record

**Revision date:** 3 October 2026  
**Status:** Chosen design for implementation  
**Supersedes:** the 2 October 2026 draft on the points in section 1

Related documents:

- Locked MVP baseline: [DocOS-(Phase 1).md](DocOS-(Phase%201).md)
- Active master spec: [DocOS-(Phase 2).md](<DocOS-(Phase 2).md>)
- Schema by part: [DocOS-Phase2-Database-Schema.md](DocOS-Phase2-Database-Schema.md)

The build order and the done-when lists live in the master spec. This record is why those choices were locked.

---

## 1. What this revision supersedes

| Earlier draft (2 October 2026) | Decision locked on 3 October 2026 |
| :--- | :--- |
| PostgreSQL and SQL Server together, with a provider factory and two migration folders | Phase 2 uses Microsoft SQL Server only. One migration folder |
| One Phase 2 release that included identity, billing, vitals, labs, messaging, and ABDM | Sequential parts 2A, 2B, 2C, 2D, then a Later list that is not executed with them |
| `DosageFrequencyMaster` and `DosageTimingMaster` | Dosage stays the shorthand string (`1-0-1`) and the existing `DosageTiming` enum. `DurationDays` stays an `int` |
| `ComplaintMaster` in Phase 2 | `ChiefComplaints` stays free text |
| ABDM treated as compliance, with a plan flag and identifier columns in Phase 2 | ABDM is deferred. Storing an identifier is not compliance. `IsAbhaVerified` stays false until a real verification flow exists. `EnableAbdmIntegration` defaults to false when those columns are added later |
| `ClinicMonthlyUsage.YearMonth` | `ClinicPeriodUsage` follows the subscription period (`PeriodStart`, `PeriodEnd`) |
| `Clinics.Status`, tier, expiry, and max doctors copied onto the clinic row | The clinic lifecycle lives only on `ClinicSubscription`. Doctor cap is the plan’s `MaxDoctors`, overridable with `MaxDoctorsOverride` |
| `IsDoctorFavorite` on `Medicines` | `DoctorMedicineFavorite` is unique on `(UserId, MedicineId)` |
| `DoctorId` as `uniqueidentifier` | `Visit.DoctorId` and `Prescription.DoctorId` are `nvarchar(450)`, the Identity user id |

---

## 2. Why these choices

**One database provider.** Two migration sets mean every schema change is written, reviewed, and repaired twice, and the folders drift. Phase 2 development and the hosted deployment both use SQL Server. The Phase 1 PostgreSQL database stays the tagged MVP snapshot. It is not altered in place, and Phase 2 does not point at it.

**Four parts.** The October 2 scope was larger than one release: roles, onboarding, quotas, dynamic vitals, labs, a public link, payments, and audit. A part is allowed to ship only when the previous part still runs. Identity and multi-doctor queues (2A) stand alone before billing (2B). Vitals stay columns until 2C. Labs and the public link wait until 2D.

**Free-text complaints and stable dosage shorthand.** Indian OPD notes are written as a line such as “Fever x 3 days, dry cough x 1 week,” and the printed dose is already `1-0-1` plus a meal timing. Dictionary tables on that path add lookups and do not change the paper. Those masters are on the Later list.

**Usage follows the invoice period.** A quarterly or annual clinic does not have a calendar `YearMonth` that matches what they paid for. `ClinicPeriodUsage` counts completed visits between `CurrentPeriodStart` and `CurrentPeriodEnd`. A top-up adds visits to that period only. Unused base quota is not copied into the next period. PlatformAdmin can still raise `MonthlyVisitQuota` or switch the clinic to unlimited immediately.

**Favorites are per doctor.** A global formulary row is shared by every clinic. One boolean on that row cannot mean “Dr A’s shortcut” without changing the row for everyone else. The favorite is a link from `AspNetUsers.Id` to `Medicines.Id`.

**Identity ids are strings.** ASP.NET Core Identity primary keys in this codebase are `nvarchar(450)`. A `uniqueidentifier` doctor foreign key would not match `AspNetUsers.Id`.

**Audit is a normal table.** `AuditLogs.ChangesJson` supports review of creates, updates, deletes, logins, and prints. It is a SQL table with a JSON column. Phase 2 does not claim a tamper-proof ledger, and it does not write a row for every queue view.

**Handover is on screen.** WhatsApp or SMS needs a provider, an approved template, and consent. Part 2B shows the login URL, the credentials, and a QR code that opens the login page. Message delivery stays on the Later list.

---

## 3. Phase 1 facts this design sits on

The working MVP is Clean Architecture (`DocOS.Domain`, `DocOS.Application`, `DocOS.Infrastructure`, `DocOS.API`), CQRS with MediatR, and a React + Vite client. Routes already in use: `/`, `/history`, `/patients`, `/consultation/:visitId`, `/settings`. Print is a React portal plus `@media print`.

Today `ApplicationUser` has a non-null `ClinicId` and a string `Role` of `Doctor` or `Receptionist`. `AspNetRoles` is created and unused. JWT emits one role and `ClinicId`. Handlers filter by clinic in code. There is no EF global query filter. JWT lifetime is long (days), and the signing key has a hardcoded fallback. Part 2A removes that fallback and shortens the access token. This record does not describe how to abuse the fallback.

Doctor letterhead fields sit on `Clinic` (`RegNumber`, `Qualifications`, `Specialization`). Vitals are columns, including one free-text `Sugar`. `PrescriptionItem` stores `SaltComposition`, a dosage string, `DosageTiming`, and `DurationDays`. `Medicine.ClinicId` null is the shared formulary. `Manufacturer` is already on `Medicine`.

---

## 4. SQL Server connection

Phase 2 configuration has one connection string. Infrastructure calls `UseSqlServer` and stores migrations in `DocOS.Infrastructure/Migrations`.

`Guid` is `uniqueidentifier`. Date-time is `datetime2`. Strings are `nvarchar`. Identity keys and doctor foreign keys are `nvarchar(450)`.

Local development uses SQL Server on the laptop. A later hosted environment uses the same provider and the same connection-string name, with a hosted server value.

```json
{
  "ConnectionStrings": {
    "DocOS": "Server=localhost;Database=DocOS;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
}
```

There is no `DatabaseProvider` key and no second connection string in the Phase 2 plan.

When implementation starts: tag `main` as `v1.0-mvp`, branch `phase-2`, and create an empty SQL Server database for that branch.

---

## 5. Identity, tenancy, and queues (part 2A)

Seeded roles are only `PlatformAdmin`, `SalesAgent`, `ClinicAdmin`, `Doctor`, `Nurse`, and `Receptionist`. A clinic owner holds `ClinicAdmin` and `Doctor`. The string `Role` column is removed once `AspNetUserRoles` is populated. The JWT emits each role as `ClaimTypes.Role`.

`ClinicId` is null only for PlatformAdmin and SalesAgent. Every clinic staff user has a clinic. Clinic-scoped handlers reject a null `ClinicId`, so platform roles cannot read patients, visits, or prescriptions through those APIs. The regression test is named “platform admin cannot read clinic clinical records.” SQL Server row-level security is not part of the design.

`SalesAgent` may exist in 2A. The column `Clinics.OnboardedByUserId` and the onboarding screens arrive in 2B, and that is what limits an agent to their own clinics.

Letterhead identity moves to the user: `Qualifications`, `MedicalCouncilRegistrationNumber`, `Speciality`, `ConsultationFee`. `HprId` stays off the 2A table. The clinic keeps its trade name, contacts, logo, `LetterheadMarginTopMm` (default 60), `PatientIdPrefix`, `LastPatientSequence`, and gains `PrintBottomMarginMm` (default 0), `HideLetterheadOnPrint` (default false), and `ClinicTimings`.

The receptionist selects the doctor at check-in. Token numbers are unique per clinic, doctor, and calendar day. `Prescription.DoctorId` is required when the consult is saved. Visit vitals, free-text complaints, dosage shorthand, prescription snapshots, the allergy banner, formulary search, and the print portal stay as they are in 2A.

Staff deactivation sets `IsActive` and leaves the row, so past visits still name that person.

Standard Identity tables (`AspNetRoleClaims`, `AspNetUserClaims`, `AspNetUserLogins`, `AspNetUserTokens`) are created by EF. Part 2A does not invent a parallel permission vocabulary. Endpoints use role authorization.

---

## 6. Onboarding and entitlements (part 2B)

The wizard `/admin/onboard-doctor` has four steps: clinic and primary doctor, plan and quota, letterhead preview (blank A4 versus pad margin), and on-screen handover. The QR target is the shared login page. Tenant resolution remains the `ClinicId` claim.

`SubscriptionPlanMaster` holds `PlanCode`, tier (`Starter`, `MultiDoctor`, `Enterprise`), unlimited versus `DefaultMonthlyVisits`, `MaxDoctors`, `MaxStaff`, `PriceINR`, billing cycle (`Monthly`, `Quarterly`, `Annual`), and the flags `HasCustomVitals` and `HasLabModule`. Those flags may be stored in 2B. The modules they describe are 2C and 2D. There is no ABDM selling flag.

`ClinicSubscription` is one row per clinic and is the only place status is stored: `Trial`, `Active`, `GracePeriod`, `QuotaExceeded`, `Suspended`. `GracePeriodDays` defaults to 5. `MaxDoctorsOverride` lets PlatformAdmin raise or lower the plan cap for one clinic.

Completed visits increment `ClinicPeriodUsage.VisitsConducted` once. Allowance is unlimited, or `MonthlyVisitQuota + AdditionalTopUpVisits`. Twenty further completed visits are a soft buffer with a navbar warning. Beyond that, new tokens stop. History, past vitals, and past prescriptions stay readable. Top-up buttons on `/admin/clinics/{id}/subscription` are +250, +500, and +1000 for the current period.

`SubscriptionPaymentHistory` is the platform invoice (UPI, Card, NetBanking, Cash, Cheque, invoice number, UTR). The receptionist’s OPD fee is a different table in 2D (`VisitPayment`).

---

## 7. Vitals (part 2C) and what stays a snapshot

`VitalMaster` plus `ClinicVitalPreference` plus `VisitVitals` replace the vital columns only in 2C. Preferences carry enable, mandatory, order, and nullable range overrides. Paired blood pressure uses `PairGroup` (`BP_SYS` and `BP_DIA`). BMI is `Computed` from weight and height. Sugar is one `Text` vital (`SUGAR`) because existing values look like `140 PP`. Clinics add fasting or post-prandial codes themselves if they want them.

The backfill map is `SystolicBp` → `BP_SYS`, `DiastolicBp` → `BP_DIA`, `PulseBpm` → `PULSE`, `TemperatureF` → `TEMP_F`, `Spo2` → `SPO2`, `WeightKg` → `WEIGHT`, `HeightCm` → `HEIGHT`, `Bmi` → `BMI`, `Sugar` → `SUGAR`. Print and queue cards then read `VisitVitals`, and the old columns are dropped.

Prescription lines keep `MedicineName`, `SaltComposition`, `Form`, `Dosage`, `Timing`, `DurationDays`, and `Instructions` in every part. That snapshot is what print shows if the formulary row later changes.

---

## 8. Part 2D boundaries

Labs need `LabTestMaster` and clinic-scoped `LabTestPanel` / `LabTestPanelItem`, because the panel UI (Fever Panel, Diabetic Review) has to persist a bundle. An ordered panel becomes one `PrescriptionLabOrders` row per test (`Ordered`, `Completed`).

Advice snippets are `AdviceTemplateMaster` and `PrescriptionAdvice`, with the text copied onto the prescription row. `GeneralAdvice` stays for a typed line.

After `IsPrinted` or the first `PRINT` audit, an edit creates a new prescription linked by `PreviousPrescriptionId`. The visit has one current row. The printed row is left as it was. The usage counter does not move again.

`PdfShareToken` is unique, unguessable (at least 128 bits of entropy), and has a required `ExpiresAt`. The public endpoint returns that prescription only and is rate-limited.

`VisitPayment` (`Cash`, `UPI`) feeds the receptionist daily collection report.

---

## 9. Explicitly later

WhatsApp and SMS; ABDM and the identifier columns (`AbhaNumber`, `AbhaAddress`, `IsAbhaVerified`, `HfrId`, `HprId`, `EnableAbdmIntegration`); subdomain routing; Kubernetes, Helm, and white-label packaging; analytics beyond the 2D collection table; complaint masters; dosage master tables; a pharmacist role; a PostgreSQL provider; auditing every view.

Implementers do not add these tables while a Phase 2 part is in progress.

---

## 10. Exit criteria

Work the parts in order. Leave the previous part working. Do not start a later part’s tables early.

### 2A — Identity and multi-doctor

- [ ] `v1.0-mvp` tag exists. Branch `phase-2` uses a new SQL Server database and a single `Migrations` folder.
- [ ] Six roles seeded. Multi-role users work. `Role` column removed. JWT lists every role.
- [ ] Null `ClinicId` only for PlatformAdmin and SalesAgent. Clinic APIs reject them. Test “platform admin cannot read clinic clinical records” passes.
- [ ] Per-doctor daily tokens, doctor required before `InConsultation`, `Prescription.DoctorId` required on save.
- [ ] Letterhead uses the user profile and the clinic print flags. Print, queue, allergy banner, and formulary search still work.
- [ ] Signing key comes from configuration. Access-token lifetime is short. Staff deactivate with `IsActive`.

### 2B — Onboarding and entitlements

- [ ] Four-step wizard and on-screen handover with a login QR. SalesAgent sees only clinics they onboarded.
- [ ] One `ClinicSubscription` per clinic. No status column on `Clinics`.
- [ ] Usage row is per subscription period. Top-ups and unused quota do not roll forward.
- [ ] Soft buffer of 20 completed visits, then new tokens block, history stays readable.
- [ ] PlatformAdmin quota studio: meter, unlimited, quota, +250 / +500 / +1000, `MaxDoctorsOverride`, manual SaaS payment.

### 2C — Dynamic vitals

- [ ] Historical readings copied, including free-text sugar. BMI computed. Blood pressure rendered as one pair.
- [ ] Clinic preferences: enable, order, mandatory, custom vital, range override. Global catalog for PlatformAdmin.
- [ ] Print and queue read `VisitVitals`. Old vital columns are no longer written, then dropped.

### 2D — Labs, advice, link, OPD fees, audit, favorites

- [ ] Panels expand to lab order rows. Advice snippets plus `GeneralAdvice` print.
- [ ] Favorites are per user, not a flag on `Medicines`.
- [ ] Public token opens one prescription, expires, and is rate-limited.
- [ ] `VisitPayment` daily report is separate from SaaS invoices.
- [ ] Audit covers create, update, delete, login, and print, and skips routine queue views. `ChangesJson` is a normal column.
- [ ] A printed prescription is revised by inserting a row with `PreviousPrescriptionId`. Usage is not incremented again.

---

## 11. How to read the set

Start with [DocOS-(Phase 2).md](<DocOS-(Phase 2).md>) for the part you are building. Use [DocOS-Phase2-Database-Schema.md](DocOS-Phase2-Database-Schema.md) for columns and ERDs, including the “not in this schema” list. Keep [DocOS-(Phase 1).md](DocOS-(Phase%201).md) unchanged as the MVP baseline.
