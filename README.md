# DocOS — OPD Clinic Management SaaS (India Edition)

DocOS is a lightweight, high-performance SaaS platform engineered specifically for Indian outpatient department (OPD) clinics and doctors transitioning from paper prescriptions to digital medical records.

Built with **.NET 10 (Clean Architecture)**, **SQL Server**, and **React + Vite + Tailwind CSS**.

**Specs & roadmap:** [`prompts/DocOS-Product-Roadmap.md`](prompts/DocOS-Product-Roadmap.md)

---

## Key Features

1. **Patient Registration & Auto-UID**:
   - Generates unique sequential patient IDs (e.g., `DOC-2026-0001`).
   - Validates Indian 10-digit mobile numbers, demographics, blood group.
   - Highlights known **Drug Allergies** with prominent visual alerts.

2. **Daily OPD Queue & Vitals (Receptionist / Assistant Flow)**:
   - Daily token queue system (`Token #1`, `Token #2`...).
   - Captures preliminary vitals: BP, Pulse, Temperature (°F), SpO2, Weight (kg), Height (cm) with auto-calculated BMI.

3. **OPD Clinical Consultation (Doctor Flow)**:
   - Chief complaints with quick duration chips (`x 2 days`, `x 1 week`).
   - Provisional diagnosis & doctor examination notes.
   - **500+ Indian Generic Salt & Formulation Formulary**:
     - Instant autocomplete search indexing both Indian brand names (e.g. *Augmentin 625*, *Dolo 650*, *Pan-D*, *Montair-LC*) and generic salt compositions (*Amoxicillin + Clavulanic Acid*, *Paracetamol*, etc.).
     - Indian dosage shorthand: `1-0-1`, `1-0-0`, `0-0-1`, `1-1-1`, `SOS`, `STAT`.
     - Food timings: `After Food`, `Before Food`, `With Food`, `At Bedtime`.
     - Doctors can also add custom medicines to their clinic's formulary.

4. **Dual-Mode Prescription Printing**:
   - **Mode A: Blank A4 Paper**: Full digital clinic letterhead with Doctor Name, Medical Council Reg. No., Qualifications, Address, and Contact info.
   - **Mode B: Pre-printed Letterhead Pad**: Suppresses digital header and applies configurable top margin offset (0–120mm) to fit physical doctor letterhead pads.
   - Clean browser print layout with `@media print` CSS.

5. **Multi-Tenant Architecture & Roles**:
   - Tenant isolation by `ClinicId`.
   - Role-based access: **Doctor** (Consultations, Prescriptions, Letterhead Settings) and **Receptionist/Assistant** (Registration, Vitals, Queue Management).

---

## Quick Start

### 1. Secrets & Database Configuration (do not commit)

Committed `appsettings*.json` files contain **no** connection strings or JWT secrets.

**Local Development** — copy the example and fill in real values (gitignored):

```bash
cd backend/src/DocOS.API
copy appsettings.Local.json.example appsettings.Local.json
# edit appsettings.Local.json with your SQL Server connection string + Jwt:Secret
```

Or use user-secrets:

```bash
cd backend/src/DocOS.API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=DocOS_Dev;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
dotnet user-secrets set "Jwt:Secret" "<long-random-secret>"
```

**Render / Production** — set environment variables in the host dashboard (never in git):

- `ConnectionStrings__DefaultConnection`
- `Jwt__Secret`

`appsettings.json` is the shared base. `appsettings.Production.json` overlays Production-only non-secrets (CORS, logging). Secrets still come from env vars.

---

### 2. Run the .NET 10 Backend API

```bash
cd backend
dotnet run --project src/DocOS.API
```

- Swagger UI: `http://localhost:5107/swagger` (see `launchSettings.json`)
- Upon first launch, the API automatically checks the database schema and seeds the **500+ Indian Generic Salt & Formulation Formulary**.

---

### 3. Run the React Frontend

```bash
cd frontend
npm run dev
```

- Web UI: `http://localhost:5173`

---

## Solution Architecture

```
DocOS/
├── prompts/                         # Product specs (start at Product-Roadmap.md)
│   ├── DocOS-Product-Roadmap.md     # Hub: status, stack, reading order
│   ├── DocOS-(Phase 1).md           # MVP archive (PostgreSQL era, locked)
│   ├── DocOS-(Phase 2).md           # Parts 2A–2D execution spec
│   ├── DocOS-Follow-ups.md          # Bugs & small enhancements (post 2A–2D)
│   ├── DocOS-Phase3-Backlog.md      # Post–2D deferred work / Phase 3 ideas
│   ├── DocOS-Backlog-B13-Catalog.md # Parked: catalog vs contract subscriptions
│   ├── DocOS-Database-Schema.md
│   └── DocOS-Architecture-Decisions.md
├── backend/
│   ├── DocOS.slnx
│   └── src/
│       ├── DocOS.Domain/            # Entities: Clinic, Patient, Visit, Prescription, Medicine
│       ├── DocOS.Application/       # CQRS Commands & Queries (MediatR), DTOs, Validation
│       ├── DocOS.Infrastructure/    # EF Core 10 (Npgsql), Identity, 500+ Drug Formulary Seeder
│       └── DocOS.API/               # Controllers, Middleware, Swagger Bearer Auth, Program.cs
└── frontend/                        # React 18 + Vite + TypeScript + Tailwind CSS
    └── src/
        ├── api/                     # Axios client & typed API endpoints
        ├── context/                 # AuthContext (JWT session & user state)
        ├── components/              # Navbar, NewPatientModal, VitalsModal, PrescriptionPrintModal
        ├── pages/                   # LoginPage, OpdQueuePage, ConsultationRoomPage, PatientsPage, SettingsPage
        └── types/                   # TypeScript interfaces matching backend models
```
