# Phase 6: Cashback Reboot & Legacy Cleanup (Account Tab)

## Overview
This phase focused on reviving the Cashback Analysis UI within the Account Detail page, fixing critical data correctness issues, and removing legacy dependencies on the `transaction_lines` table.

## Key Changes

### 1. Cashback Analysis UI (`src/components/moneyflow/cashback-analysis-view.tsx`)
- **Revival**: Ported and integrated the Cashback Analysis view into the Account Detail tabs.
- **Features**:
    - **Cycle Selector**: Added "All History" option to debug missing transactions.
    - **Stats Cards**: Displays accurate calculations for Net Profit, Earned, Shared, and Cap.
    - **Transaction Table**: Lists cashback entries with detailed breakdown (Bank Back, People Back, Profit).

### 2. Database & Logic Fixes
- **Trigger**: Implemented `trg_account_cashback_config_update` to sync cycle metadata when account config changes.
- **Data Fetching**:
    - **Fixed**: `getAllCashbackHistory` and `getCashbackProgress` in `cashback.service.ts` now query `transactions` directly, bypassing the broken `transaction_lines` relationship.
    - **Result**: "All History" view now correctly aggregates data across all cycles.

### 3. Cleanup: Removal of `transaction_lines` Usage
The codebase was refactored to remove dependence on the legacy `transaction_lines` table, simplifying the architecture to a flat `transactions` table.
- **`src/services/cashback.service.ts`**: Replaced all `transaction_lines` joins with direct `categories`/`shops` joins.
- **`src/actions/refund-actions.ts`**: Refactored `confirmRefundMoneyReceived` to insert directly into `transactions` (using `target_account_id` for transfers).
- **`src/actions/transaction-actions.ts`**: Updated `restoreTransaction` and `getOriginalAccount` to use flat transaction fields.
- **`src/app/api/debug/recalc-cashback/route.ts`**: Removed `transaction_lines` from debug query and added manual `category_name` mapping.

## Verification
- **Build**: Passed `npx tsc --noEmit` (ignoring unrelated Next.js cache errors).
- **Manual QA**:
    - Verified "All History" in Cashback Analysis loads correct totals.
    - Verified specific transactions (e.g., Nov tuition) appear in the analysis.
    - Confirmed no errors when viewing cashback details.

## Next Steps
- Continue monitoring `cashback_cycles` accuracy.
- Consider further cleanup of any unused `transaction_lines` artifacts in DB if confirmed obsolete.
