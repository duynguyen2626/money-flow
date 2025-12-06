AGENT TASK: PHASE 68 - FIX SINGLE LEDGER LOGIC & REFUND WORKFLOW

Context:

Critical Bug: "Refund flow is disabled in single-table mode" error prevents refunds.

Data Mapping: Debt Transactions show "-> Unknown". Cashback Share values are not saving.

Logic Update: Full Refund (100%) for a Debt transaction should UNLINK the person from the original transaction.

UI Bugs: Header overlaps Modal. Badges alignment. Notes column too wide.

Objective:

Enable Refund Logic for Single Table.

Implement "Unlink Person" on Full Refund.

Fix UI mapping and styling.

I. BACKEND: src/services/transaction.service.ts

1. Fix requestRefund (The "Unlink" & "Smart Note" Logic)

Remove Error Throw: Delete Refund flow is disabled....

Logic Update:

If Full Refund (Amount == Original):

Fetch Original Txn.

If original.person_id exists:

Get Person Name.

Update Original:

person_id = NULL (Remove debt relationship).

note = original.note + " [Cancelled Debt: " + Name + "]".

status = 'waiting_refund' (if pending) or 'refunded' (if instant).

Create Refund Txn (GD2/GD3):

Note Format: Refund for [${original.id.substring(0, 4).toUpperCase()}].

If Debt involved: ... with ${PersonName}.

2. Fix getUnifiedTransactions (The "Unknown" Fix)

Transfer Logic:

If target_account_id exists -> Dest = TargetAccount.name.

Else If person_id exists (Lending) -> Dest = Person.name (Fixes "Unknown").

Else -> Do not show arrow "->". Just show Source Account.

3. Fix Save Logic (create/updateTransaction)

Ensure cashback_share_percent and cashback_share_fixed are included in the insert/update payload.

II. FRONTEND: UnifiedTransactionTable & UI

1. Fix "Refund flow disabled" Error

Locate the error check in the Table component (around line 464) and REMOVE IT. Connect it to the Service.

2. Fix UI Issues

Z-Index: Update AccountDetailHeader to z-30. Ensure Modal is z-50.

Alignment:

Cycle/Tag Badges: Use flex flex-row gap-1 (not flex-col) to keep them on one line.

Notes Column: Add max-w-[250px] truncate to prevent excessive whitespace.

ID Display:

Ensure ID is visible (or copyable icon) to match the Note format [ID].

3. Restore Cashback Info

In the Amount Cell, check cashback_share_percent.

If > 0, render a small row below amount: 🎁 ${percent}% or fixed amount.

III. EXECUTION STEPS

Service: Update requestRefund (Unlink logic & Note format) and createTransaction (Cashback fields).

Service: Fix "Unknown" destination mapping.

Frontend: Remove the Refund Error Block.

Frontend: Fix CSS (Z-Index, Spacing, Badges Row).

Build: Verify.