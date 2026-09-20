# Project Name: DocOS — OPD Clinic Management SaaS (India Edition)

## 1. Executive Summary
DocOS is a high-speed, lightweight SaaS platform tailored specifically for Indian outpatient department (OPD) doctors and small clinics transitioning from paper-based prescriptions to digital workflows. The system streamlines patient check-in, vitals capture by clinic assistants/receptionists, OPD consultation by doctors, and rapid prescription generation featuring Indian brand names alongside their active generic salt compositions.

## 2. Technology Stack & Frameworks
- **Backend**: .NET Core Web API targeting **.NET 10** (`net10.0`).
  - Architecture: **Clean Architecture** (Domain, Application, Infrastructure, API).
  - Design Patterns: **CQRS** with MediatR, FluentValidation pipeline behaviors, Result pattern.
  - Auth: **ASP.NET Core Identity** with custom JWT Bearer token authentication & Refresh Tokens stored in PostgreSQL.
  - ORM: **Entity Framework Core 10** with Npgsql (PostgreSQL provider).
- **Frontend**: **React 18+** with TypeScript, Vite, Tailwind CSS, Lucide React, TanStack Query (React Query v5), React Hook Form, Zod.
- **Database**: **PostgreSQL** (compatible with Supabase hosting or local PostgreSQL 16), utilizing multi-tenant `TenantId` (Clinic) row-level isolation.
- **Drug & Salt Engine**:
  - Seed database of **500+ essential Indian generic salts and formulations** (e.g., *Paracetamol 650mg*, *Amoxicillin + Clavulanic Acid 625mg*, *Pantoprazole 40mg*, *Metformin 500mg SR*, *Telmisartan 40mg*).
  - Unified search indexing both **Brand Names** and **Generic/Salt Compositions**.
  - Doctor customization: ability to add custom medicines, formulations, and personal favorites for rapid 1-click prescribing.

---

## 3. User Roles & Multi-Tenant Access Control

### Tenancy
Each clinic/practice is a separate Tenant (`TenantId`). Data is isolated per clinic.

### Roles & Permissions
1. **Clinic Admin / Doctor**:
   - Conducts OPD consultations.
   - Writes diagnosis, clinical history, notes, and prescriptions.
   - Configures clinic letterhead, doctor registration number, degrees, consultation fees, and custom medicine master.
   - Accesses full patient clinical history and analytics.
2. **Receptionist / Clinic Assistant**:
   - Quick patient registration and search.
   - Records preliminary vitals (Blood Pressure, Pulse, Temperature, Weight, Height, SpO2).
   - Manages daily OPD token queue (Waiting, In-Consultation, Completed).

---

## 4. Core Modules & OPD Workflow

### A. Patient Registration & Search
- **Unique Patient ID**: Auto-generated sequential format (e.g., `DOC-2026-0001` or customizable clinic prefix).
- **Mandatory Fields**: Full Name, Age / DOB, Gender, Mobile Number (10-digit Indian standard).
- **Optional Fields**: Email, Address, Blood Group, Emergency Contact.
- **Lightning Search**: Instant debounced search by Mobile Number, Patient ID, or Name.

### B. Daily OPD Queue & Vitals (Receptionist Flow)
- Add patient to today's consultation queue with a token number.
- Assistant enters vitals:
  - BP (Systolic / Diastolic)
  - Pulse rate (bpm)
  - Temperature (°F / °C)
  - SpO2 (%)
  - Weight (kg) & Height (cm) -> Auto-calculated BMI.

### C. Clinical Consultation (Doctor Flow)
- **Queue Monitor**: Live OPD queue showing waiting patients and vitals captured.
- **Medical History & Allergies**:
  - Chief complaints with duration (e.g., "Fever x 3 days", "Productive cough x 1 week").
  - Past medical/surgical history (Hypertension, Diabetes, Asthma, Thyroid, etc.).
  - **Allergy Alert Banner**: Prominently displays drug allergies (e.g., *Penicillin*, *Sulfa*).
  - Clinical Diagnosis / Provisional Impression (ICD-10 or free text).
- **Prescription (Rx) Writer**:
  - Autocomplete search matching brand names or salt names.
  - Form (Tablet, Capsule, Syrup, Injection, Ointment, Drops).
  - Indian Dosage shorthand (e.g., `1-0-1`, `1-0-0`, `0-0-1`, `1-1-1`, `SOS`).
  - Administration timing: Before Food, After Food, With Food, At Bedtime.
  - Duration (Days / Weeks / Months).
  - Instructions (e.g., "Gargle with warm water", "Avoid oily food").
  - Quick-add to "Doctor's Favorites" for 1-click prescribing.
- **Follow-up Date**: Quick buttons (+3 days, +1 week, +2 weeks, custom calendar).

### D. Dual-Mode Prescription Printing & PDF Generation
- **Mode 1: Print on Blank A4 Paper**:
  - Renders complete digital clinic letterhead: Clinic Name, Doctor Name, MBBS/MD Degrees, Medical Council Reg. No., Phone, Address, Clinic Logo.
  - Patient banner (Name, Age/Gender, Patient ID, Date, Vitals).
  - Clinical summary & Rx table with Brand + Salt names.
  - Doctor's digital signature placeholder & follow-up instructions.
- **Mode 2: Print on Doctor's Pre-printed Pad**:
  - Hides clinic header and footer.
  - Leaves configurable top margin (e.g., 60mm–80mm) to precisely align with physical printed letterhead pads.
  - 1-click browser print with clean print-CSS (`@media print`).

---

## 5. Backend Solution Architecture (.NET 10 Clean Architecture)