# DocOS — Transition Plan: Phase 1 (MVP) to Phase 2 (V2)

This document outlines the step-by-step preparation plan to transition DocOS from the completed Phase 1 (MVP) into Phase 2 (Distribution, Super Admin & Multi-Doctor SaaS) safely and systematically.

---

## Step 1: Separate the Specification / Prompt Files
*Before touching any code or branches, cleanly split the project documentation.*

- [x] **Phase 1 Master Document**:
  - `DocOS-(Phase 1).md` is strictly scoped as the immutable **Phase 1 (MVP) baseline**.
- [x] **Phase 2 Specification Document**:
  - `DocOS-(Phase 2).md` created, focusing exclusively on Phase 2 requirements:
    - Platform Super Admin portal & login.
    - Clinic onboarding & tenant lifecycle management.
    - Multi-doctor support per clinic.
    - Granular Role-Based Access Control (RBAC).
    - Packaging & SaaS distribution (Docker Compose, cloud deployment).
    - WhatsApp / SMS prescription delivery & QR code portal.
    - Analytics, billing collection, and ABDM readiness.

---

## Step 2: Git Snapshot & Dedicated Phase 2 Branch
*Preserve Phase 1 on `main` and isolate all Phase 2 development.*

```bash
# 1. Ensure working directory is clean and changes committed on main
git status

# 2. Tag the Phase 1 MVP release
git tag -a v1.0-mvp -m "DocOS Phase 1 MVP Release"
git push origin v1.0-mvp

# 3. Create and switch to the Phase 2 development branch
git checkout -b phase-2
git push -u origin phase-2
```

---

## Step 3: Dedicated Database Provisioning for Phase 2 (Multi-Database Provider)
*Ensure Phase 1 production/MVP data is never affected by Phase 2 schema migrations.*

- [ ] **Dual Provider Setup (Local SQL Server & Cloud Supabase PostgreSQL)**:
  - Install `Microsoft.EntityFrameworkCore.SqlServer` NuGet package in `DocOS.Infrastructure`.
  - Add database provider factory switch in `DependencyInjection.cs`:
    `"DatabaseProvider": "SqlServer"` (for local laptop development) or `"PostgreSQL"` (for Supabase cloud).
- [ ] **Connection Strings Configuration**:
  - Configure local SQL Server connection string in `appsettings.Development.json` (e.g. `Server=localhost;Database=DocOS_V2;Trusted_Connection=True;...`).
  - Add the new Supabase connection string for Phase 2 online deployments.
  - Safely back up the Phase 1 MVP connection string for future reference.
- [ ] **Initial Migration & Seeding**:
  - Generate clean initial migration for the active provider.
  - Verify tables are created and the 500+ Indian generic salts & formulations seed automatically.

---

## Step 4: Phase 2 Implementation Kickoff
*Proceed with execution in modular milestones on the `phase-2` branch:*

1. **Milestone 1 — Super Admin / Platform Admin**:
   - Platform Admin role & dedicated login.
   - Platform dashboard (total clinics, active doctors, consultation counts, system health).
2. **Milestone 2 — Tenant & Clinic Management**:
   - Clinic onboarding workflow (create clinic, allocate prefix, assign primary doctor).
   - Subscription / status control (Active, Trial, Suspended).
3. **Milestone 3 — Multi-Doctor Practice & RBAC**:
   - Allow multiple doctors per clinic tenant.
   - Doctor-specific OPD queues and consultation rooms.
   - Staff roles: Clinic Admin, Doctor, Nurse/Assistant, Receptionist.
4. **Milestone 4 — Distribution, Packaging & Digital Additions**:
   - Subdomain / header tenant routing.
   - Docker Compose distribution package.
   - WhatsApp / SMS delivery integration.
