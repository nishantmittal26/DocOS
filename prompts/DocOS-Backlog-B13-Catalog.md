# B13 — Catalog-based subscriptions & contract snapshots

**Home:** this file only. B13 is **not** a row in [DocOS-Phase3-Backlog.md](DocOS-Phase3-Backlog.md).  
**Status:** parked later — a **single large workstream**. Do not mix it into the regular backlog.  
**Supersedes:** changing a clinic’s plan by swapping `PlanId` only (former B11). Plan changes must copy catalog → contract per this spec.

**When you start implementing B13:** this file is the reference, not a license to code. Explain the design to the human in detail, ask questions until they agree and understand fully, then wait for an explicit go-ahead. **No code, migrations, or schema edits until that agreement.** See **§0**.

This document is the **implementation reference** after that review: product model, schema, migration, code touchpoints, API/UI, and done-when criteria.

---

## 0. Agent gate (mandatory before any code)

Applies to every agent and contributor when the human says they want to start B13 (or “implement catalog snapshots”, “change plan”, “contract entitlements”, etc.).

### Do first

1. **Explain in the human’s language**, using this spec and the live code. Cover at least:
   - **Today:** runtime JOINs `SubscriptionPlanMaster`; editing a catalog row changes every clinic still on that `PlanId`.
   - **Target:** catalog = menu; contract = snapshot on `ClinicSubscription` plus existing overrides; onboard / Change plan **copy** fields; quota, labs, custom vitals, seat caps, and clinic-facing plan labels read the **contract**.
   - **Schema:** rename `PlanId` → `CatalogPlanId`; new `Subscribed*` columns and `PlanAssignedAt` (IST); backfill then NOT NULL.
   - **Out of scope for v1** (unless they explicitly pull it in): proration, invoicing, “apply catalog edit to all subscribers”, `MaxStaffOverride`, `ClinicSubscriptionPlanHistory`.
   - **Risks:** breaking API field names (`planId` vs `catalogPlanId`); dual source of truth if any handler still reads `Plan.*`; migration backfill of existing clinics.
2. **Ask detailed questions** (do not skip; wait for answers). Suggested set—adapt if already answered:
   - Confirm the catalog vs contract story in their words.
   - Breaking rename `planId` → `catalogPlanId` in APIs, or keep a JSON alias during transition?
   - Change plan: keep current period dates and remaining quota, or reset period / top-ups?
   - Catalog admin: edit existing SKUs only, or also create new plans? Soft-deactivate (`IsActive`) only, or delete?
   - Custom vitals: snapshot only (`SubscribedHasCustomVitals`), or a per-clinic override in v1?
   - Ship `ClinicSubscriptionPlanHistory` in v1 or leave v1.1?
   - Who may Change plan and edit catalog (PlatformAdmin only, or SalesAgent too)?
   - Any clinic must **not** lose labs/seats/quota on backfill?
3. **Restate the agreed v1 scope** (in/out, schema, API, UI screens) in a short confirmation.
4. **Wait** until the human says they understand and **explicitly agree to start coding**.

### Do not

- Start coding, scaffolding, or generating EF migrations because this file exists or because a checklist is unchecked.
- “Just do the migration first” or edit handlers “to save time” before agreement.
- Add B13 back into [DocOS-Phase3-Backlog.md](DocOS-Phase3-Backlog.md).
- Follow the normal small-backlog promote-and-implement path as a substitute for this conversation.

### After agreement

Then: ADR change log, [DocOS-Database-Schema.md](DocOS-Database-Schema.md), a roadmap status row, then implement from **this** file (updated if the review changed v1).

---

## 1. Problem (current behavior)

`ClinicSubscription.PlanId` is an FK to `SubscriptionPlanMaster`. Runtime and helpers **JOIN the catalog at read time**, so editing a plan row changes every clinic still pointing at that `PlanId`.

**Examples of live catalog reads today:**

| Area | File / type | What reads `Plan.*` |
| :--- | :--- | :--- |
| Domain helpers | `DocOS.Domain/Entities/ClinicSubscription.cs` | `HasUnlimitedVisits`, `TotalAllowedVisits`, `EffectiveMaxDoctors`, `EffectiveHasLabModule` |
| Onboard | `DocOS.Application/Subscriptions/SubscriptionHandlers.cs` | Sets `PlanId` only; quota from plan at create |
| Admin detail | `SubscriptionHandlers.cs` → `ClinicSubscriptionDetailDto` | `PlanName`, `Tier`, `BillingCycle`, `PriceINR`, `PlanHasLabModule` |
| Clinic quota API | `GetClinicQuotaStatusQuery` | `PlanName`, `PlanTier`, `HasCustomVitals` from plan |
| Custom vitals | `DocOS.Application/Vitals/VitalHandlers.cs` | `subscription.Plan.HasCustomVitals` |
| Auto-provision | `EnsureClinicSubscriptionAsync` in `SubscriptionHandlers.cs` | Copies starter `PlanId` without snapshot (post-B13: must copy contract) |

---

## 2. Concept (simple)

- **Catalog** = menu (`SubscriptionPlanMaster`). Editable SKUs for sales and onboarding pickers.
- **Contract** = what **one clinic** is entitled to (`ClinicSubscription` snapshot + existing overrides).

**Example:** Catalog **Pro** drops lab module in June. **City Clinic** onboarded on Pro in January keeps labs **on** until an admin runs **Change plan** or edits their contract. **New** clinics get the June catalog Pro.

---

## 3. Target model

| Layer | Table | Purpose | Catalog edit affects existing clinics? |
| :--- | :--- | :--- | :---: |
| Catalog | `SubscriptionPlanMaster` | Product definitions, picker, plan admin UI | **No** |
| Contract | `ClinicSubscription` | Snapshot entitlements + per-clinic overrides | Only on onboard / **Change plan** / contract edit |

```text
SubscriptionPlanMaster  --copy-on-assign-->  ClinicSubscription (contract)
        |                                              |
   (pickers, CRUD)                              (all runtime entitlement checks)
```

### Rules

1. **Copy-on-assign:** On **onboard** and admin **Change plan**, copy catalog fields into contract snapshot; set `CatalogPlanId` + `PlanAssignedAt` (IST).
2. **Runtime:** Enforce quota, labs, custom vitals, seat caps, and clinic-facing plan labels from **contract** (+ overrides). Do not use `Plan.HasLabModule` etc. for enforcement.
3. **Overrides:** Keep `IsUnlimitedVisits`, `MonthlyVisitQuota`, `AdditionalTopUpVisits`, `MaxDoctorsOverride`, `LabModuleOverride` for support; baseline from snapshot.
4. **Catalog CRUD:** `IsActive = false` hides plan from new picks; existing contracts unchanged.
5. **Migration:** Backfill snapshots from `ClinicSubscription` ⨝ `SubscriptionPlanMaster`; freeze behavior at migration time.

### Entitlement resolution (after B13)

| Concern | Formula |
| :--- | :--- |
| Unlimited visits | `IsUnlimitedVisits \|\| SubscribedIsUnlimitedVisits` |
| Monthly quota (base) | `MonthlyVisitQuota ?? SubscribedDefaultMonthlyVisits` |
| Total allowed | unlimited → `null`; else base + `AdditionalTopUpVisits` |
| Max doctors | `MaxDoctorsOverride ?? SubscribedMaxDoctors` |
| Max staff | `SubscribedMaxStaff` (add `MaxStaffOverride` only if product asks) |
| Lab module | `LabModuleOverride ?? SubscribedHasLabModule` |
| Custom vitals | `SubscribedHasCustomVitals` (v1; optional override later) |
| Display plan name / tier | `SubscribedPlanName`, `SubscribedTier` |

Implement these on `ClinicSubscription` (domain helpers or small `SubscriptionEntitlements` static class in Domain/Application).

---

## 4. Database changes

### 4.1 `SubscriptionPlanMaster` (catalog)

**Structure:** no new columns required for B13 v1.

**Behavior:** Platform Admin can CRUD existing columns; clinics do not read entitlements from this table at runtime.

### 4.2 `ClinicSubscription` (contract)

#### Rename (recommended)

| From | To | Notes |
| :--- | :--- | :--- |
| `PlanId` | `CatalogPlanId` | Same FK to `SubscriptionPlanMaster(Id)`. EF navigation: `CatalogPlan` or keep `Plan` with renamed FK. Update all code and DTOs (`planId` → `catalogPlanId` in API if breaking change is acceptable; or map JSON alias during transition). |

#### New columns

| Column | SQL type | After backfill | Copied from catalog |
| :--- | :--- | :---: | :--- |
| `SubscribedPlanName` | `nvarchar(150)` | NOT NULL | `PlanName` |
| `SubscribedTier` | `nvarchar(30)` | NOT NULL | `Tier` |
| `SubscribedBillingCycle` | `nvarchar(20)` | NOT NULL | `BillingCycle` |
| `SubscribedPriceINR` | `decimal(10,2)` | NOT NULL | `PriceINR` |
| `SubscribedIsUnlimitedVisits` | `bit` | NOT NULL | `IsUnlimitedVisits` |
| `SubscribedDefaultMonthlyVisits` | `int` | NULL | `DefaultMonthlyVisits` |
| `SubscribedMaxDoctors` | `int` | NOT NULL | `MaxDoctors` |
| `SubscribedMaxStaff` | `int` | NOT NULL | `MaxStaff` |
| `SubscribedHasCustomVitals` | `bit` | NOT NULL | `HasCustomVitals` |
| `SubscribedHasLabModule` | `bit` | NOT NULL | `HasLabModule` |
| `PlanAssignedAt` | `datetime2` | NOT NULL | IST at copy (onboard / change plan / backfill uses `CreatedAt` or migration run time) |

#### Unchanged columns (still used)

`ClinicId`, `IsUnlimitedVisits`, `MonthlyVisitQuota`, `AdditionalTopUpVisits`, `MaxDoctorsOverride`, `LabModuleOverride`, `Status`, `CurrentPeriodStart`, `CurrentPeriodEnd`, `GracePeriodDays`, `Notes`, `CreatedAt`, `UpdatedAt`.

#### Tables not changed in v1

`ClinicPeriodUsage`, `SubscriptionPaymentHistory`, `Clinics`.

### 4.3 Optional v1.1 — `ClinicSubscriptionPlanHistory`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `Id` | `uniqueidentifier` | PK |
| `ClinicSubscriptionId` | `uniqueidentifier` | FK |
| `PreviousCatalogPlanId` | `uniqueidentifier` | NULL on first assign |
| `NewCatalogPlanId` | `uniqueidentifier` | FK catalog |
| `ChangedByUserId` | `nvarchar(450)` | FK user |
| `ChangedAt` | `datetime2` | IST |
| `Notes` | `nvarchar(500)` | optional |
| `SnapshotJson` | `nvarchar(max)` | optional before/after |

### 4.4 Migration procedure

1. Add nullable snapshot columns + `PlanAssignedAt`; rename `PlanId` → `CatalogPlanId` (single EF migration under `DocOS.Infrastructure/Migrations`).
2. SQL backfill: `UPDATE cs SET Subscribed* = p.* FROM ClinicSubscriptions cs INNER JOIN SubscriptionPlans p ON cs.CatalogPlanId = p.Id`.
3. For unlimited/quota at assign time: set `SubscribedIsUnlimitedVisits` from plan; if clinic already has `IsUnlimitedVisits` or `MonthlyVisitQuota` override, keep overrides; snapshot still stores catalog baseline.
4. Set `PlanAssignedAt` = `COALESCE(cs.CreatedAt, migration IST now)`.
5. Alter columns to NOT NULL where required.
6. Update [DocOS-Database-Schema.md](DocOS-Database-Schema.md) §4.3–4.4 and ADR change log.

---

## 5. Backend implementation checklist

### Domain

- [ ] Extend `ClinicSubscription` with snapshot properties; refactor helpers to use §3 formulas (no `Plan?.` for entitlements).
- [ ] Add `ApplyCatalogPlan(SubscriptionPlanMaster plan, DateTime assignedAt)` (or application service) to centralize copy-on-assign field list.

### Application

- [ ] `OnboardClinicCommand` handler: after picking plan, call copy-on-assign + set overrides from request (`IsUnlimitedOverride`, `MonthlyVisitQuotaOverride`).
- [ ] `EnsureClinicSubscriptionAsync`: copy starter plan snapshot, not only FK.
- [ ] `GetClinicSubscriptionDetailQuery`: DTO shows contract fields + `CatalogPlanId`; `PlanHasLabModule` → `SubscribedHasLabModule` (or rename DTO fields for clarity).
- [ ] `GetClinicQuotaStatusQuery`: plan name/tier/modules from contract.
- [ ] `UpdateClinicSubscriptionCommand`: unchanged overrides; optional new fields if editing contract modules in v1.
- [ ] **New** `ChangeClinicCatalogPlanCommand`: Platform Admin; validate active catalog plan; copy snapshot; update `CatalogPlanId`, `PlanAssignedAt`; optional history row.
- [ ] **New** catalog CRUD commands: `GetSubscriptionPlansAdminQuery`, `Create/UpdateSubscriptionPlanCommand` (Platform Admin only); validate `PlanCode` unique.

### API (`AdminController.cs`)

Existing:

- `GET /api/admin/plans`
- `GET/PUT /api/admin/clinics/{id}/subscription`
- `POST .../topup`, `POST .../payments`

Add:

- [ ] `PUT` or `POST /api/admin/clinics/{id}/subscription/change-plan` — body: `{ catalogPlanId, optional notes }`
- [ ] `PUT /api/admin/plans/{id}` and optionally `POST /api/admin/plans` for catalog CRUD

Clinic-facing quota endpoint (if separate from admin): ensure it uses updated handler.

### Other handlers

- [ ] `VitalHandlers.cs` — entitlement via contract `SubscribedHasCustomVitals`.
- [ ] `LabHandlers.cs` / `VisitHandlers.cs` — grep `Plan.` or `HasLabModule` on subscription.
- [ ] `AuthCommands.cs` — any subscription seed on login (if present).

### Tests

- [ ] `Phase2BTests.cs`, `Phase2CTests.cs`, `Phase2DTests.cs`, `LocalDbSubscriptionDetailTests.cs` — seed subscriptions with snapshots; assert catalog edit does **not** change clinic entitlement.
- [ ] New test: change plan copies new snapshot; lab override still wins when set.

---

## 6. Frontend implementation checklist

| File | Changes |
| :--- | :--- |
| `frontend/src/types/index.ts` | `ClinicSubscriptionDetail`, `SubscriptionPlan`, quota types: contract field names; `catalogPlanId` |
| `frontend/src/api/client.ts` | `changeClinicPlan`, catalog plan CRUD |
| `frontend/src/pages/admin/ClinicSubscriptionPage.tsx` | Show **subscribed** entitlements vs catalog; **Change plan** modal with diff; lab/quota overrides unchanged |
| `frontend/src/pages/admin/OnboardDoctorPage.tsx` | No schema change; relies on API copy-on-assign |
| `frontend/src/pages/admin/AdminClinicsPage.tsx` | Optional: link to plan admin |
| **New** `SubscriptionPlansPage.tsx` (or similar) | Catalog list/edit; disclaimer copy |
| `ConsultationRoomPage.tsx`, `LabTestsSettingsPage.tsx` | Consume `hasLabModule` / quota from API (should already work once API uses contract) |

---

## 7. Out of scope (v1)

- Proration, invoicing integration, auto-renew price updates
- “Apply catalog change to all subscribers on this plan”
- `MaxStaffOverride` (unless requested)
- `ClinicSubscriptionPlanHistory` (optional v1.1)

---

## 8. Done when

1. Migration applied; all existing clinics have full snapshots; schema doc + ADR updated.
2. Editing `SubscriptionPlanMaster` does **not** change `GetClinicQuotaStatus`, vitals entitlement, or lab gating for an existing clinic (automated test).
3. Onboard and **Change plan** copy catalog → contract; `PlanAssignedAt` set in IST.
4. Manage Quota & Billing shows contract entitlements and supports **Change plan** with confirmation diff.
5. Platform Admin can edit catalog plans; inactive plans hidden from onboard picker.
6. Roadmap status table includes a B13 (or equivalent) row; this spec’s done-when items are checked; ADR + schema doc updated.

---

## 9. Before coding

Follow **§0**. Conversation and explicit human agreement come first; docs and code come after. Do not add B13 back into [DocOS-Phase3-Backlog.md](DocOS-Phase3-Backlog.md).

---

## Change log (this doc)

| Date (IST) | Summary |
| :--- | :--- |
| 2026-10-06 | Agent gate: explain in detail and ask questions; no code until the human agrees and understands. |
| 2026-10-06 | Removed from the main backlog list; this file is the only home. Parked for later review as one large workstream. |
| 2026-10-05 | Initial B13 implementation reference (catalog vs contract, schema, code map). |
