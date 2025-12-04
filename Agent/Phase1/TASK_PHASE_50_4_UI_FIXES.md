# Phase 50.4: UI Fixes & Bug Hunt

## Objectives
1.  **Tag UI Alignment:**
    -   Rename "Debt Cycle (Tag)" to "Tag".
    -   Move suggested tag badges (e.g., SEP25) to the header row, inline with icons.
2.  **Input Sizing:**
    -   Standardize text size for Amount input (remove `text-xl`, use standard size).
    -   Ensure alignment with other fields.
3.  **Sticky Type Selector:**
    -   Make the Transaction Type selector sticky at the top of the form.
4.  **Rounded Corners:**
    -   Fix bottom-right corner radius issue in the modal.
5.  **Transaction History Bug:**
    -   Investigate why transactions are not loading (showing empty state).

## Implementation Plan
-   [x] **TransactionForm:** Refactor Tag input header.
-   [x] **SmartAmountInput:** Adjust font sizes.
-   [x] **TransactionForm:** Add `sticky` class to Type selector.
-   [x] **AddTransactionDialog:** Check/Fix border radius.
-   [x] **UnifiedTransactionTable:** Debug rendering logic.
