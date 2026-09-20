# DocOS — OPD Clinic Management SaaS (India Edition)

DocOS is a lightweight, high-performance SaaS platform engineered specifically for Indian outpatient department (OPD) clinics and doctors transitioning from paper prescriptions to digital medical records.

Built with **.NET 10 (Clean Architecture)**, **PostgreSQL (Supabase)**, and **React + Vite + Tailwind CSS**.

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

### 1. Database Configuration (Supabase or Local PostgreSQL)
Open `backend/src/DocOS.API/appsettings.json` and set your PostgreSQL connection string:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=db.<supabase-ref>.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=<your-password>;SSL Mode=Require;Trust Server Certificate=true"
}
```

*(If using local PostgreSQL on your Mac, it defaults to `Host=localhost;Port=5432;Database=docos_db;Username=postgres;Password=postgres`)*.

---

### 2. Run the .NET 10 Backend API

```bash
cd backend
dotnet run --project src/DocOS.API
```

- Swagger UI: `http://localhost:5000/swagger`
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
