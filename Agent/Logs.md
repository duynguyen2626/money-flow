# Agent Logs

## Issue: Voided Transactions Not Updating Debt on /people page

**Date:** December 2, 2025

**Problem Description:**
The user reported that voided transactions are not automatically deducting from the debt balance displayed on the `/people` page. This suggests an issue with either the balance recalculation for debt accounts or the revalidation of the `/people` path.

**Initial Investigation:**
- The `voidTransactionAction` in `src/actions/transaction-actions.ts` explicitly calls `revalidatePath('/people')` and `revalidatePath('/')`.
- The `voidTransaction` service function calls `recalculateBalance` for affected accounts.
- The `recalculateBalance` function in `src/services/account.service.ts` appears to correctly calculate the balance by summing debits and credits from non-voided transaction lines.

**Debugging Steps:**
1.  **Added logging to `recalculateBalance` in `src/services/account.service.ts`:**
    *   Logs were added to confirm when `recalculateBalance` is called, with which `accountId`, the number of lines fetched, and the calculated `currentBalance`, `totalIn`, and `totalOut` before updating the database. This will help verify if the function is being triggered for the correct debt accounts and if the calculations are as expected.

## Issue: Missing "Online Service" Category

**Date:** December 2, 2025

**Problem Description:**
The "Online Service" category is missing.

**Resolution:**
1.  **Created `hotfix-phase-64-category.sql`:**
    *   A SQL migration file was created to insert the "Online Service" category into the `public.categories` table.
    *   The `id` field uses `uuid_generate_v4()` to generate a unique ID.
    *   The `name` is 'Online Service'.
    *   The `type` is 'expense'.
    *   The `created_at` field uses `NOW()`.

**Next Steps:**
- Monitor logs from `recalculateBalance` to understand the flow and data during a void transaction affecting a debt account.
- Test the hotfix for the missing category.
