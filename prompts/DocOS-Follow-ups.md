# DocOS — Follow-ups (bugs & small enhancements)

**Phase 2 parts 2A–2D** are marked **done** on the [roadmap](DocOS-Product-Roadmap.md). This file tracks known bugs, polish, and small enhancements that are **not** new backlog features (those stay in [DocOS-Backlog.md](DocOS-Backlog.md)).

Add items as you find them. No need for ADR unless behavior or schema changes.

---

## Bugs

| ID | Area | Description | Status |
| :--- | :--- | :--- | :--- |
| B01 | **Rx print / PDF** | Printed PDF does **not** match the prescription **modal** layout: boxes stack one per line and waste space on paper. Align **modal preview**, **browser print**, and **PDF** to the same compact box/grid styling where possible. | `done` |
| B02 | **Rx print / public link** | After a share **Rx URL** is generated, **Print prescription** produces a **blank** page (content missing in print/PDF path). | `done` |

---

## Enhancements

| ID | Area | Description | Status |
| :--- | :--- | :--- | :--- |
| E01 | **Date/time** | Display and handle all user-facing `datetime2` values in **India Standard Time (IST)**. Audit each date-time column and API/DTO surface (store UTC vs local policy documented in ADR if it changes). | `in-progress` — verify in UI |
| E02 | **Login / auth** | Remove **Onboard New Clinic** tab from the login page. Onboarding is **Platform Admin only** (Phase 1 self-serve tab is obsolete). | `idea` |
| E03 | **Navigation / queue** | Remove top header **New Patient** button; registration remains via **OPD Queue → Today’s OPD Queue** (New Patient Registration). | `idea` |
| E04 | **Medicines settings** | Clinic option/filter to **include global formulary** (`ClinicId` null) in the medicines grid **view-only** (no edit/delete of global rows). | `idea` |
| E05 | **Lab tests settings** | Clinic option/filter to **include global lab tests** in the grid **view-only**. | `idea` |
| E06 | **Advice settings** | Clinic option/filter to **include global advice master catalog** in the grid **view-only**. | `idea` |
| E07 | **Visits** | `VisitDate` (or equivalent) stores **date + time**: default time **00:00:00** on check-in/token; update to actual time when consultation starts (**Start Consultation**). Align SQL type (`date` → `datetime2` or separate time field) and migrations. | `idea` |
| E08 | **Onboarding / patients** | **Platform Admin** can set **patient ID prefix** during clinic onboarding (existing `PatientIdPrefix`); default = **first 4 letters of clinic name, uppercase** (current default behavior documented if different today). | `idea` |
| E09 | **Onboarding UI** | Show onboarding wizard steps as a **horizontal timeline** with a connecting line; **emphasize/darken** steps whose data is already saved. | `idea` |
| E10 | **Patients list** | Support **grid view** in addition to existing **card view**; user can switch between both. | `idea` |
| E11 | **Patients** | **Edit patient** flow (demographics and related fields per clinic scope). | `idea` |

---

## Notes

- **Status:** `open` · `in-progress` · `done` · `wont-fix`
- Prefer linking a GitHub issue when one exists.
