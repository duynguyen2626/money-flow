# Phase 12 Implementation Plan - Critical Bug Fixes

## Goal
Fix two high-priority bugs that impact core functionality of the Money Flow application.

## User Review Required
> [!IMPORTANT]
> **Priority Order**: These bugs should be fixed in order (S1 → S2) as they are blocking core features.

---

## Proposed Changes

### S1: Category Badges on Account Name Column

#### Problem Statement
Category badges are not displaying on the "Account Name" column in transaction tables, making it harder for users to quickly identify transaction categories at a glance.

#### Investigation Steps

##### Step 1: Verify Data Availability
**File**: `src/services/transaction.service.ts`
- Check if `category_name`, `category_icon`, and `category_image_url` are being fetched in transaction queries.
- Verify the JOIN with the `categories` table is working correctly.

##### Step 2: Check Type Definitions
**File**: `src/types/moneyflow.types.ts`
- Confirm `Transaction` or `TransactionWithDetails` type includes category fields.
- Ensure `category_icon` and `category_image_url` are properly typed.

##### Step 3: Review Rendering Logic
**File**: `src/components/moneyflow/unified-transaction-table.tsx`
- Locate the "Account Name" column rendering logic (search for `case "account"` or similar).
- Check if category badges are being rendered or if the logic is missing.
- Compare with other columns that successfully display badges (e.g., "Flow" column).

#### Implementation Options

**Option A: Category Badge Already Implemented (Just Broken)**
- Debug the conditional logic preventing display.
- Fix data mapping or prop passing issues.
- Ensure badges are not hidden by CSS or conditional rendering.

**Option B: Category Badge Not Implemented**
- Add category badge rendering to the Account Name cell.
- Use existing badge components (e.g., `CategoryBadge` or inline badge).
- Style consistently with other badges in the table.

#### Proposed UI
```tsx
// Example rendering for Account Name cell
<div className="flex items-center gap-2">
  <AccountIcon src={account.image_url} />
  <span>{account.name}</span>
  {txn.category_name && (
    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
      {txn.category_name}
    </span>
  )}
</div>
```

#### Files to Modify
- [MODIFY] [unified-transaction-table.tsx](file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/unified-transaction-table.tsx)
- [VERIFY] [transaction.service.ts](file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/services/transaction.service.ts)
- [VERIFY] [moneyflow.types.ts](file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/types/moneyflow.types.ts)

---

### S2: Auto-Transaction Creation on Services Page

#### Problem Statement
The Services page is configured to auto-create transactions on Day 1 of each month, but transactions are not being created automatically. The auto-run logic appears to be failing silently.

#### Investigation Steps

##### Step 1: Locate Auto-Run Logic
**Files to Review**:
- `src/app/services/page.tsx` (or detail page)
- `src/services/service.service.ts`
- `src/actions/service-actions.ts`

**Questions to Answer**:
- Is there a cron job, scheduled task, or API route handling auto-creation?
- Is the logic triggered on page load, or is there a separate background job?
- Is there a `next_run_date` field in the database that tracks when to run next?

##### Step 2: Check Database Schema
**Table**: `services`

**Expected Columns**:
- `auto_run_day` (integer, 1-31): Day of month to auto-create transaction
- `next_run_date` (date): Next scheduled run date
- `is_active` (boolean): Whether the service is active
- `last_run_date` (date): Last time a transaction was created

**Verify**:
- Are these columns present?
- Are they populated correctly for test services?

##### Step 3: Debug Execution Flow
**Add Logging**:
- Log when auto-run logic is triggered.
- Log the date calculation logic (e.g., "Today is 2026-02-01, checking services with auto_run_day = 1").
- Log success/failure of transaction creation.

**Check for Common Issues**:
- Timezone mismatches (server time vs. user time)
- Off-by-one errors in date comparison
- Silent failures (try/catch blocks swallowing errors)
- Permissions issues (service account can't write to transactions table)

##### Step 4: Test Manually
- Create a test service with `auto_run_day = 1`.
- Manually trigger the auto-run logic (via API call or function).
- Verify a transaction is created in the `transactions` table.

#### Potential Root Causes

**Hypothesis 1: No Background Job**
- The auto-run logic might be designed to run on page load, but users aren't visiting `/services` on Day 1.
- **Solution**: Implement a proper cron job or scheduled task (e.g., Vercel Cron, Supabase Edge Function).

**Hypothesis 2: Date Logic Bug**
- The date comparison might be incorrect (e.g., comparing UTC vs. local time).
- **Solution**: Fix date calculation to use consistent timezone.

**Hypothesis 3: Silent Failure**
- The logic is running but failing due to validation errors or missing data.
- **Solution**: Add proper error handling and logging.

**Hypothesis 4: Database Trigger Missing**
- There might be a missing database trigger or constraint.
- **Solution**: Add a database function or trigger to auto-create transactions.

#### Proposed Solution (TBD after investigation)
- **If no background job exists**: Implement a Vercel Cron job or Supabase Edge Function to run daily.
- **If date logic is broken**: Fix the date comparison logic.
- **If silent failure**: Add error logging and fix the underlying issue.

#### Files to Modify
- [VERIFY] [services/page.tsx](file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/services/page.tsx)
- [MODIFY] [service.service.ts](file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/services/service.service.ts)
- [MODIFY] [service-actions.ts](file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/actions/service-actions.ts)
- [POTENTIAL] Create new API route: `src/app/api/cron/auto-transactions/route.ts`

---

## Verification Plan

### S1: Category Badges
**Manual Verification**:
1. Navigate to Account Details page.
2. Verify category badges appear on the Account Name column for each transaction.
3. Test with different categories (Food, Transport, Entertainment, etc.).
4. Verify badges are styled consistently and don't break layout.

### S2: Auto-Transactions
**Manual Verification**:
1. Create a test service with `auto_run_day = 1`.
2. Wait for Day 1 of the month (or manually trigger the cron job).
3. Verify a transaction is created in the transactions table.
4. Verify the transaction has correct amount, category, and date.

**Automated Tests** (if time permits):
- Unit test for date calculation logic.
- Integration test for transaction creation.

---

## Success Criteria

### S1: Category Badges
- [ ] Category badges display on Account Name column
- [ ] Badges show correct category name
- [ ] Badges are styled consistently with other badges
- [ ] Layout is not broken by badge addition

### S2: Auto-Transactions
- [ ] Transactions are created automatically on the configured day
- [ ] Transactions have correct data (amount, category, date)
- [ ] Auto-run logic is logged for debugging
- [ ] Error handling is in place for failures

---

## Notes

- **Dependency**: S2 might require infrastructure changes (cron job setup) which could be outside the scope of code changes.
- **Testing**: Due to iCloud Drive EPERM issues, rely on dev server and manual testing.
- **Documentation**: Update `walkthrough.md` with findings and solutions after each scenario is fixed.
