# DocOS — Follow-ups (bugs & small enhancements)

**Phase 2 parts 2A–2D** are signed off. Accepted product rules live in [DocOS-(Phase 2).md](<DocOS-(Phase%202).md>). This file is a living tracker for **new** bugs and polish only—not backlog features (those stay in [DocOS-(Phase 3).md](<DocOS-(Phase%203).md>)).

Add items as you find them. No need for ADR unless behavior or schema changes.

---

## Bugs

| ID | Area | Description | Status |
| :--- | :--- | :--- | :--- |
| BUG-001 | Vitals / Consultation | Vitals should be read only once the consultation is completed. Backend rejects edits with 400 when visit status is Completed; UI disables inputs and switches actions to view-only 'Close' modal with 'View Vitals' button labels. | done |
| BUG-002 | Clinic Settings / Vitals | Clinic Vitals Configuration page --> click on Saved Preferences button gives error message 'Failed to save vital preferences'. Fixed Receptionist RBAC authorization on `VitalsController`, added robust deduplication & auto-insert of missing clinic preferences in `VitalHandlers`, and improved frontend error parsing & view-only fallback for non-authorized roles. | done |
| BUG-003 | Billing / RBAC | Hide OPD Fee Collection and Daily OPD Collection Report option for Nurse role; should be visible to Doctor, Clinic Admin, Receptionist. Added `canManagePayments` gate in OPD Queue header, card actions, and modal openers. | done |

---

## Enhancements

| ID | Area | Description | Status |
| :--- | :--- | :--- | :--- |

---

## Notes

- **Status:** `open` · `in-progress` · `done` · `wont-fix`
- Prefer linking a GitHub issue when one exists.
