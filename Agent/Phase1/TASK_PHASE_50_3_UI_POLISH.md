# Phase 50.3: UI Polish & Fixes

## Objectives
1.  **Debt Cycle (Tag) Redesign:**
    -   Fix misalignment with Date field.
    -   Remove "Recent: ..." text list.
    -   Replace with Badges/Tags.
    -   Add icons for: Previous Month (<), Reset/Current (RotateCcw).
    -   Simplify suggestions.
2.  **Cashback Input Refinement:**
    -   Compact the input container.
    -   Increase font size of the Vietnamese text amount (e.g., "222 ngàn...").
3.  **Repayment Layout Fix:**
    -   Fix misalignment of fields in Repayment mode.
4.  **Refund Note Display:**
    -   In Transaction Table, "Notes" column: Hide Shop Name for refund transactions, show only Icon.

## Implementation Plan
-   [x] **TransactionForm:** Refactor `TagInput` section.
-   [x] **TransactionForm:** Refactor `CashbackInputs` section and style.
-   [x] **TransactionForm:** Review and fix `repayment` grid layout.
-   [x] **UnifiedTransactionTable:** Update "shop" column renderer to hide text for refunds.
