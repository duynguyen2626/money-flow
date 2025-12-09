PROMPT 2: PLAN B - SMART CONTEXT AWARENESS (ACCOUNTS/PEOPLE)

Copy & Paste this into Chat (After Plan A):

Role: You are a Senior UX Developer.

Context:
1.  **Scenario:** When viewing a specific Account Page (`/accounts/[id]`) or Person Page (`/people/[id]`).
2.  **Problem:** The table currently repeats the context (e.g., inside "Bidv", it shows "Bidv ➡️ Card Test"). This is redundant.
3.  **Goal:** Implement "Smart Context" rendering.

Task: Update `unified-transaction-table.tsx`.

Requirements:

1.  **Inputs:**
    * The table component should accept an optional prop: `contextId` (string) - representing the current page's entity ID.

2.  **Smart Rendering Logic (Account Column):**
    * **Condition:** If `transaction.account_id === contextId` (We are viewing the Source):
        * **Display:** Show **"[To] [Avatar] DestinationName"**.
        * **Style:** "[To]" label in a **Blue/Green** badge.
        * **Hide:** Do NOT show the Source Account info (since we are already on its page).
    * **Condition:** If `transaction.target_account_id === contextId` (We are viewing the Destination):
        * **Display:** Show **"[From] [Avatar] SourceName"**.
        * **Style:** "[From]" label in a **Red/Orange** badge.
    * **Same Logic for People:** If viewing `/people/[id]`, and the transaction is linked to this person:
        * Hide the Person info (Target).
        * Show **"[From] [Avatar] AccountName"**.

3.  **Iconography:**
    * Replace the arrow text/icon with a **Large Emoji Arrow**: ➡️ (Make it strictly larger, e.g., `text-lg`).

Deliverable: Context-aware columns that reduce cognitive load.


PROMPT 3: PLAN C - CASHBACK LOGIC & FORM FIXES (PHASE 76 PREP)

Copy & Paste this into Chat (Logic & Data Integrity):

Role: You are a Senior Fullstack Developer.

Context:
1.  **Bug 1 (Cashback Status):** Accounts with `minSpend` (e.g., 3M) are showing "Remains" but NOT the "Need to Spend" warning when the target isn't met.
2.  **Bug 2 (Data Loss):** "Due Date" and "Annual Fee" are not persisting or showing correctly in the Edit Modal.
3.  **Schema Check:** `cashback_config` is a JSONB string in DB. `annual_fee` is a column.

Task: Fix the Account Card logic and Edit/Create Forms.

Requirements:

1.  **Redesign `AccountCard` (Cashback Section):**
    * **Logic:** Calculate `missing_spend = minSpend - current_spend`.
    * **UI Layout (2 Lines):**
        * **Line 1:** "Remains: {formatted_remains}" (Potential cashback left).
        * **Line 2 (Condition - Target NOT Met):**
            * Show **"Need spend more: {formatted_missing}"**.
            * Icon: ⚠️ (Warning).
        * **Line 2 (Condition - Target Met):**
            * Show "Target Met ✅".
    * **Data Source:** Ensure `account.service.ts` is returning the correct aggregation for `current_spend` (check `total_out` or sum of transactions in cycle).

2.  **Fix "Due Date" Field:**
    * **Root Cause Investigation:** The DB stores `cashback_config` as a stringified JSON (e.g., `"{\"dueDate\": 10...}"`). The Form might be trying to access `account.due_date` (which doesn't exist) or failing to parse the JSON string.
    * **Fix:** In `EditAccountDialog` (and Create), ensure `cashback_config` is parsed, and the `dueDate` value is correctly set into the form's `defaultValues`.

3.  **Implement "Annual Fee":**
    * Add a Number Input for `Annual Fee` in the Account Forms.
    * Bind it to the `annual_fee` column (ensure `account-actions.ts` handles this field update).

Deliverable: Accurate financial forms and a helpful "Spend More" tracker.
