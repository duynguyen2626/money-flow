# Sprint 7: Cashback Matrix UI Implementation Plan

## Goal
Transform the Cashback page into a "Matrix View" Profit Dashboard.
- **Desktop**: A comprehensive heat-map style table showing monthly profit for each account.
- **Mobile**: Simplified cards with "Big Number" total profit and a detailed drill-down sheet.

## User Review Required
> [!IMPORTANT]
> This refactor completely replaces the existing `GlobalCashbackTable`. The old logic will be moved/deprecated.
> The new logic groups "Given" (Expenses) by transaction date and "Received" (Cashback) by income date, leading to potential negative monthly profits where spend occurs before cashback.

## Proposed Changes

### 1. Data Layer: Matrix Transformation
#### [NEW] `src/lib/cashback-matrix.ts`
- Define types: `CashbackMatrixRow`, `MatrixMonthData`.
- Implement `transformToCashbackMatrix(transactions)`:
  - Input: List of transactions.
  - Logic:
    - Group by Account.
    - Initialize 12 months for each account.
    - Sum `Given` (Expenses).
    - Sum `Received` (Income with Cashback category).
    - Calculate `Profit = Received - Given * cost - Fee`.
  - Output: `CashbackMatrixRow[]`.

#### [NEW] `src/actions/cashback-matrix.action.ts`
- Server Action `getCashbackMatrixData(year)`:
  - Fetches accounts (Credit Card & Volunteer).
  - Fetches transactions.
  - Calls `transformToCashbackMatrix`.

### 2. UI Components
#### [NEW] `src/components/cashback/cashback-matrix-table.tsx`
- **Desktop Only** (`hidden md:block`).
- Table with sticky first column (Account Name + Logo).
- 12 Columns for Months + 1 Total Column.
- Cell Styling:
  - Profit > 0: Green text, light green bg.
  - Profit < 0: Red text.
  - Profit = 0: Gray/Hidden.

#### [NEW] `src/components/cashback/cashback-mobile-list.tsx`
- **Mobile Only** (`md:hidden`).
- List of `AccountCard`.
- `AccountCard`:
  - Logo, Name.
  - **Total Profit** (Big Font).
  - "Best Month" highlight.
  - Tap opens `Sheet` with 12-month timeline detail.

### 3. Page Integration
#### [MODIFY] `src/app/cashback/page.tsx`
- Fetch data using `getCashbackMatrixData`.
- Render `CashbackMatrixTable` and `CashbackMobileList`.
- Add Year Selector and View Mode Toggle (Credit / Volunteer).

## Verification Plan

### Automated Tests
- None planned for UI components.
- Manually verify data aggregation correctness by comparing with raw transaction logs.

### Manual Verification
1.  **Desktop View**:
    - Verify Table layout alignment.
    - Check Sticky column behavior.
    - Verify Heatmap coloring (Green for profit, Red for loss).
2.  **Mobile View**:
    - Verify Card layout.
    - Test Sheet opening/closing.
    - Check "Best Month" logic.
3.  **Data Accuracy**:
    - Compare "Total Profit" with expected values from database.
    - Verify "Dồn" logic: Expense in Jan, Cashback in Feb -> Jan negative, Feb positive.
