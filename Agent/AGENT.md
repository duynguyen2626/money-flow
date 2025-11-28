PROJECT: MONEY FLOW 3.0

PHASE: 35 - UI REDESIGN & LOGIC FIXES (FINAL POLISH)

WORKFLOW:

Branch: fix/phase-35-ui-logic-polish

Safety: Run npm run build before finishing.

I. DATABASE TASKS (CLI)

Instruction: Execute this SQL via CLI or Supabase Editor to clean up.

-- Drop the test table created in Phase 34
DROP TABLE IF EXISTS "public"."cli_test";


II. UI REDESIGN: ACCOUNT CARD (src/components/moneyflow/account-card.tsx)

Objective: Clean, English UI, optimized for vertical images, smart Confirm badge.

1. Avatar / Logo:

Size: Increase size significantly. Use aspect-[3/4] or h-full within the header area to show the full vertical card image if available.

Style: object-contain or object-cover without heavy borders.

2. Smart Confirm Badge (Replace Big Button):

Condition: If pendingConfirmAmount > 0.

Placement: Row 2 (Info Row), BEFORE the "X days left" badge.

Design:

Content: ☑️ {formatCurrency(pendingConfirmAmount)} (Icon + Number only).

Style: text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded cursor-pointer hover:bg-emerald-100.

Action: Click -> Trigger Confirm Logic (Same as before).

3. Credit Card Logic (Fix Math):

Current Bug: Available shows > Limit (e.g., 150M + 182k = 150.1M).

Correct Logic:

Current Balance in DB is usually negative for spending (e.g., -182,000).

Available = Credit Limit + Current Balance.

Example: 150,000,000 + (-182,000) = 149,818,000.

Display:

Balance: Show Current Balance (Red if negative). Label: "Debt".

Available: Show Calculated Amount. Label: "Available".

4. Language:

Ensure all labels are English ("Debt", "Available", "Due in", "Cashback").

III. BUG FIXES

1. Fix CreateAccountDialog Error

Error: Error creating account: {}.

Cause: parent_account_id or secured_by_account_id is likely sent as an empty string "" which violates UUID type.

Fix: In onSubmit, convert empty strings to null before calling service.

const payload = {
  ...data,
  parent_account_id: data.parent_account_id || null,
  secured_by_account_id: data.secured_by_account_id || null
};


2. Fix Batch Import Not Saving

Context: BatchImportDialog creates items but they don't appear.

Fix: Ensure batch.service.ts -> importBatchItems function correctly maps the input array to the batch_items table columns (receiver_name, bank_number, etc.).

Note: The CORS error in logs (visualstudio) is unrelated telemetry.

3. Fix Cycle Column Overflow

Target: UnifiedTransactionTable.

Fix: Add max-w-[100px] truncate or whitespace-nowrap properly to the Cycle/Tag column. Add a Tooltip for the full text.

IV. EXECUTION STEPS

Frontend: Rewrite AccountCard UI (Avatar, Badge, Math).

Frontend: Fix CreateAccountDialog payload sanitization.

Backend: Verify importBatchItems logic.

Cleanup: Run the SQL Drop.