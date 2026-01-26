# Handover: Transaction Table Layout Refactor

**Date:** Jan 12, 2026
**Status:** Emergency Fix Complete

## Summary
We have successfully refactored the Transaction Table (`TransactionRow.tsx`) to use a **Fixed-Width CSS Grid Layout**. This resolves critical issues with column alignment, overlapping badges, and layout shifts.

## Update (Jan 26, 2026)
- Unified Flow rendering in `UnifiedTransactionTable`:
    - People debt badge order: [tag][name][avatar]
    - Badges align left; name aligns right in target entity
    - Refund flow badges restored with text
    - From/To badges darker in account/person detail views + hint text added under table for account details
- Cycle badge format updated to `dd-MM~dd-MM` and consistent size
- Calendar-month cycle now renders range (no blank)
- Account details context fix: `AccountContentWrapper` no longer depends on context provider

## Key Changes
1.  **Grid Layout**: Encapsulated in `ui_standards.md`. Flow column is now fixed at `480px`.
2.  **Image Rendering**:
    *   **Shop Icons**: `rounded-md` (Square).
    *   **Person Avatars**: `rounded-full` (Circle).
    *   **Account Images**: Original aspect ratio.
3.  **Badges**: Standardized to `24px` height, removed duplicates.

## Documentation
*   [UI Standards](.agent/context/ui_standards.md): **READ THIS FIRST**. It contains the strict rules for the grid and images.
*   [Gravity Rules](.agent/rules/gravityrules.md): (Note: might need manual update if agent failed to write) Contains the compliance rules.

## Next Steps for Next Agent
1.  **Mobile Responsiveness**: The current fix targets Desktop (Grid). Mobile view (`block` layout) was touched but needs verification.
2.  **Other Tables**: Check `PeopleDetails` and `AccountDetails` tables. They likely share Similar components but might not be using the new strict Grid yet.
3.  **Legacy Code**: Continue removing any V1/V2 legacy components not in use.

---

## Agent Prompt (Copy & Paste to Next Agent)

```md
@workspace We are continuing the "Transaction Layout Refactor".
The previous agent established a STRICT Fixed-Width Grid Layout for the main Transaction Table and fixed Image Rendering rules.

Your Logic State:
1. READ `.agent/context/ui_standards.md` immediately. This is the Source of Truth.
2. CHECK `src/components/transactions/TransactionRow.tsx` to understand the reference implementation.
3. TASK:
   - Verify Mobile Layout of Transaction Row (ensure it doesn't break).
   - Audit `src/components/people/v2/SimpleTransactionTable.tsx` (or equivalent) and apply the same Image Rendering Rules (Shop=Square, Person=Circle).
   - Do NOT break the Desktop Grid Layout (7 columns).

Rules:
- Person Avatars MUST be `rounded-full`.
- Shop Icons MUST be `rounded-md`.
- No currency symbols in amounts.
```
