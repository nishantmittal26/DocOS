# Project Name: DocOS — Phase 2 (V2) Master Prompt & Architecture Plan

## 1. Overview & Objective
DocOS Phase 2 expands the validated Phase 1 (MVP) single-clinic OPD platform into a distributed, multi-tenant SaaS ready for commercial distribution. Key pillars of Phase 2 include:
- **Platform-level Super Administration**: Multi-tenant management, clinic onboarding, and subscription controls.
- **Multi-Doctor Practice & RBAC**: Multiple doctors and staff roles per clinic.
- **Master Data-Driven (Observation & Catalog) Architecture**: Granular, configurable master tables for vitals, lab investigations, chief complaints, and clinical advice.
- **Dedicated Master Configuration UIs**: Role-tiered UI screens allowing Super Admins and Clinic Admins to configure workflows dynamically.
- **Distribution & Multi-Tenancy Architecture**: Cloud packaging, Docker Compose, custom domains/subdomains.
- **Digital Patient Experience**: WhatsApp/SMS prescription delivery and QR code verification.
- **Practice Analytics & ABDM Compliance**: Daily revenue tracking and digital health records alignment.

---

## 2. Phase 2 (V2) Roadmap & Architecture Plan

### A. Super Admin / Platform Admin Portal
- **Platform-wide Super Admin Login**:
  - Dedicated Super Admin role (`PlatformAdmin`) separated from individual clinic accounts.
  - Centralized dashboard displaying platform metrics: total registered clinics, active doctors, total OPD consultations conducted, patient volume, and system uptime.
- **Clinic Onboarding & Tenant Management**:
  - Self-service or admin-assisted clinic registration (create clinic, allocate clinic prefix, assign primary doctor).
  - Tenant status control: Active, Trial, Suspended, Deactivated.
  - Subscription / Plan Tier management (e.g., Free Trial, Starter Clinic, Multi-Doctor Practice).
- **Global Master Data Studio**:
  - Super Admin ability to govern global master catalogs (Vitals, Lab Tests, Complaints, Frequencies, 500+ Indian Drug Formulary).
  - Review and approve crowd-sourced custom medicines submitted by individual clinics.

### B. Multi-Doctor & Staff Access Management per Clinic
- **Multi-Doctor Practice Support**:
  - Allow multiple doctors under a single clinic tenant.
  - Doctor-specific OPD queues and consultation rooms.
  - Separate letterhead credentials and council registration numbers per doctor.
- **Role-Based Access Control (RBAC)**:
  - Granular permissions: `PlatformAdmin`, `ClinicAdmin`, `Doctor`, `Nurse/Assistant`, `Receptionist`, `Pharmacist`.
  - Clinic Admin can invite staff members, reset staff passwords, and define access rights.

### C. Distribution, Packaging & Multi-Tenancy Architecture
- **Tenant Resolution & Routing**:
  - Support subdomain tenant resolution (e.g., `apollo-opd.docos.in`, `cityclinic.docos.in`) or header-based tenant identification.
- **Self-Hosted & Enterprise Cloud Distribution**:
  - Single-click deployment templates (Docker Compose, Kubernetes Helm charts).
  - Pre-configured environment variables for easy white-labeling and clinic branding.
  - Automated tenant onboarding wizard with welcome email and credentials setup.

### D. Digital Patient Experience & Communication
- **WhatsApp & SMS Rx Delivery**:
  - Direct delivery of prescription PDF download link to patient's 10-digit Indian WhatsApp/mobile number.
  - Automated follow-up appointment reminder alerts.
- **Digital Patient Portal / Rx QR Code**:
  - Secure QR code printed on prescriptions allowing patients to view their digital prescription online.

### E. Analytics, Billing & Universal ABDM Readiness
- **Clinic Financials & Daily Collection**:
  - Cash / UPI consultation fee collection tracker for receptionists.
  - Daily OPD revenue reports and reconciliation.
- **Audit Logs & Universal ABDM (Ayushman Bharat Digital Mission) Integration**:
  - Tamper-proof audit logs for clinical record modifications.
  - **Universal ABDM Readiness across all tiers**: Built for single-doctor clinics and multi-doctor practices alike (not restricted to enterprise).
  - **Configurable per clinic**: Toggled ON or OFF via clinic settings (`EnableAbdmIntegration`).
  - Supports ABHA ID (Ayushman Bharat Health Account) capture (`AbhaNumber`, `AbhaAddress`), doctor HPR ID (Healthcare Professional Registry), and clinic HFR ID (Health Facility Registry).

---

## 3. Database Schema Changes & RBAC Architecture

### A. ASP.NET Identity & RBAC Evolution (`AspNetUserRoles` & `AspNetRoles`)
In Phase 1, roles were simplified into a single column `Role` on `AspNetUsers` ("Doctor" or "Receptionist"). In Phase 2, we transition to **full ASP.NET Core Identity RBAC**:

1. **Activate `AspNetRoles` and `AspNetUserRoles`**:
   - Seed defined roles into `AspNetRoles`:
     - `PlatformAdmin` (Global SaaS administration)
     - `ClinicAdmin` (Practice owner / clinic management)
     - `Doctor` (OPD consultation & prescribing)
     - `Receptionist` (Patient registration, token queue, preliminary vitals)
     - `Nurse` (Vitals & clinical assistance)
   - Assign roles via `UserManager.AddToRoleAsync(user, role)` and store relationships in `AspNetUserRoles`.
   - Support multiple roles per user (e.g., a Clinic Owner can hold both `ClinicAdmin` and `Doctor` roles).
   - In JWT claims, emit all user roles so frontend routing and backend policy authorization (`[Authorize(Roles = "...")]`) work natively.

2. **`ApplicationUser` (`AspNetUsers`) Changes**:
   - `ClinicId` becomes nullable (`Guid?`) — `null` for `PlatformAdmin` (who does not belong to any specific clinic tenant).
   - Doctor credentials moved to user-level:
     - `Qualifications` (e.g. MBBS, MD Medicine)
     - `MedicalCouncilRegistrationNumber`
     - `HprId` (Healthcare Professional Registry ID for ABDM doctor verification)
     - `Speciality` (e.g. General Physician, Pediatrics)
     - `ConsultationFee`
   - Active status flag: `IsActive` (bool) to allow disabling staff accounts without deleting user data.

### B. Table Structural Modifications for Phase 2

1. **`Clinics` Table Extensions**:
   - `Status`: `Active`, `Trial`, `Suspended`, `Deactivated`.
   - `SubscriptionTier`: `FreeTrial`, `StarterClinic`, `MultiDoctorPractice`, `Enterprise`.
   - `SubscriptionExpiresAt`: `DateTime?`
   - `MaxDoctorsAllowed`: `int` (default `1` for starter, higher for multi-doctor).
   - `Subdomain`: `string?` (unique slug, e.g. `careclinic`).
   - `HfrId`: `string?` (Health Facility Registry ID for ABDM clinic accreditation).
   - `EnableAbdmIntegration`: `bool` (configurable toggle per clinic: true = enables ABHA intake & linking).

2. **`Patients` Table ABDM Extensions**:
   - `AbhaNumber`: `string?` (14-digit Ayushman Bharat Health Account number: `XX-XXXX-XXXX-XXXX`).
   - `AbhaAddress`: `string?` (ABDM Personal Health Record handle, e.g. `patient@abdm`).
   - `IsAbhaVerified`: `bool` (flag indicating verified ABHA record via OTP/demographics).

3. **`Visits` (OPD Queue) Table Modifications**:
   - Add `DoctorId`: `Guid?` (foreign key pointing to `AspNetUsers.Id`).
   - Enables separate OPD queues per doctor within the same multi-doctor clinic.
   - Receptionist can route a patient to Dr. A or Dr. B at check-in.

4. **`Prescriptions` Table Modifications**:
   - Explicit `DoctorId`: `Guid` (ensures prescriptions are linked directly to the consulting doctor's council registration number and signature, even in multi-doctor practices).
   - `PdfShareToken`: `string?` (unique secure token for WhatsApp / QR code online prescription viewer).

5. **New `AuditLogs` Table**:
   - `Id`, `TenantId`, `UserId`, `Action` (Create, Update, Delete, View), `EntityName`, `EntityId`, `Timestamp`, `IpAddress`, `ChangesJson`.

### C. Multi-Database Provider Architecture (Factory Pattern: SQL Server & PostgreSQL)
To support both **local offline development** (Microsoft SQL Server on laptop) and **online cloud deployments / demos** (Supabase PostgreSQL):
1. **Configurable Provider Switch**:
   - A single setting `"DatabaseProvider": "SqlServer"` (or `"PostgreSQL"`) in `appsettings.json`.
2. **Provider Factory in `DependencyInjection.cs`**:
   - Automatically switches EF Core provider between `.UseSqlServer()` and `.UseNpgsql()` based on configuration.
   - Clean Architecture domain and application layers remain 100% database-agnostic.
3. **Dedicated Migration Folders**:
   - `DocOS.Infrastructure/Migrations/SqlServer` for local SQL Server migrations.
   - `DocOS.Infrastructure/Migrations/PostgreSQL` for cloud Supabase migrations.

---

## 4. Master Data-Driven Architecture (Observation & Catalog Pattern)

In Phase 1, vitals and clinical elements were hardcoded columns on the `Visits` table. In Phase 2, DocOS adopts the **Master Data Management (MDM) / Observation Pattern** (aligned with HL7 FHIR Observation standards). 

This completely eliminates schema alterations when adding new vitals, tests, or clinical inputs, and makes the system 100% dynamic and configurable.

### A. Core Master-Transactional Catalogs

| Clinical Domain | Master Catalog Table (Definitions) | Transactional Table (Per Visit / Consultation) |
| :--- | :--- | :--- |
| **Vitals & Measurements** | `VitalMaster` | `VisitVitals` |
| **Lab Investigations** | `LabTestMaster` & `LabTestPanel` | `PrescriptionLabOrders` |
| **Chief Complaints** | `ComplaintMaster` | `VisitComplaints` |
| **Dosage Schedules** | `DosageFrequencyMaster` | `PrescriptionItems` |
| **Dosage Timings** | `DosageTimingMaster` | `PrescriptionItems` |
| **Advice & Instructions** | `AdviceTemplateMaster` | `PrescriptionAdvice` |

### B. Detailed Master Table Structures

1. **`VitalMaster` (Observation Catalog)**:
   - `Id`: `Guid` (Primary Key)
   - `ClinicId`: `Guid?` — `null` indicates a **Global System Master** available to all clinics; non-null indicates a **Clinic Custom Vital**.
   - `Code`: `string` (e.g. `BP_SYS`, `BP_DIA`, `PULSE`, `TEMP_F`, `SPO2`, `SUGAR_F`, `SUGAR_PP`, `BMI`, `WAIST`, `HEAD_CIRC`)
   - `DisplayName`: `string` (e.g. "Blood Pressure (Systolic)", "Fasting Blood Sugar")
   - `Unit`: `string` (e.g. "mmHg", "bpm", "°F", "mg/dL", "cm")
   - `InputType`: `string` (`Number`, `Decimal`, `Text`, `Select`)
   - `NormalRangeMin`: `decimal?` (e.g. 90 for Systolic BP, 70 for Fasting Sugar)
   - `NormalRangeMax`: `decimal?` (e.g. 120 for Systolic BP, 100 for Fasting Sugar)
   - `DisplayOrder`: `int` (Ordering on receptionist vitals card)
   - `IsRequired`: `bool` (Whether receptionist must record it)
   - `IsActive`: `bool` (Whether currently active)

2. **`ClinicVitalPreference` (Tenant-Specific Overrides)**:
   - Links `ClinicId` with `VitalMasterId`.
   - Allows a clinic to enable/disable global vitals, reorder them, or mark them mandatory without altering the global master record.

3. **`VisitVitals` (Transactional Observations)**:
   - `Id`: `Guid`
   - `VisitId`: `Guid` (FK &rarr; `Visits`)
   - `PatientId`: `Guid` (FK &rarr; `Patients`)
   - `VitalMasterId`: `Guid` (FK &rarr; `VitalMaster`)
   - `Value`: `string` (The measured value, e.g. "120", "98.4", "115")
   - `Unit`: `string` (Historical snapshot of the unit at the time of recording)
   - `RecordedAt`: `DateTime` (Timestamp)
   - `RecordedByUserId`: `string` (Staff/User who captured the reading)

4. **`LabTestMaster` & `PrescriptionLabOrders`**:
   - `LabTestMaster`: `Id`, `ClinicId?`, `TestCode`, `TestName`, `Category` (Biochemistry, Hematology, Microbiology, Imaging), `SampleType`, `FastingRequired` (bool), `DefaultCost`.
   - `PrescriptionLabOrders`: `Id`, `PrescriptionId`, `LabTestMasterId`, `Instructions`, `Status` (Ordered, Completed).

---

## 5. UI Screens & RBAC Matrix for Master Data Configuration

To make the system dynamically configurable without code changes, DocOS Phase 2 introduces dedicated configuration screens split cleanly by RBAC level:

### A. RBAC Access Matrix for Master Configuration

| Configuration Module | PlatformAdmin (Super Admin) | ClinicAdmin (Clinic Owner) | Doctor | Receptionist / Nurse |
| :--- | :---: | :---: | :---: | :---: |
| **Global Master Catalog Studio** | **Full Access** (Create / Edit / Global Toggle) | No Access | No Access | No Access |
| **Clinic Vitals Workflow Settings** | View / Supervise | **Full Access** (Enable / Disable / Reorder) | View / Suggest | Use dynamically in UI |
| **Clinic Lab Test Panels** | View / Supervise | **Full Access** (Bundle tests / Add custom) | **Full Access** | View on Rx Print |
| **Advice & Lifestyle Templates** | Manage Global Presets | **Full Access** | **Full Access** (Doctor Presets) | View on Rx Print |
| **Formulary / Custom Medicines** | Global Approval & Seed | Add Clinic Brand | Add / Personal Favorites | Read-only |

---

### B. UI Screens Specification

#### 1. Platform Master Catalog Studio (`/admin/masters`) — *Accessible by PlatformAdmin only*
Located in the Super Admin Portal:
- **Global Vitals Studio** (`/admin/masters/vitals`):
  - Table showing all system-wide standard vitals with standard units, input types, and normal physiological ranges.
  - Modal to add new standard vitals (e.g., adding pediatric vitals, pain scales, or waist circumference globally).
  - Global toggle switch to deprecate or activate vitals platform-wide.
- **Global Lab Tests Catalog** (`/admin/masters/lab-tests`):
  - Master dictionary of standard diagnostic investigations (CBC, HbA1c, LFT, KFT, Lipid Profile, Thyroid Panel, Urine R/M, Chest X-Ray).
  - Grouped by medical category with pre-configured fasting instructions.
- **Global Formulary & Salt Engine** (`/admin/masters/drugs`):
  - Manage the 500+ Indian generic salts and formulations seed data.
  - Review queue for custom medicines created by individual clinics to promote them to the global master.

#### 2. Clinic Workflow & Vitals Configurator (`/settings/vitals`) — *Accessible by ClinicAdmin & Doctor*
Located in the Clinic Settings section:
- **Active Vitals Checklist**:
  - Clean toggle switches for every vital: Enable or disable vitals specifically for this clinic.
    *(e.g., A Pediatric Clinic disables Adult Sugar vitals and enables Birth Weight & Head Circumference)*.
- **Drag-and-Drop Display Reordering**:
  - Reorder vitals cards with simple drag-and-drop handles to set the exact visual sequence receptionist sees during patient intake.
- **Mandatory Triage Flags**:
  - Checkboxes to flag specific vitals as mandatory before patient can transition from `Waiting` to `In-Consultation`.
- **"Add Custom Clinic Vital" Action**:
  - Modal allowing the clinic to define their own specialty vital (e.g., Pulmonology clinic adds `PEFR - Peak Expiratory Flow Rate` in `L/min`).

#### 3. Lab Test & Investigation Panel Builder (`/settings/lab-tests`) — *Accessible by ClinicAdmin & Doctor*
- **Quick-Order Test Selector**: Toggle tests frequently ordered at this clinic.
- **Custom Panel Bundler**:
  - Group individual tests into 1-click orderable panels:
    - *Fever Panel*: CBC + Malarial Parasite + Widal + Urine Routine.
    - *Diabetic Review Panel*: Fasting Blood Sugar + HbA1c + Serum Creatinine + Urine Microalbumin.
    - *Antenatal Screen*: Blood Group + Rh, Complete Hemogram, VDRL, HIV, Blood Sugar, Urine R/M.

#### 4. Clinical Advice & Instructions Studio (`/settings/advice`) — *Accessible by ClinicAdmin & Doctor*
- Create and organize reusable lifestyle, dietary, and follow-up advice snippets:
  - Dietary advice templates (Low sodium, Diabetic diet, High fiber, Soft diet).
  - Post-consultation care guidelines (Gargle with warm salt water, Cold compress, Wound dressing).
  - 1-click inclusion when writing prescriptions in the Consultation Room.

#### 5. Dynamic Vitals Modal in Daily Queue (`VitalsModal.tsx`) — *Receptionist & Nurse Execution*
- Replaces hardcoded inputs with a **dynamic rendering loop**:
  - Queries active vitals configured for the clinic in their specified `DisplayOrder`.
  - Automatically displays unit badges (`mmHg`, `bpm`, `°F`, `mg/dL`).
  - Evaluates recorded values against `NormalRangeMin` and `NormalRangeMax` in real-time, displaying subtle warning color indicators (amber/red) if vitals are out of normal physiological range.

---

## 6. Granular Subscription Management & Usage Quotas Engine

To enable commercial distribution across diverse Indian healthcare clinic profiles, Phase 2 implements a flexible, dual-track subscription and usage quota model.

### A. Dual-Track Pricing Model (Metered Quota vs. Unlimited)
Every subscription tier can be configured in either a **Metered/Capped** or **Unlimited** operational mode:

| Tier | Plan Variant | Max Doctors | Max Staff | Monthly Visit / Rx Quota | Target Use Case |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Starter Clinic** | **Capped / Metered** | 1 | 2 | Configurable (e.g., 250, 500, 1,000 visits/mo) | Budget-conscious solo doctor |
| **Starter Clinic** | **Unlimited** | 1 | 2 | **Unlimited** (`Quota = null`) | High-volume solo practitioner |
| **Multi-Doctor Practice** | **Capped / Metered** | Up to 5 | 10 | Configurable (e.g., 1,000, 2,500, 5,000 visits/mo) | Polyclinic sharing an OPD quota pool |
| **Multi-Doctor Practice** | **Unlimited** | Up to 5 | 10 | **Unlimited** (`Quota = null`) | Busy multi-specialty polyclinic |
| **Enterprise / Hospital OPD**| **Tailored** | Custom | Custom | Custom Quota or Unlimited | Multi-branch or nursing home chain |

### B. SaaS Owner (`PlatformAdmin`) Super-Powers & Overrides
The SaaS Owner has complete discretionary authority over clinic quotas:
1. **Global Plan Catalog (`SubscriptionPlanMaster`)**: Define standard packages sold publicly.
2. **Individual Clinic Overrides (`ClinicSubscription`)**:
   - Manually adjust any clinic's monthly limit to any custom integer.
   - Quick one-click quota multipliers / top-up blocks:
     - `+250 Visits Top-Up`
     - `+500 Visits Top-Up`
     - `+1,000 Visits Top-Up`
   - One-click `Switch to Unlimited` toggle per clinic.
   - Configurable rollover toggle: choose whether unused visits expire at month-end or roll over.

### C. Database Schema for Subscriptions

1. **`SubscriptionPlanMaster` (Plan Templates)**:
   - `Id`: `Guid` (PK)
   - `PlanName`: `string` (e.g., "Starter - 500 Visits", "Multi-Doctor Unlimited")
   - `Tier`: `string` (`Starter`, `MultiDoctor`, `Enterprise`)
   - `IsUnlimitedVisits`: `bool`
   - `DefaultMonthlyVisits`: `int?` (`null` if unlimited, or integer limit)
   - `MaxDoctors`: `int`
   - `MaxStaff`: `int`
   - `PriceINR`: `decimal`
   - `BillingCycle`: `string` (`Monthly`, `Quarterly`, `Annual`)
   - `IsActive`: `bool`

2. **`ClinicSubscription` (Active Tenant Entitlements & Overrides)**:
   - `Id`: `Guid` (PK)
   - `ClinicId`: `Guid` (FK &rarr; `Clinics`)
   - `PlanId`: `Guid` (FK &rarr; `SubscriptionPlanMaster`)
   - `IsUnlimitedVisits`: `bool` (allows SaaS Owner to override plan default)
   - `MonthlyVisitQuota`: `int?` (active limit for this clinic, e.g. 750 or `null` if unlimited)
   - `AdditionalTopUpVisits`: `int` (extra bonus or purchased visits added by SaaS Owner)
   - `Status`: `string` (`Trial`, `Active`, `GracePeriod`, `QuotaExceeded`, `Suspended`)
   - `CurrentPeriodStart`: `DateTime`
   - `CurrentPeriodEnd`: `DateTime`
   - `GracePeriodDays`: `int` (default 5 days)

3. **`ClinicMonthlyUsage` (Real-Time Counter)**:
   - `Id`: `Guid` (PK)
   - `ClinicId`: `Guid` (FK)
   - `YearMonth`: `string` (e.g., "2026-10")
   - `VisitsConducted`: `int` (increments on every completed consultation / generated prescription)
   - `LastVisitRecordedAt`: `DateTime`

4. **`SubscriptionPaymentHistory` (Invoices & Payments)**:
   - `Id`: `Guid` (PK)
   - `ClinicId`: `Guid` (FK)
   - `SubscriptionId`: `Guid` (FK)
   - `Amount`: `decimal`
   - `PaymentMethod`: `string` (UPI, NetBanking, Card, Cash, Cheque)
   - `TransactionReference`: `string` (Payment gateway transaction ID or manual bank UTR)
   - `InvoiceNumber`: `string`
   - `Status`: `string` (`Success`, `Pending`, `Failed`)

### D. Non-Disruptive Quota Enforcement (Clinical Safety First)
Patient care is never abruptly terminated mid-clinic:
1. **Total Allowed Calculation**: `TotalAllowed = (MonthlyVisitQuota ?? ∞) + AdditionalTopUpVisits`.
2. **Soft Buffer (+20 Visits)**:
   - If usage reaches the quota, visits are still permitted up to a +20 visit safety buffer.
   - Non-intrusive warning banner appears on the Doctor and Receptionist navbars:
     *"⚠️ Monthly OPD Quota Reached (500/500). Please contact SaaS Admin to upgrade or top-up."*
3. **Hard Cap (Beyond Buffer)**:
   - Blocks new queue token generation with a friendly upgrade modal.
   - **Clinical Safety Guarantee**: Past patient history, vitals trends, and past prescriptions remain 100% accessible in read-only mode for medicolegal safety.

### E. SaaS Owner UI: Quota & Subscription Studio (`/admin/clinics/{id}/subscription`)
Located in the Super Admin Portal:
- Visual usage meter: `[===============>      ] 380 / 500 Visits (76%)`
- Unlimited Visits toggle switch.
- Custom base quota input field.
- Quick top-up buttons: `+250`, `+500`, `+1,000` visits.
- Offline payment recorder (record direct bank transfers / UPI payments with invoice generation).
