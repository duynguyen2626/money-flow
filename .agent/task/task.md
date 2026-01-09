# Sprint 7: Cashback Matrix UI

- [x] **Phase 1: Data Transformation**
  - [x] Create `src/lib/cashback-matrix.ts` type definitions and aggregation logic.
  - [x] Implement `getCashbackMatrixData(year)` function (Server Action/Service).
  - [x] Verify data aggregation logic logic (group by month, handle empty months).

- [x] **Phase 2: UI Components**
  - [x] Create `CashbackMatrixTable` (Desktop View).
    - [x] Sticky left column for Account.
    - [x] Month columns with heat-map style styling.
    - [x] Total Profit column.
  - [x] Create `CashbackMobileList` (Mobile View).
    - [x] Account Cards with Big Number Profit.
    - [x] Sparkline or trend indicator.
    - [x] Sheet/Drawer for 12-month detail view.

- [x] **Phase 3: Page Integration**
  - [x] Refactor `src/app/cashback/page.tsx` to use new components.
  - [x] Add Year Picker and Account Type Filter (Cashback/Volunteer).
  - [x] Ensure Responsive Design (md:block / md:hidden).

- [/] **Phase 4: Verification**
  - [x] Verify Desktop Matrix view alignment and data.
  - [x] Fix Sticky Header issue.
  - [x] Restore Auto-Pick Debt Account logic (Create Mode).
  - [x] Fix Edit Transaction Validation (Missing Debt Account).
  - [x] Verify Mobile Card view and Sheet interaction.
  - [x] Verify Data accuracy (Given input vs Received output).
  - [x] Implement Optimistic Updates (Row-Level Loading) for Transaction Edits.
  - [x] Fix Regression: Content Duplication in Cashback Form.
  - [x] Fix Regression: Runtime Crash on Add Transaction.
  - [x] Fix Regression: Sync Data Discrepancy (1% becoming 100).

