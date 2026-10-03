# DocOS Agent Operational Rules

## 1. Autonomous Execution & Turbo Mode
- **Zero Confirmation Prompts:** Do NOT pause to ask the user to review changes, confirm plans, or approve tool executions before running them. Proactively apply edits, run terminal commands, and execute builds/tests directly.
- **Artifact Review Policy:** Always set `RequestFeedback: true` on artifacts.
- **End-to-End Task Execution:** Complete full tasks, features, and phases autonomously. Do not stop midway to ask "Should I proceed?"; finish the implementation and verify it before reporting back.
- **Reporting:** After completing the work, report the result concisely with clickable file links and test/build status.

## 2. Workspace Constraints
- **Git Commit Policy:** Do NOT run `git commit`. Keep all file changes uncommitted in the working tree so the user can inspect and compare diffs in GitHub/source control.
- **Database Provider:** Microsoft SQL Server only (`UseSqlServer`). All migrations live exclusively under `DocOS.Infrastructure/Migrations`.
- **Architectural Boundaries:** Place domain models in `DocOS.Domain`, CQRS handlers/DTOs in `DocOS.Application`, EF Core configurations in `DocOS.Infrastructure`, and thin controllers in `DocOS.API`.
- **Tenancy Guard:** Always enforce `ClinicId` on clinic-scoped endpoints and queries.

## 3. Architecture & schema documentation
- **Decision record:** Any new **architecture decision** (provider choice, tenancy rules, phasing, rejected alternatives, cross-cutting patterns) must be recorded in [`prompts/DocOS-Architecture-Decisions.md`](prompts/DocOS-Architecture-Decisions.md). Append a dated entry under **Change log** with context, the decision, and rationale. Do not rely on chat-only history.
- **Table / schema changes:** When adding or altering tables, columns, indexes, or EF mappings, **also** update that ADR change log with a short summary of *what* changed and *why*. Keep the authoritative column-level detail in [`prompts/DocOS-Database-Schema.md`](prompts/DocOS-Database-Schema.md) in the same change (same PR / same work session).
- **Scope:** Keep the slim ADR for historical record and future architecture discussion. Do not duplicate full part specs from `DocOS-(Phase 2).md` or full ERDs from the database schema doc.
