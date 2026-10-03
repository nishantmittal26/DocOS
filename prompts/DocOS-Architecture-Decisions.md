# DocOS — Architecture Decision Record (ADR)

**Locked:** 3 October 2026  
**Purpose:** Historical record and ongoing log of *why* DocOS is shaped this way—superseded drafts, rationale, and dated notes for new architecture or schema decisions. *What* to build and *when it is done* live in the master spec—not here.

**Agents:** Any new architecture decision or database schema change must append an entry to [§4 Change log](#4-change-log) below and, for schema, update [DocOS-Database-Schema.md](DocOS-Database-Schema.md) in the same work. See [`AGENTS.md`](../AGENTS.md) §3.

| Document | Use for |
| :--- | :--- |
| [DocOS-Product-Roadmap.md](DocOS-Product-Roadmap.md) | Hub: status, stack, reading order |
| [DocOS-(Phase 2).md](<DocOS-(Phase 2).md>) | Parts 2A–2D, in/out of scope, done-when checklists |
| [DocOS-Backlog.md](DocOS-Backlog.md) | Post–2D deferred work; promotion rules |
| [DocOS-Database-Schema.md](DocOS-Database-Schema.md) | Tables, columns, indexes, ERDs |
| [DocOS-(Phase 1).md](DocOS-(Phase%201).md) | Locked MVP archive (do not rewrite for Phase 2) |

---

## 1. What this record supersedes (2 Oct → 3 Oct 2026)

| Earlier draft | Locked decision |
| :--- | :--- |
| PostgreSQL + SQL Server, two migration folders | SQL Server only; one folder under `DocOS.Infrastructure/Migrations` |
| One big Phase 2 release (identity, billing, vitals, labs, messaging, ABDM) | Sequential **2A → 2B → 2C → 2D**, then **[DocOS-Backlog.md](DocOS-Backlog.md)** |
| `DosageFrequencyMaster` / `DosageTimingMaster` | Dosage string (`1-0-1`) + `DosageTiming` enum; `DurationDays` as `int` |
| `ComplaintMaster` in Phase 2 | `ChiefComplaints` stays free text |
| ABDM as Phase 2 compliance work | ABDM deferred; identifiers ≠ compliance; `IsAbhaVerified` false until a real flow exists |
| `ClinicMonthlyUsage.YearMonth` | `ClinicPeriodUsage` aligned to subscription `PeriodStart` / `PeriodEnd` |
| Status, tier, expiry, max doctors on `Clinics` | Lifecycle only on `ClinicSubscription`; cap via plan + `MaxDoctorsOverride` |
| `IsDoctorFavorite` on `Medicines` | `DoctorMedicineFavorite` unique on `(UserId, MedicineId)` |
| `DoctorId` as `uniqueidentifier` | `nvarchar(450)` — same as `AspNetUsers.Id` |
| Clinic-wide queue without doctor assignment | Check-in and registration require `DoctorId`; search can filter by doctor while showing clinic-wide token/status |

---

## 2. Rationale (short)

**One database provider.** Two migration sets double every schema change and drift. Phase 1 PostgreSQL remains a tagged MVP snapshot; Phase 2 uses a new SQL Server database.

**Four parts.** The original scope was too large for one release. Each part must ship without breaking the previous one (identity before billing; column vitals until 2C; labs and public link in 2D).

**Doctor-tied workflows.** Multi-doctor clinics need per-doctor tokens and directories; reception keeps clinic-wide visibility. Patients belong to the clinic; visits are never unassigned.

**Free-text complaints and dosage shorthand.** Matches Indian OPD notes and printed scripts; master tables add friction without changing the paper.

**Usage follows the invoice period.** Quarterly/annual clinics are not served by calendar `YearMonth`. Top-ups apply to the current period only; unused quota does not roll forward (PlatformAdmin can still raise quota or set unlimited).

**Favorites per doctor.** The global formulary is shared; a boolean on `Medicines` cannot mean “my shortcut” for one doctor.

**Audit as a normal table.** `AuditLogs` with `ChangesJson` for create/update/delete/login/print—not a tamper-proof ledger, not a row per queue view.

**Handover on screen in 2B.** WhatsApp/SMS need provider, templates, and consent; QR + credentials on the login page until messaging is promoted from the backlog.

---

## 3. Reading order

1. **Status and what’s next** → [DocOS-Product-Roadmap.md](DocOS-Product-Roadmap.md).  
2. **Building a part** → [DocOS-(Phase 2).md](<DocOS-(Phase 2).md>) for scope and done-when.  
3. **Columns and indexes** → [DocOS-Database-Schema.md](DocOS-Database-Schema.md).  
4. **Future / deferred work** → [DocOS-Backlog.md](DocOS-Backlog.md).  
5. **Why a rejected idea stays out** → this file, §1–2.  
6. **What changed after Oct 2026** → this file, §4.

---

## 4. Change log

Newest first. One block per decision or schema change.

### 2026-10-03 — Slim ADR split from master spec

- **Decision:** Keep a dedicated ADR file for superseded drafts and rationale; scope and done-when lists stay in `DocOS-(Phase 2).md`; columns stay in `DocOS-Database-Schema.md`.
- **Rationale:** Avoid three documents repeating the same checklists; preserve history for future architecture discussion.

### 2026-10-03 — Hub + backlog doc set

- **Decision:** Add `DocOS-Product-Roadmap.md` as the entry point; keep Phase 1 as locked archive; move post–2D **Later** items to `DocOS-Backlog.md` with promotion rules.
- **Rationale:** Single place for completion status and stack truth; backlog items can be picked up later without living inside the Phase 2 execution spec.

### 2026-10-03 — Phase 2 (2A–2D) sign-off

- **Decision:** Mark parts 2A–2D complete on the roadmap; done-when checklists checked in `DocOS-(Phase 2).md`. Residual bugs and small enhancements go in `DocOS-Follow-ups.md`, not backlog promotion.
- **Rationale:** Ship milestone without blocking on polish; separate follow-ups from new feature backlog.
