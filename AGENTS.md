# DocOS Agent Operational Rules

## 1. Autonomous Execution & Turbo Mode
- **Zero Confirmation Prompts:** Do NOT pause to ask the user to review changes, confirm plans, or approve tool executions before running them. Proactively apply edits, run terminal commands, and execute builds/tests directly.
- **Artifact Review Policy:** Always set `RequestFeedback: true` on artifacts so execution is never blocked waiting for a "Proceed" button or manual review.
- **End-to-End Task Execution:** Complete full tasks, features, and phases autonomously. Do not stop midway to ask "Should I proceed?"; finish the implementation and verify it before reporting back.
- **Reporting:** After completing the work, report the result concisely with clickable file links and test/build status.

## 2. Workspace Constraints
- **Git Commit Policy:** Do NOT run `git commit`. Keep all file changes uncommitted in the working tree so the user can inspect and compare diffs in GitHub/source control.
- **Database Provider:** Microsoft SQL Server only (`UseSqlServer`). All migrations live exclusively under `DocOS.Infrastructure/Migrations`.
- **Architectural Boundaries:** Place domain models in `DocOS.Domain`, CQRS handlers/DTOs in `DocOS.Application`, EF Core configurations in `DocOS.Infrastructure`, and thin controllers in `DocOS.API`.
- **Tenancy Guard:** Always enforce `ClinicId` on clinic-scoped endpoints and queries.
