# Migration Cleanup Summary

## Changes Made:
- [x] Removed all references to `transaction_lines_old` in `cashback.service.ts`
- [x] Updated `fetchAccountLines` to query `transactions` table (single-table architecture)
- [x] Refactored `toTransaction` to handle flattened transaction rows
- [x] Cleaned up types to remove nested `transaction_lines` assumptions
- [x] Created migration `20251206000007_drop_transaction_lines_old.sql`
- [x] **Fix 1:** Resolved `column transactions.created_by does not exist` error
    - [x] Verified user applied migration `20251206000006_add_created_by_to_transactions.sql`
    - [x] Restored `created_by` logic in `transaction.service.ts`, `batch.service.ts`, and `shop.service.ts`
- [x] **Fix 2:** Resolved `column transactions.persisted_cycle_tag does not exist` error
- [x] **Fix 3:** Resolved `column transactions.is_installment does not exist` error
- [x] **Fix 4:** Resolved `column transactions.installment_plan_id does not exist` error
    - [x] **COMPREHENSIVE FIX**: Created migration `20251206000008_ensure_all_transaction_columns.sql` to add ALL missing columns at once.
    - [x] Restored `persisted_cycle_tag`, `is_installment`, and `installment_plan_id` to `transaction.service.ts`.
- [x] **Fix 5:** Resolved Service Distribution Bug
    - [x] Fixed `null value in column "amount"` error in `service-manager.ts` by correctly adding `amount` and `type` to transaction creation.
    - [x] Fixed `PGRST200` error in `installment.service.ts` by removing brittle foreign key hints.

## Files Modified:
- src/services/cashback.service.ts
- src/services/transaction.service.ts
- src/services/batch.service.ts
- src/services/shop.service.ts
- src/services/service-manager.ts
- src/services/installment.service.ts
- supabase/migrations/20251206000007_drop_transaction_lines_old.sql
- supabase/migrations/20251206000008_ensure_all_transaction_columns.sql

## Testing:
- [x] npm run build passes successfully
- [x] Verified no remaining references to missing columns in code (assuming migration is run)
- [x] Confirmed all logic (created_by, cycle_tag, installments, service-distribute) is fully restored in code.

## Status: READY FOR DEPLOYMENT
> [!IMPORTANT]
> Please run the final migration `supabase/migrations/20251206000008_ensure_all_transaction_columns.sql` to enable all restored features.
