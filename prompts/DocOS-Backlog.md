# DocOS — Backlog (post–Phase 2D)

Work listed here is **out of scope** until it is **promoted** to a numbered delivery slice with done-when criteria. Phase 2 parts **2A–2D** are defined in [DocOS-(Phase 2).md](<DocOS-(Phase%202).md>). Status and stack truth live in [DocOS-Product-Roadmap.md](DocOS-Product-Roadmap.md).

**Do not** add these tables, APIs, or UI while finishing 2A–2D unless the item has been promoted below.

---

## How to promote an item

1. Add a dated entry to [DocOS-Architecture-Decisions.md](DocOS-Architecture-Decisions.md) **Change log** (decision + rationale).  
2. If the change touches the database, update [DocOS-Database-Schema.md](DocOS-Database-Schema.md) in the same work.  
3. Add a new section to [DocOS-(Phase 2).md](<DocOS-(Phase%202).md>) *or* a dedicated mini-spec (e.g. `DocOS-Spec-Messaging.md`) with **in scope**, **out of scope**, and **done when**.  
4. Add a row to the roadmap status table in [DocOS-Product-Roadmap.md](DocOS-Product-Roadmap.md).  
5. Mark the backlog item below as **Promoted →** with a link to that spec section.

---

## Items

| ID | Topic | Why deferred | Status |
| :--- | :--- | :--- | :--- |
| B01 | **WhatsApp and SMS** | Needs provider, template approval, and patient/doctor consent. 2B handover is on-screen URL, credentials, and login QR only. | `idea` |
| B02 | **ABDM / NHA APIs** | Optional columns (`AbhaNumber`, `AbhaAddress`, `IsAbhaVerified`, `HfrId`, `HprId`, `EnableAbdmIntegration`) wait until dedicated work. Storing an ID ≠ compliance. `IsAbhaVerified` stays false until a real verification flow. No `HasAbdmIntegration` on `SubscriptionPlanMaster`. | `idea` |
| B03 | **Subdomain tenant routing & wildcard DNS** | `ClinicId` on JWT remains the tenant key through Phase 2. | `idea` |
| B04 | **Kubernetes, Helm, white-label packaging** | Infra/packaging track separate from clinic product features. | `idea` |
| B05 | **Analytics dashboards & daily revenue charts** | Beyond the 2D `VisitPayment` daily collection report. | `idea` |
| B06 | **`ComplaintMaster` / `VisitComplaints`** | `ChiefComplaints` stays free text for OPD speed. | `idea` |
| B07 | **`DosageFrequencyMaster` / `DosageTimingMaster`** | Dosage stays shorthand string + `DosageTiming` enum; `DurationDays` stays `int`. | `idea` |
| B08 | **Pharmacist role** | Not in Phase 2 role set. | `idea` |
| B09 | **PostgreSQL or Supabase as Phase 2 provider** | Phase 2 is SQL Server only; MVP PostgreSQL is a tagged snapshot. | `idea` |
| B10 | **Audit row for every VIEW** | Routine queue views are not audited; see 2D `AuditLogs` scope. | `idea` |
| B11 | **Platform Admin: change clinic `PlanId` only** | Was “change tier via FK”; insufficient without contract snapshots. | `obsolete` — use **B13** |
| B12 | **Onboarding: lab module on plan cards** | Wizard step 2 lists visits, doctors, staff, and custom vitals; does not surface **`hasLabModule`** from `SubscriptionPlanMaster` (data already on plan DTO). Small UI polish deferred from E12. | `done` — [`OnboardDoctorPage.tsx`](../frontend/src/pages/admin/OnboardDoctorPage.tsx) step 2 |
| B13 | **Catalog-based subscriptions + contract snapshots + admin UI** | **Catalog** (`SubscriptionPlanMaster`) is editable product SKU; **contract** (`ClinicSubscription` entitlement snapshot) is what each clinic runs on. Today runtime JOINs catalog → changing master changes old clinics. Need copy-on-assign, entitlement reads from contract only, admin **change plan** + **catalog CRUD**. | `idea` |

### Detail (same content as former Phase 2 §7)

- **WhatsApp and SMS.** No automatic send from onboarding; messaging is a future integration.  
- **ABDM / NHA.** Identifiers and `EnableAbdmIntegration` default false when added later.  
- **Subdomain routing.** Deferred; JWT `ClinicId` remains canonical.  
- **K8s / Helm / white-label.** Packaging and ops, not clinic workflows.  
- **Analytics.** Broader than reception daily OPD collections.  
- **Complaint masters.** Dictionary vs free-text complaints.  
- **Dosage masters.** vs `1-0-1` + enum.  
- **Pharmacist.** New role and permissions model.  
- **PostgreSQL provider.** Single provider decision for Phase 2+.  
- **VIEW audit.** Explicitly excluded from 2D audit design.  
- **Onboarding plan lab badge (B12).** Helps sales pick the right tier; no schema change.  

### B13 — Catalog vs contract (authoritative approach)

**Problem (today).** `ClinicSubscription.PlanId` FK + helpers that read `Plan.*` (labs, custom vitals, seats, unlimited visits, quota fallback, display name/price/tier). Editing **catalog** rows retroactively changes existing clinics.

**Model.**

| Layer | Store | Purpose | Changes affect existing clinics? |
| :--- | :--- | :--- | :---: |
| **Catalog** | `SubscriptionPlanMaster` | SKUs for onboarding picker, pricing sheet, Platform Admin plan editor | **No** (unless admin runs **Change plan** on a clinic) |
| **Contract** | `ClinicSubscription` + snapshot columns | Entitlements and billing display for **this** clinic | Only via onboard, **Change plan**, or explicit contract/override edits |

**Rules.**

1. **Copy-on-assign:** On onboard (and on admin **Change plan**), copy catalog fields into the clinic **contract** snapshot; set `CatalogPlanId` (FK to catalog; reporting / “which SKU”) and `PlanAssignedAt` (IST).  
2. **Runtime:** Quota, labs, custom vitals, seat caps, and clinic-facing plan labels read **contract** (and existing per-clinic overrides), not live catalog JOINs.  
3. **Overrides:** Keep `MonthlyVisitQuota`, `IsUnlimitedVisits`, `MaxDoctorsOverride`, `LabModuleOverride` for support; resolve against snapshot baselines (e.g. lab = `LabModuleOverride ?? SubscribedHasLabModule`).  
4. **Catalog CRUD:** Edit master for **new** clinics; deactivate plan (`IsActive`) hides from picker only.  
5. **Migration:** Add snapshot columns; backfill from current `ClinicSubscription` ⨝ `SubscriptionPlanMaster`; freeze behavior at migration time; then enforce non-null snapshots.

**Proposed contract snapshot columns (on `ClinicSubscription`).**  
`SubscribedPlanName`, `SubscribedTier`, `SubscribedBillingCycle`, `SubscribedPriceINR`, `SubscribedIsUnlimitedVisits`, `SubscribedDefaultMonthlyVisits`, `SubscribedMaxDoctors`, `SubscribedMaxStaff`, `SubscribedHasCustomVitals`, `SubscribedHasLabModule`, `CatalogPlanId`, `PlanAssignedAt`. (Exact naming in schema doc when promoted.)

**Admin UI (in scope).**

- **Manage Quota & Billing:** show contract entitlements; **Change plan** (pick catalog SKU → diff → copy to contract); existing quota/lab overrides.  
- **Subscription plans (catalog):** Platform Admin list/edit `SubscriptionPlanMaster` with copy that catalog edits do not change existing clinics.  
- **Onboarding:** copy selected catalog plan into contract on create (not only `PlanId`).

**Optional v1.1.** `ClinicSubscriptionPlanHistory` (audit rows on plan change). **Out of scope v1:** proration, payment gateway, “push catalog change to all subscribers.”

**B11.** Obsolete; changing `PlanId` without contract snapshot does not meet the product rule. Implement under **B13** only.

---

## Promoted work

*(None yet. Move rows here when promoted.)*
