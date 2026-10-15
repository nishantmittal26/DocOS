# DocOS — Phase 3 (post–Phase 2D)

Work listed here is **out of scope** until it is **promoted** to a numbered delivery slice with done-when criteria. Phase 2 parts **2A–2D** are defined in [DocOS-(Phase 2).md](<DocOS-(Phase%202).md>). Status and stack truth live in [DocOS-Product-Roadmap.md](DocOS-Product-Roadmap.md).

**Do not** add these tables, APIs, or UI unless the item has been promoted below.

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
| B05 | **Analytics dashboards & daily revenue charts** | Beyond the 2D `VisitPayment` daily collection report. | `idea` |
| B06 | **`ComplaintMaster` / `VisitComplaints`** | `ChiefComplaints` stays free text for OPD speed. | `idea` |
| B07 | **`DosageFrequencyMaster` / `DosageTimingMaster`** | Dosage stays shorthand string + `DosageTiming` enum; `DurationDays` stays `int`. | `idea` |
| B08 | **Pharmacist role** | Not in Phase 2 role set. | `idea` |
| B10 | **Audit row for every VIEW** | Routine queue views are not audited; see 2D `AuditLogs` scope. | `idea` |
| B11 | **Custom plan price & instant discount on clinic onboarding** | Sales/admin custom pricing or discount of X INR off catalog plan value during onboarding. | `Promoted →` |
| B13 | **Catalog-based subscriptions & contract snapshots** | Split catalog (`SubscriptionPlanMaster`) and contract (`ClinicSubscription` snapshot); copy-on-assign entitlements. | `Promoted →` |
| B14 | **Platform Admin Sales Agent management & onboarding-only access** | Option for Platform Admin to add/manage `SalesAgent` users (`ClinicId` null); Sales Agents have access strictly to Onboarding a New Clinic (and viewing their own onboarded clinics), with no access to platform masters, subscription overrides, audit logs, or clinical APIs. | `idea` |

> **Technical & Infrastructure Backlog:** Items **B03** (*Subdomain tenant routing & wildcard DNS*) and **B04** (*Kubernetes, Helm, white-label packaging*) have been moved to [DocOS-Technical(Infra)-Backlog.md](DocOS-Technical(Infra)-Backlog.md).

### Detail (same content as former Phase 2 §7)

- **WhatsApp and SMS.** No automatic send from onboarding; messaging is a future integration.  
- **ABDM / NHA.** Identifiers and `EnableAbdmIntegration` default false when added later.  
- **Analytics.** Broader than reception daily OPD collections.  
- **Complaint masters.** Dictionary vs free-text complaints.  
- **Dosage masters.** vs `1-0-1` + enum.  
- **Pharmacist.** New role and permissions model.  
- **VIEW audit.** Explicitly excluded from 2D audit design.  
- **Custom plan price & instant onboarding discount (B11).** Promoted and implemented. See §Promoted work below.
- **Catalog-based subscriptions & contract snapshots (B13).** Promoted and implemented. See §Promoted work below.
- **Platform Admin Sales Agent management (B14).** Allows `PlatformAdmin` to create and manage `SalesAgent` accounts (`ClinicId` null); restricts `SalesAgent` portal access strictly to onboarding new clinics (`/admin/onboard-doctor`).

---

## Promoted work

### B11 — Custom plan price & instant discount on onboarding
- **Status:** Complete (code and database migration `20261013090755_AddClinicSubscription_PriceAndDiscountOverrides` applied).
- **Scope:** Allows Platform Admin / Sales to specify `DiscountAmountINR` or `CustomPriceINR` during onboarding (`OnboardClinicRequest`) and subscription settings update (`UpdateClinicSubscriptionRequest`). Sets `PriceOverrideINR` and `DiscountAmountINR` on `ClinicSubscription`. Domain helper `EffectivePriceINR` evaluates `PriceOverrideINR ?? SubscribedPriceINR`. UI provides two-way discount/custom price calculation, live breakdown banner, quick preset discounts, and handover slip details.
- **Out of scope:** Automated proration, payment gateway/tax invoicing engines, clinic-facing self-service coupon codes.
- **Done when:**
  - [x] Entity and EF configuration updated with `decimal(10,2)` precision.
  - [x] Handlers and DTOs support `DiscountAmountINR` and `CustomPriceINR`.
  - [x] Onboard doctor wizard step 2 and handover slip step 4 reflect custom pricing & discounts.
  - [x] Manage Quota & Billing header, edit form, and payment recording modal default to `EffectivePriceINR`.
  - [x] Unit tests verify discount calculation, price override persistence, and DTO mapping.
  - [x] ADR and Database Schema documentation updated.

### B13 — Catalog-based subscriptions & contract snapshots
- **Status:** Complete (code, automated tests, and database migration `20261014073204_AddB13_ClinicSubscription_ContractSnapshot` applied).
- **Scope:**
  - Decouples product catalog (`SubscriptionPlanMaster`) from per-clinic contract entitlements (`ClinicSubscription`).
  - Replaces runtime catalog joins with a frozen contract snapshot on `ClinicSubscription`: `CatalogPlanId`, `SubscribedPlanName`, `SubscribedTier`, `SubscribedBillingCycle`, `SubscribedPriceINR`, `SubscribedIsUnlimitedVisits`, `SubscribedDefaultMonthlyVisits`, `SubscribedMaxDoctors`, `SubscribedMaxStaff`, `SubscribedHasCustomVitals`, `SubscribedHasLabModule`, and `PlanAssignedAt` (IST wall-clock).
  - Implements copy-on-assign logic on clinic onboarding (`OnboardClinicCommand`) and system provisioning (`EnsureClinicSubscriptionAsync`).
  - Added Platform Admin **Change Plan** command (`ChangeClinicCatalogPlanCommand`, `PUT /api/admin/clinics/{id}/subscription/change-plan`) with diff preview modal in UI.
  - Added Subscription Catalog Plan CRUD (`GET /api/admin/plans/admin`, `POST /api/admin/plans`, `PUT /api/admin/plans/{id}`). Inactive catalog plans are hidden from onboarding pickers.
  - Clinic UI and runtime entitlement checks (quota status, doctor seat caps in auth, lab module gating, custom vitals) enforce entitlements strictly from the contract snapshot + per-clinic overrides (`LabModuleOverride`, `MaxDoctorsOverride`, `PriceOverrideINR` / `DiscountAmountINR`).
- **Out of scope (v1):**
  - Proration, tax invoicing integration, auto-renew price updates.
  - "Apply catalog change to all active subscribers on this plan".
  - `ClinicSubscriptionPlanHistory` (deferred to v1.1).
- **Done when:**
  - [x] Entity and EF configuration updated with contract snapshot columns and `PlanId` renamed to `CatalogPlanId`.
  - [x] Database migration `20261014073204_AddB13_ClinicSubscription_ContractSnapshot` applied with backfill from active catalog plans.
  - [x] Handlers refactored to read entitlements from contract snapshot instead of catalog navigation.
  - [x] `ChangeClinicCatalogPlanCommand` and API endpoint added with audit/validation.
  - [x] Admin Subscription Plans page & dialogs for catalog CRUD added.
  - [x] Clinic Subscription page updated with contract snapshot view and Change Plan modal with diff preview.
  - [x] Automated tests verify catalog edits do not mutate existing clinic entitlements, change-plan copies snapshots, and overrides take precedence.
  - [x] Architecture Decision Record (ADR) and Database Schema documentation updated.
