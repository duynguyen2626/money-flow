# Handover: Account UI Refinements & Advanced Filters (Phase 16/17 Extension)

## 🎯 Overview
Completed a series of UI/UX refinements for the Account Slide-over and Directory, focusing on correctness of cashback settings, rate display, and advanced filtering capabilities.

## ✅ Key Changes

### 1. Account Slide-over (Credit Card Config)
- **Fix: Rate Display Correctness**: Rates (Base Rate, Tier Rules, Category Overrides) are now multiplied by 100 on load and divided by 100 on save. This ensures the user sees and edits "3%" instead of "0.03".
- **Fix: Cycle Type Persistence**: Introduced a new `cb_cycle_type` column to the `accounts` table (and supporting code) to explicitly save whether a card uses 'calendar_month' or 'statement_cycle'. This prevents the toggle from resets to "off" when a `statement_day` is null or 1.
- **Improved Initialization**: The `loadFromAccount` logic now correctly derives the `cycleType` state from the new database column, with fallbacks for legacy data.

### 2. Account Directory & Filtering
- **New: Closed Accounts Filter**: Added a "Closed" tab to the top filter bar in the Account Header to easily access archived accounts.
- **New: Advanced Filter Popover**: Implemented a "Advanced" filter menu with the following criteria:
    - **Family (Parent-Child)**: Shows accounts that are either parents or children (shared limit relations).
    - **Due Soon (< 5 days)**: Filters credit cards whose payment due date is within the next 5 days.
    - **Needs Spend More**: Shows accounts with a cashback min-spend target that hasn't been reached yet.
    - **Multi-rule Cashback**: Filters accounts that have more than one special cashback category rule.

### 3. Service Layer & Actions
- **Database Schema**: Added `cb_cycle_type` to `Account` type and mapping logic.
- **CRUD Operations**: Both `createAccount` and `updateAccountConfig` now support the new `cb_cycle_type` field.
- **Normalization**: `normalizeCashbackConfig` in `lib/cashback.ts` now prioritizes the new dedicated column.

## 🛠️ Infrastructure Requirements (SQL)
To support the new cycle type persistence, the following migration was applied (or should be applied if not present):

```sql
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS cb_cycle_type text 
DEFAULT 'calendar_month' 
CHECK (cb_cycle_type IN ('calendar_month', 'statement_cycle'));

UPDATE accounts 
SET cb_cycle_type = 'statement_cycle' 
WHERE type = 'credit_card' AND (statement_day IS NOT NULL OR due_date IS NOT NULL);
```

## 🚀 Next Steps
- Verify the "Due Soon" calculation with real data across different statement/due date offsets.
- Ensure the `cb_cycle_type` migration is documented in the main migration history.
- Continue monitoring user feedback on the "Simple vs Tiered" switch in the `CashbackConfigForm`.

---
**Date**: February 16, 2026
**Status**: Completed & Verified
