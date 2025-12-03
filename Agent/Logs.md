# Agent Logs

## Issue: Voided Transactions Not Updating Debt on /people page

**Date:** December 2, 2025

**Problem Description:**
The user reported that voided transactions are not automatically deducting from the debt balance displayed on the `/people` page.

**Resolution Status:**
The user has confirmed that the SQL function `get_debt_by_tags` has been updated to correctly handle voided transactions at the database level. This means the frontend logic now only needs to ensure proper data fetching and revalidation.

**Previous Debugging Steps:**
-   **Added logging to `recalculateBalance` in `src/services/account.service.ts`:** This logging was added to verify the behavior of balance recalculation. (Logging has since been removed as the primary fix is at the SQL level).

## Issue: Missing "Online Service" Category / Incorrect Category ID for Service

**Date:** December 2, 2025

**Problem Description:**
The "Online Service" category was missing, leading to "Uncategorized" issues for auto-distributed transactions. The service code also needed to be verified to use the correct category ID.

**Resolution Status:**
1.  **SQL Hotfix for "Online Services" Category:**
    *   `hotfix-phase-64-category.sql` was created and applied (by the user) to insert the "Online Service" category into the `public.categories` table with the ID `e0000000-0000-0000-0000-000000000088`.
2.  **Code Verification for Category ID Usage:**
    *   Checked `src/services/service-manager.ts` (`distributeService` function) and `src/lib/constants.ts`.
    *   Confirmed that `SYSTEM_CATEGORIES.SERVICE` in `src/lib/constants.ts` already correctly uses the ID `e0000000-0000-0000-0000-000000000088`. Therefore, no code changes were required in the service logic for this part.

**Next Steps for User:**
-   Ensure the `hotfix-phase-64-category.sql` has been successfully applied to the database.
-   Refresh the `/people` page to observe if the debt for voided transactions now updates correctly (since the SQL fix is in place).
-   Run the Distribute Service to confirm that new transactions correctly show the "Online Services" category icon.
