# 🚧 HANDOVER: PocketBase Migration & ID Unification

This document summarizes the current state of the **Money Flow 3** migration from Supabase to PocketBase. The refactoring is currently in a fragmented state, causing UI failures and compilation errors.

## 🛑 Current Blockers
1.  **PocketBase 400 Bad Request**: Loading transactions on the `/transactions` page and account detail pages often fails with a 400 error.
    *   **Cause**: Likely invalid `filter` or `expand` parameters in `loadPocketBaseTransactions` or `getPocketBaseCycleTransactions`.
    *   **Status**: I removed `target_account_id` and `parent_transaction_id` from `expand`, which fixed some cases, but the error persists in others (possibly due to empty filters or JSON field access syntax).
2.  **ID Fragmentation**: 
    *   **PocketBase**: Uses 15-character alphanumeric IDs (e.g., `a8x0bfww00lncfk`).
    *   **Supabase**: Uses UUIDs.
    *   **Legacy**: Uses 8-character slugs for accounts (e.g., `e2e64637`).
    *   **Impact**: URLs like `/accounts/e2e64637` are being updated to use PB IDs. If a component passes a slug to a service expecting a PB ID without calling `resolvePocketBaseAccountId`, it returns 404.

## 🏗️ Refactoring Summary

### 1. Account Detail Refactoring (`AccountPage`)
*   **Location**: `src/app/accounts/[id]/page.tsx`
*   **Goal**: Transition to full PocketBase data fetching.
*   **Issue**: Compilation might fail if the built `accountWithStats` object doesn't strictly match the `Account` interface in `moneyflow.types.ts`.
*   **Cashback Caching**: The page now attempts to calculate annual fee progress manually from the `transactions` list to ensure accuracy.

### 2. Transaction Service Unification
*   **Location**: `src/services/pocketbase/account-details.service.ts`
*   **Changes**: 
    *   `mapTransaction` and `mapAccount` now use the native PB `id`.
    *   `loadPocketBaseTransactions` handles filters for `accountId`, `personId`, etc.
    *   **CRITICAL**: Many filters use `toPocketBaseId` (hashing) which works only if the input is a Supabase UUID. If the input is already a PB ID, it will double-hash and fail.

### 3. Cashback Logic ("Column-based")
*   **Location**: `src/types/moneyflow.types.ts` (`AccountStats`)
*   **Changes**: 
    *   Expanded `AccountStats` to include separate fields for `annual_fee_waiver` (target, progress, met) and `cashback` (min_spend, remains_cap).
    *   The user wants clear separation in the UI between "Cashback Progress" and "Waiver Progress".

## 🛠️ Instructions for Next Agent

### Step 1: Fix the 400 Error (Listing Transactions)
*   Investigate `loadPocketBaseTransactions` in `account-details.service.ts`.
*   Check if `metadata.source_id` in the filter is valid when `metadata` is empty.
*   Verify that `filters` array is never malformed (e.g., empty `&&` operators).
*   **Tip**: Use the temporary script `tmp/test_fixed_fetch.mjs` to debug specific filter combinations.

### Step 2: Solidify the ID System
*   Ensure all entry points (Server Actions, Page Params) resolve Slugs/UUIDs to PB IDs using `resolvePocketBaseAccountId` **ONCE** at the top level.
*   Avoid using `toPocketBaseId` (hashing) multiple times on the same variable.
*   Update `UnifiedTransactionTable` to handle 15-char IDs for navigation.

### Step 3: UI Data Quality
*   The mapping of `Category` and `Shop` images was recently fixed by a re-migration.
*   Ensure `UnifiedTransactionTable` correctly displays `category_image_url` instead of fallbacks where possible.

### Step 4: Page Compilation
*   Fix `src/app/accounts/[id]/page.tsx` type errors. Ensure the `stats` object passed to `AccountDetailViewV2` is fully compliant with `AccountStats`.

---
**Last Known Good State**: 
- `scripts/pocketbase/migrate.mjs` is functional for phases `foundation`, `shops`, and `accounts`.
- `tmp/test_fixed_fetch.mjs` shows that PB can respond if params are clean.
