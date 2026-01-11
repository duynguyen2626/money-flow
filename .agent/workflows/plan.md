# Refactoring Plan: People Details UI (V2)

## Context
The People Details page (`/people/[id]/details`) has been visually updated to support:
1.  **Grouped Timeline**: Year filter + Timeline pills wrapped in a bordered container.
2.  **Paid Stat**: An interactive "Paid" button in the stats bar that opens a modal.

**Current State**: The changes were implemented **inline** within `src/app/people/[id]/details/member-detail-view.tsx` to quickly achieve the visual result. This has created technical debt as it bypasses the reusable components `DebtTimeline` and `StatsToolbar`.

## Objectives
Refactor the inline code in `member-detail-view.tsx` to use properly structured components.

## Step-by-Step Plan

### 1. Refactor DebtTimeline
-   **Target File**: `src/components/people/v2/DebtTimeline.tsx`
-   **Task**: Update this component to include the "Grouped Container" styling (border, padding) that is currently hardcoded in `member-detail-view.tsx`.
-   **Props**: Ensure it accepts all necessary event handlers (`onYearChange`, `onCycleClick`, etc.).

### 2. Refactor Stats Toolbar
-   **Target File**: `src/components/people/v2/StatsToolbar.tsx` (or create if missing/different).
-   **Task**:
    -   Update the component to support the **LEND -> REPAY -> CASHBACK -> PAID** order.
    -   Add the "Paid" button with the specific styling (Purple background, CheckCircle icon).
    -   Expose an `onPaidClick` handler.

### 3. Cleanup Member Detail View
-   **Target File**: `src/app/people/[id]/details/member-detail-view.tsx`
-   **Task**:
    -   Import `DebtTimeline` and `StatsToolbar`.
    -   Replace the inline timeline `div` with `<DebtTimeline ... />`.
    -   Replace the inline stats `div` with `<StatsToolbar ... />`.
    -   Connect the state (`showPaidModal`, filters) to these components.

### 4. Verification
-   Ensure visual regression is zero (UI looks exactly identical to the screenshot).
-   Verify "Paid" button still opens the `PaidTransactionsModal`.
