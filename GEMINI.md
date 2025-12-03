AGENT TASK: FIX SERVICE CATEGORY & DEBT VOID LOGIC

Context:

Bug 1: Auto-distributed transactions show "Uncategorized" because the Service logic might be using a wrong Category ID or missing the join.

Bug 2: Voiding a transaction does NOT reduce the Debt on the People Page. (Fixed via SQL get_debt_by_tags, but need to verify frontend reactivity).

Objective:

Update subscription.service.ts (or service-manager.ts) to use the correct Fixed Category ID for "Online Services".

Verify Frontend refresh logic.

I. BACKEND FIX (src/services/service-manager.ts / subscription.service.ts)

Target: distributeService function.

Action:

Locate where category_id is assigned for the Owner's expense line.

Hardcode/Constant: Ensure it uses e0000000-0000-0000-0000-000000000088 (Online Services).

Check: If using SYSTEM_CATEGORIES constant, update the constant file to match this ID.

II. FRONTEND REFRESH (src/app/people/page.tsx)

Action:

The Debt List relies on getDebtByTags.

Since we updated the SQL function get_debt_by_tags, the data will be correct on refresh.

Enhancement: Ensure that when a transaction is Voided in /transactions, we invalidate the cache or trigger a refresh if we are navigating back to People page. (Next.js revalidatePath or router.refresh()).

III. EXECUTION STEPS

Constants: Verify src/lib/constants.ts has ONLINE_SERVICES: 'e000...88'.

Service: Update the distribute logic to use this constant.

Verify: Run build.