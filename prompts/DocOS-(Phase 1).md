# Project Name: DocOS — OPD Clinic Management SaaS (India Edition)

## 1. Executive Summary
DocOS is a high-speed, lightweight SaaS platform tailored specifically for Indian outpatient department (OPD) doctors and small clinics transitioning from paper-based prescriptions to digital workflows. The system streamlines patient check-in, vitals capture by clinic assistants/receptionists, OPD consultation by doctors, rapid prescription generation featuring Indian brand names alongside their active generic salt compositions, and comprehensive historical patient record management.

---

## 2. Technology Stack & Frameworks
- **Backend**: .NET Core Web API targeting **.NET 10** (`net10.0`).
  - **Architecture**: **Clean Architecture** (Domain, Application, Infrastructure, API).
  - **Design Patterns**: **CQRS** with MediatR, FluentValidation pipeline behaviors, Result pattern.
  - **Auth**: **ASP.NET Core Identity** with custom JWT Bearer token authentication & Refresh Tokens stored in PostgreSQL.
  - **ORM**: **Entity Framework Core 10** with Npgsql (PostgreSQL provider), automated idempotent migrations (`IF NOT EXISTS` guards).
- **Frontend**: **React 18+** with TypeScript, Vite, Tailwind CSS, Lucide React, TanStack Query (React Query v5), React Hook Form, Zod.
- **Database**: **PostgreSQL** (compatible with Supabase hosting or local PostgreSQL 16), utilizing multi-tenant `TenantId` (Clinic) row-level isolation.
- **DevOps & Containerization**:
  - Multi-stage `Dockerfile` (optimized .NET API runtime + Vite static assets).
  - Hosted deployment configurations for Cloud (Supabase DB + Containerized Web App).
  - GitHub Actions CI/CD automated deployment workflow.
- **Drug & Salt Engine**:
  - Seed database of **500+ essential Indian generic salts and formulations** (e.g., *Paracetamol 650mg*, *Amoxicillin + Clavulanic Acid 625mg*, *Pantoprazole 40mg*, *Metformin 500mg SR*, *Telmisartan 40mg*).
  - Unified search indexing both **Brand Names** and **Generic/Salt Compositions**.
  - Doctor customization: ability to add custom medicines, formulations, and personal favorites for rapid 1-click prescribing.

---

## 3. User Roles & Multi-Tenant Access Control

### Tenancy
Each clinic/practice is an isolated Tenant (`TenantId`). Data is segregated per clinic across patients, consultations, and formulary customizations.

### Roles & Permissions (Phase 1 / V1 Implemented)
1. **Clinic Admin / Doctor**:
   - Conducts OPD consultations.
   - Writes diagnosis, clinical history, notes, and prescriptions.
   - Configures clinic letterhead, doctor registration number, degrees, consultation fees, and custom medicine master.
   - Accesses full patient clinical history and historical prescription re-printing.
2. **Receptionist / Clinic Assistant**:
   - Quick patient registration and search.
   - Records preliminary vitals (Blood Pressure, Pulse, Temperature, SpO2, Blood Sugar, Weight, Height, BMI).
   - Manages daily OPD token queue (Waiting, In-Consultation, Completed).

---

## 4. Phase 1 (V1) Completed Features & Modules

### A. Patient Registration & Lightning Search
- **Unique Patient ID (Auto-UID)**: Sequential format per clinic (e.g., `DOC-2026-0001` or customizable clinic prefix).
- **Demographics Capture**: Full Name, Age / DOB, Gender, Mobile Number (10-digit Indian standard), Address, Blood Group.
- **Allergy Alert Banner**: Prominent visual warnings for known drug allergies (e.g., *Penicillin*, *Sulfa*, *NSAIDs*) across registration, queue, consultation ribbon, and prescription print.
- **Instant Debounced Search**: Fast search by Mobile Number, Patient ID, or Name.

### B. Daily OPD Queue & Extended Vitals (Receptionist Flow)
- **Daily Queue & Token Counter**: Patients queued with daily sequential token numbers (`Token #1`, `Token #2`, ...).
- **Status Lifecycle**: `Waiting` -> `In-Consultation` -> `Completed` (or `Cancelled`).
- **Comprehensive Vitals Capture**:
  - Blood Pressure (Systolic / Diastolic mmHg)
  - Pulse Rate (bpm)
  - Temperature (°F / °C)
  - Oxygen Saturation (SpO2 %)
  - Weight (kg) & Height (cm) with auto-computed BMI
  - **Blood Sugar**: Fasting, Post-Prandial (PP), and Random blood glucose readings (mg/dL)
  - Respiratory Rate (breaths/min)
- **Live Vitals Display**: Visual pill badges showing vitals summary directly in the queue card.

### C. Clinical Consultation Room (Doctor Flow)
- **Active Consultation Ribbon**: Displays patient demographics, age/gender, contact, and vitals snapshot with highlighted alerts.
- **Chief Complaints & Duration**: Pre-configured duration chips (`x 2 days`, `x 5 days`, `x 1 week`, `x 2 weeks`, `x 1 month`) with custom inputs.
- **Clinical Impression & History**: Past medical/surgical history (Hypertension, Type 2 Diabetes, Asthma, CAD, Thyroid) and provisional diagnosis.
- **Prescription (Rx) Writer**:
  - Autocomplete search indexing 500+ Indian brand names and salts.
  - Form selector: Tablet, Capsule, Syrup, Injection, Ointment, Drops, Inhaler.
  - Indian Dosage shorthand: `1-0-1`, `1-0-0`, `0-0-1`, `1-1-1`, `1-0-0-1`, `SOS`, `STAT`.
  - Administration timing: `After Food`, `Before Food`, `With Food`, `At Bedtime`, `Empty Stomach`.
  - Duration in Days, Weeks, or Months.
  - Patient instructions / dietary advice (e.g., "Take with warm water", "Avoid sugar & carbohydrates").
  - **Add Custom Medicine Modal**: Doctors can define clinic-specific medicines with default strengths, formulations, and dosages.
- **Follow-up Date Selector**: Quick shortcut buttons (`+3 Days`, `+5 Days`, `+1 Week`, `+2 Weeks`, `+1 Month`) and calendar picker.

### D. Dual-Mode Prescription Printing & PDF Generation
- **Mode 1: Print on Blank A4 Paper**:
  - Full digital letterhead: Clinic Name, Doctor Name, MBBS/MD Degrees, Medical Council Reg. No., Phone, Address, Clinic Timings.
  - Patient banner with demographics, vitals strip, and chief complaints.
  - Clean Rx table with Brand + Salt names, dosage shorthand, duration, and instructions.
  - Doctor signature & stamp block.
- **Mode 2: Print on Doctor's Pre-printed Letterhead Pad**:
  - Suppresses clinic header and footer.
  - Configurable top margin offset (0mm–120mm) and bottom margin to align with physical letterhead stationery.
- **Print Optimization**:
  - Rendered via React portal directly to `document.body`.
  - Hides main `#root` and background UI during print preview to eliminate blank extra pages.
  - Pixel-perfect single-page `@media print` CSS.

### E. OPD Consultation History & Archive
- **Historical Records Browser**: Search past OPD visits by patient name, mobile number, or Patient ID.
- **Visit Timeline**: Inspect prior consultations, past vitals, diagnoses, and prescribed medicines over time.
- **1-Click Past Prescription Re-print**: Open and reprint any past prescription modal directly from history.

### F. Clinic & Doctor Profile Settings
- Doctor credentials configuration (Qualifications, Degrees, Medical Council Registration Number).
- Clinic details (Name, Address, Emergency Contact, Timings, Consultation Fee).
- Letterhead print margins customization (blank paper vs pre-printed pad offset).
- Doctor password change and security management.

### G. Database & Backend Engine
- Automated schema synchronization and migrations with PostgreSQL / Supabase.
- Idempotent seeders for 500+ Indian generic salts, brand combinations, and default clinic accounts.
- JWT access tokens with secure refresh token rotation.

---

## 5. Backend & Frontend Codebase Structure

```
DocOS/
├── Dockerfile                        # Multi-stage container build
├── backend/
│   └── src/
│       ├── DocOS.Domain/             # Entities: Clinic, Patient, Visit, Prescription, Medicine, Vitals
│       ├── DocOS.Application/        # CQRS (MediatR), DTOs, FluentValidation, Business Logic
│       ├── DocOS.Infrastructure/     # EF Core 10, Npgsql PostgreSQL, Identity, 500+ Drug Seeder
│       └── DocOS.API/                # REST Controllers, JWT Middleware, Swagger, Program.cs
└── frontend/                         # React 18 + Vite + TypeScript + Tailwind CSS
    └── src/
        ├── api/                      # Axios clients & typed API endpoints
        ├── context/                  # AuthContext (JWT session & user state)
        ├── components/               # Navbar, NewPatientModal, VitalsModal, PrescriptionPrintModal, AddCustomMedicineModal
        ├── pages/
        │   ├── auth/                 # LoginPage
        │   ├── queue/                # OpdQueuePage (Token queue & vitals cards)
        │   ├── consultation/         # ConsultationRoomPage (Rx writer & clinical notes)
        │   ├── history/              # OpdHistoryPage (Past visits archive & re-print)
        │   ├── patients/             # PatientsListPage & profile
        │   └── settings/             # SettingsPage (Letterhead, print offset, credentials)
        └── types/                    # TypeScript interfaces matching backend DTOs
```

---

## 6. Next Phase: Phase 2 (V2) Master Prompt
Phase 2 (Distribution, Super Admin, Multi-Doctor SaaS & Enterprise Architecture) has been separated into its own dedicated master specification:
- Please refer to [DocOS-(Phase 2).md](DocOS-(Phase%202).md) for the active V2 specification, architecture plan, and roadmap.