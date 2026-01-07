---
description: Sprint 5 (New): Debt Repayment Overhaul & UI Polish
---

# Sprint 5 Handover Status (2026-01-07)

> [!WARNING]
> **Current Blocker:** Không update được Receivable accounts (Auto-pick failed).
> Aggressive auto-pick logic was implemented but the build failed with a syntax error (`d })`) in generated routes, preventing verification of the latest changes in the UI.

## Progress Summary
- [x] Implement robust `debt_account_id` sync logic via `owner_id` matching.
- [x] Replace dropdown with read-only badge + "Change" button for auto-picked accounts.
- [ ] Investigate and fix Build Error: `routes.d.ts:115:3 d })` which appeared after UI changes.
- [ ] Finalize "Manual Link Required" fallback behavior verification.

Target Branch: sprint-5.1

Target Files:

src/components/moneyflow/transaction-form.tsx (Main UI).

src/components/moneyflow/repay-debt-section.tsx (New logic for Bulk mode).

src/lib/debt-allocation.ts (FIFO Algorithm).

src/actions/transaction-actions.ts.

1. Critical UI/UX Fixes (The "Must Haves")

A. Anti-Jumping Layout (Fixed Header)

Problem: Switching between Expense (many fields) and Repay (few fields) causes the Tab Bar to jump up/down.

Fix:

The DialogContent or form container must have a min-height (e.g., min-h-[500px]) to accommodate the tallest tab.

The Tab List (Income | Expense | Transfer | Repay) must be Sticky (sticky top-0 z-10 bg-background pt-2) so it never moves relative to the screen.

Remove Garbage: Scan for and remove any // comments that were accidentally rendered as text in the JSX.

B. Field Logic: "To Account" & Shop Sync

Trigger: When User selects an asset in "To Account" (e.g., VIB) AND type === 'repayment'.

Action:

Auto-Fill Shop: The "Shop" field must programmaticallly receive the id, name, and image_url of the selected Account.

Disable Interaction: The Shop field becomes readOnly or disabled visually, so the user knows it's locked to the account.

Visual: It must look like a Shop card (Logo + Name), NOT a generic input.

C. Bulk Repayment Toggle (The "Missing Feature")

State: Add isBulkRepay boolean state.

UI Behavior:

OFF (Default): Show "Tag" dropdown to select a single specific debt cycle.

ON: HIDE the "Tag" dropdown. SHOW a "Repayment Preview Card".

This card listens to amount and person_id.

It calls allocateDebtRepayment helper to calculate: "If I pay 500k, which months get settled?".

Display: A list of months (e.g., "Oct 2025: 50k (Done)", "Nov 2025: 450k (Partial)").

2. Logic & Database

A. Database Migration

File: supabase/migrations/20260107_relax_transaction_constraints.sql

Command: ALTER TABLE transactions ALTER COLUMN account_id DROP NOT NULL; (To support virtual debt adjustments).

B. Backend Action (repayBatchDebt)

Input: totalAmount, person_id, accountId (Money Source).

Logic:

Insert 1 Parent Transaction (Real money flow to Bank).

Use FIFO logic to find outstanding debt cycles.

Insert N Child Transactions (Virtual debt entries) linked to Parent.

3. Execution Prompt

@.agent/workflows/task.md @src/components/moneyflow/transaction-form.tsx

I am restarting Sprint 5.
1. **Migration:** Generate `supabase/migrations/20260107_relax_transaction_constraints.sql`.
2. **UI Layout:** Refactor `TransactionForm`.
   - Set `min-h-[550px]` on the content container.
   - Make Tabs `sticky top-0`.
   - **REMOVE** any text comments like `//` from the JSX.
3. **Repay Logic:**
   - Move "To Account" field up.
   - Implement the `useEffect` hook: If Repay mode & Account changes -> Update "Shop" to match Account (and disable it).
4. **Bulk Mode:**
   - If Toggle ON: Hide "Tag" select. Show `<RepaymentPreview amount={amount} personId={personId} />`.
   - Implement `src/lib/debt-allocation.ts` for the preview logic.
