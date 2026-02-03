# Transaction Slide V2 & UI Enhancements - Project Status

## Current Status: Phase 1B Complete ✅
As of Jan 2026, the following features are **production-ready**:

### 1. Unified Transaction Table
- **Customizable Columns**: Users can show/hide accounts, category, shop, person, date, amount, types, notes, tags, status.
- **Fixed Columns**: Date and Action columns are pinned.
- **Split Button Filters**: Enhanced hover states and interaction for "Income/Expense/Lend/Repay" filters.
- **Square Avatars**: STRICT adherence to square avatars (rounded-none) for People and Accounts.

### 2. Transaction Slide V2
- **Unified Slide**: Support for Single and Bulk transactions.
- **Recent Logic**:
  - Remembers last submitted Person and Account.
  - Dropdown logic: Current Selection + Last Submitted (Max 2 recent items).
- **Split Bill V2**: fully implemented with "Split Equally" and "Distribute Remainder".
- **Unsaved Changes**: Right-side warning sheet to prevent data loss.
- **Image Styling**: Consistent square avatars.

### 3. Documentation
- **Manual Guides**: `docs/split_bill_v2_manual.vi.md` (Vietnamese).
- **Rules**: `.agent/rules/ui_rules.md` (Strict UI standards).

---

## Next Steps (Phase 1C / Phase 2)

### 1. Main Integration
- Replace the legacy "Add Transaction" modal with **Transaction Slide V2** globally.
- Ensure the '+' button in the main `UnifiedTransactionsPage` triggers Slide V2 by default (already partially done via `onAddWithState`).

### 2. Cards Integration
- Add "Quick Add" actions to Account Cards and People Cards.
- Context-aware pre-filling (e.g., clicking "Add" on a Credit Card pre-fills that account and defaults to "Expense").

### 3. Mobile Optimization
- Verify slide-over behavior on mobile (width, touch interactions).
- Ensure "Recent" logic works well on smaller screens.

## Technical Notes for Next Developer
- **State Management**: The `UnifiedTransactionsPage` manages the `isSlideOpen`, `slideMode`, and `slideOverrideType` states.
- **Recent Logic**: Implemented using `localStorage` keys `mf_last_submitted_person_id` and `mf_last_submitted_account_id`.
- **UI Rules**: Check `.agent/rules/ui_rules.md` before making UI changes. **NEVER** round avatars in dropdowns.

## Zod Crash Debugging Plan
- [ ] **Robust Resolver**: Wrap `zodResolver` execution in a `try-catch` block to return a safe fallback (empty values/errors) instead of crashing the UI.
- [ ] **Schema Validation**: Add explicit checks for `schema.safeParse` in `safeResolver`.
- [ ] **Zod Import Fix**: Investigate `zod` import. Verify `z.version` availability.
- [ ] **Duplicate State Decoupling**: Maintain `duplicateData` state in `UnifiedTransactionsPage` to avoid race conditions.
