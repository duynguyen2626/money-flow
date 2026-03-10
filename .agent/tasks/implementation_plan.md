# Implementation Plan - PocketBase ID Unification & 404 Fix

The objective is to unify the ID system across the application to consistent use PocketBase 15-character IDs instead of Supabase UUIDs or short slugs, resolving 404 errors and display inconsistencies.

## User Review Required
> [!IMPORTANT]
> This change will update URLs for accounts to use PocketBase 15-character IDs (e.g., `a8x0bfww00lncfk`) instead of the previous 8-character slugs (e.g., `e2e64637`). This is necessary to resolve the 404 errors during lookup.

## Proposed Changes

### [Component] PocketBase Service Layer
#### [MODIFY] [account-details.service.ts](file:///c:/Users/nam.thanhnguyen/Github/money-flow-3/src/services/pocketbase/account-details.service.ts)
- Update `mapAccount` to use `record.id` as the primary `id`. Remove the `record.slug || record.id` logic.
- Update `mapTransaction` to use `record.id` as the primary `id`. Remove the `record.metadata?.source_id || record.id` logic.
- Update `getPocketBaseAccountSpendingStatsSnapshot` to verify if the account exists before fetching cycles, and ensure it uses the correct PB ID.
- Update `loadPocketBaseTransactions` to correctly map filters when IDs are passed.

#### [MODIFY] [transaction.service.ts](file:///c:/Users/nam.thanhnguyen/Github/money-flow-3/src/services/transaction.service.ts)
- Ensure all calls to `loadTransactions` are correctly handled.
- Verify `createTransaction` correctly maps the newly created PB ID.

### [Component] Database Migration
#### [MODIFY] [migrate.mjs](file:///c:/Users/nam.thanhnguyen/Github/money-flow-3/scripts/pocketbase/migrate.mjs)
- Maintain consistent ID hashing using `toPocketBaseId`.
- [NEW] Re-migrate `foundation` (people, categories) and `shops` phases to ensure all columns are populated.

### [Component] API & Data Quality Fixes
#### [FIXED] [account-details.service.ts](file:///c:/Users/nam.thanhnguyen/Github/money-flow-3/src/services/pocketbase/account-details.service.ts)
- Removed `target_account_id` from `expand` and `filter` (field does not exist in PB schema, use `to_account_id`).
- Removed `parent_transaction_id` from `expand` (field is `text`, not `relation`).
- This resolves the **400 error** when loading transactions.

## Verification Plan

### Manual Verification
- Navigate to the `/transactions` page and verify that transaction IDs (visible in tooltips or copy buttons) are 15-character alphanumeric strings, not UUIDs.
- Navigate to an account detail page and verify the URL contains a 15-character ID.
- Verify that cashback stats and transaction lists load without 404 or 400 errors.
- Confirm Category and Shop names/images appear correctly in the transaction table.
- Verify Category/Shop dropdowns in the Transaction Slide (V2) are populated.
