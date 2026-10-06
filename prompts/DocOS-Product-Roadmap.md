# DocOS — Product Roadmap (hub)

**Start here** for what DocOS is, what shipped, what is in progress, and what is deferred. Detailed specs stay in the archive and part documents below—do not duplicate their full checklists in this file.

**Last reviewed:** 6 October 2026 · **Phase 2 (2A–2D):** accepted complete ([Follow-ups](DocOS-Follow-ups.md) for **new** bugs/polish)

---

## Current platform (source of truth)

| Area | Today |
| :--- | :--- |
| **Database** | Microsoft SQL Server (`UseSqlServer`), migrations in `DocOS.Infrastructure/Migrations` |
| **Backend** | .NET 10, Clean Architecture, CQRS (MediatR), ASP.NET Core Identity + JWT |
| **Frontend** | React, TypeScript, Vite, Tailwind |
| **Tenancy** | `ClinicId` on clinic staff JWT; platform roles (`PlatformAdmin`, `SalesAgent`) have null `ClinicId` and must not use clinic clinical APIs |

The [MVP archive](DocOS-(Phase%201).md) describes the original PostgreSQL MVP. That stack is historical; new work targets SQL Server.

---

## Delivery status

**Legend:** ✅ Done (spec done-when met) · 🟡 Partial (backend and/or UI/tests incomplete) · ⬜ Not started · — Archived (frozen spec, not re-verified each release)

| Milestone | Backend | Product (UI + E2E) | Notes |
| :--- | :---: | :---: | :--- |
| **MVP (Phase 1)** | — | — | Locked baseline; see [archive](DocOS-(Phase%201).md). Capabilities carried forward; provider changed in Phase 2. |
| **2A** Identity & multi-doctor | ✅ | ✅ | Done-when accepted 3 Oct 2026. |
| **2B** Onboarding & entitlements | ✅ | ✅ | Done-when accepted 3 Oct 2026. |
| **2C** Dynamic vitals | ✅ | ✅ | Done-when accepted 3 Oct 2026. |
| **2D** Labs, advice, link, OPD, audit | ✅ | ✅ | Done-when accepted 3 Oct 2026. |
| **Follow-ups** | — | — | New bugs & polish after 2A–2D: [DocOS-Follow-ups.md](DocOS-Follow-ups.md) |
| **Backlog** | — | — | New features after 2D; [promote](DocOS-Backlog.md#how-to-promote-an-item) before building. |

---

## Document map

| Document | Role |
| :--- | :--- |
| **[DocOS-Product-Roadmap.md](DocOS-Product-Roadmap.md)** (this file) | Status, stack truth, reading order |
| **[DocOS-(Phase 1).md](DocOS-(Phase%201).md)** | Locked MVP archive (PostgreSQL era)—do not rewrite for Phase 2 |
| **[DocOS-(Phase 2).md](<DocOS-(Phase%202).md>)** | Phase 2 spec (2A–2D complete); scope and done-when reference |
| **[DocOS-Follow-ups.md](DocOS-Follow-ups.md)** | Living tracker for new bugs and polish (signed-off 2A–2D rules live in Phase 2) |
| **[DocOS-Backlog.md](DocOS-Backlog.md)** | Deferred work after 2D; promotion rules for future parts |
| **[DocOS-Database-Schema.md](DocOS-Database-Schema.md)** | Tables, columns, indexes, ERDs |
| **[DocOS-Architecture-Decisions.md](DocOS-Architecture-Decisions.md)** | ADR: superseded drafts, rationale, **change log** |

---

## Reading order

1. **What should I build next?** → [Follow-ups](DocOS-Follow-ups.md) for any **new** bugs/polish, or [Backlog](DocOS-Backlog.md) for promoted features. Phase 2 parts 2A–2D are complete.  
2. **Columns or indexes?** → [DocOS-Database-Schema.md](DocOS-Database-Schema.md).  
3. **Why was X rejected?** → [DocOS-Architecture-Decisions.md](DocOS-Architecture-Decisions.md).  
4. **Future idea (WhatsApp, ABDM, …)?** → [DocOS-Backlog.md](DocOS-Backlog.md)—do not implement until promoted.  
5. **What did the original MVP promise?** → [DocOS-(Phase 1).md](DocOS-(Phase%201).md) only.

---

## Rules for agents and contributors

- Record architecture and schema decisions per [`AGENTS.md`](../AGENTS.md) §3.  
- Closing a part: check off done-when items in **Phase 2**, then update the **status table** in this hub.  
- Backlog items need a **promoted** part (or mini-spec) + ADR entry before code.
