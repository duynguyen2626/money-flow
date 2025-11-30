# Phase 50.5: Final Polish & Bug Fixes

## Objectives
1.  **Smart Amount Input:**
    -   Add decimal separators (commas) while typing.
    -   Hide Vietnamese text amount in suggestions dropdown.
2.  **Dropdowns:**
    -   Ensure "Create New" button is visible in all dropdowns (Category, Shop, Person).
    -   Hide "System" accounts from the Account dropdown.
3.  **Person Debt Link:**
    -   After clicking "Create & Link Now", hide the button/warning.
    -   Show a badge indicating "Linked" with a link to the person's details page (new tab).
4.  **Hydration Error:**
    -   Fix the hydration mismatch error in `AppLayout` caused by `sticky` positioning or other DOM mismatches.

## Implementation Plan
-   [x] **SmartAmountInput:** Fix formatting logic to show commas during input.
-   [x] **SmartAmountInput:** Remove text amount from suggestions.
-   [x] **TransactionForm:** Verify `onAddNew` props are passed to all `Combobox` instances.
-   [x] **TransactionForm:** Filter out system accounts in `accountOptions`.
-   [x] **TransactionForm:** Update `PersonInput` logic to handle "Link Debt" state changes.
-   [x] **AppLayout:** Investigate and fix hydration error (likely `h-screen` or `sticky` on server vs client).
