# Sprint 7: Cashback Matrix UI - Walkthrough

## Overview
We have completely redesigned the Cashback page into a "Matrix View" Profit Dashboard, focusing on "One glance insight" without the need for manual expand/collapse interactions.

## Key Features

### 1. Data Layer: Matrix Transformation
- **Logic**: Groups "Given" (Expenses) and "Received" (Cashback/Income) by month.
- **Profit Formula**: `Profit = Received - Fees - Shared Amount`. 
  - "Received": Income transactions (Bank Payback).
  - "Shared Amount": Cashback shared with others (tracked via `cashback_entries` with `mode='real'`).
- **Files**:
  - `src/lib/cashback-matrix.ts`: Core transformation logic.
  - `src/actions/cashback-matrix.action.ts`: Server action to fetch and process data.

### 2. Desktop UI: The Matrix Table
- **Component**: `CashbackMatrixTable` (`src/components/cashback/cashback-matrix-table.tsx`)
- **Sorting**: Active accounts (with data) appear top, then sorted by Prophet.
- **Design**:
  - **Sticky Header**: Table header freezes on vertical scroll (max 75vh).
  - **Sticky Column**: Account column freezes on horizontal scroll.
  - 12-month heatmap columns (Green for Profit, Red for Loss).
  - **Total Profit** column highlighted.

### 3. Mobile UI: Smart Cards
- **Component**: `CashbackMobileList` (`src/components/cashback/cashback-mobile-list.tsx`)
- **Design**:
  - Compact Cards showing only the most important info: Account Name, **Big Total Profit**, and "Best Month".
  - **Drill-down**: Tapping a card opens a Sheet with a detailed 12-month timeline.

### 4. Integration
- **Page**: `src/app/cashback/page.tsx`
- **Features**:
  - Year Selector (2024-2026).
  - View Toggle: "Cashback" (Credit Cards) vs "Volunteer" (Loans/Investments).
  - Responsive layout ensuring the best experience on both Desktop and Mobile.

## Verification
- **Build Status**: Passed initial compilation.
- **Data Check**: Ensure that "Given" reflects spending month and "Received" reflects cashback receipt month.

## Bug Fixes (v2.1)
- **Sticky Header**: Fixed issue where table internal scroll prevented header from sticking.
- **Auto-Link Debt Account**: Restored logic to auto-select "Receivable" account when choosing a Person in Lending/Repayment mode.
- **Edit Account**: Added error logging to debug save failures.
- **Edit Transaction**: Added logic to backfill missing `debt_account_id` from person profile when opening the Edit dialog, ensuring validation passes.
- **Build Fix**: Resolved duplicate `watchedPersonId` declaration in `TransactionForm`.
- **UI UX**: Enforced **"Auto-Pick" (Read-Only)** mode for Destination Account in Lending/Repayment transactions. It now visually shows the linked person's account but prevents manual changes.

- **Build Fix (v2.2)**: Fixed `Runtime TypeError: Illegal constructor` by adding missing `Lock` icon import in `TransactionForm.tsx`.
- **Optimistic Updates**: Implemented row-level loading indicators in `UnifiedTransactionTable` for immediate visual feedback during transaction edits.
- **Cashback UI**: Consolidated "Volunteer Cashback" into the main Cashback section for a cleaner form interface.

## Next Steps
- Monitor user feedback on the "Matrix" vs "Accordion" experience.
- refine "Given" cost logic if shared cashback becomes a priority requirement.
