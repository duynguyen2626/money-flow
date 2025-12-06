AGENT TASK: PHASE 70.6 - REFUND SAFETY GUARD & UI FIXES

Context:

Critical Logic Gap: User can Void a Pending Refund (GD2) even if a Completed Refund (GD3) exists. This leaves orphan records.

UI Bug: "Account" column shows "Card Test ➡️ Unknown" for single-sided transactions.

UI UX: Copy Icon is hard to click (hover-only) and overlaps with text.

Objective:

Backend: Implement Strict Checks in voidTransaction.

Backend: Fix Account Name mapping in getUnifiedTransactions.

Frontend: Make Copy Icon permanent and fix spacing.

I. BACKEND: REFUND SAFETY (src/services/transaction.service.ts)

Target: voidTransaction(id)

Logic Update:

Fetch the transaction.

Constraint Check (The Guard):

Query: Check if ANY transaction has linked_transaction_id == id AND status != 'void'.

Condition: If found -> THROW ERROR:

"Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước."

Rollback Logic (Existing): Keep the logic that reverts the Parent's status (e.g. Void GD3 -> Set GD2 to 'pending').

II. BACKEND: FIX "UNKNOWN" DISPLAY (src/services/transaction.service.ts)

Target: getUnifiedTransactions

Logic Update:

Current: Likely setting dest_name = 'Unknown' default if type is transfer-like.

Fix:

If target_account_id is NULL AND person_id is NULL:

dest_name = undefined (Do not return "Unknown").

display_type = 'expense' (or income), NOT 'transfer'.

Result: UI should render [Logo] Card Test (No arrow).

III. FRONTEND: UI POLISH (UnifiedTransactionTable)

1. Fix Copy Icon

Action: Remove group-hover:opacity-100 and opacity-0.

Style: flex-shrink-0 ml-2 text-slate-400 hover:text-slate-600 cursor-pointer.

Layout: Ensure parent container is flex items-center justify-between. Text container gets truncate. Icon stays visible on the right.

2. Fix Account Column

Action: Update logic to ONLY show Arrow ➡️ if destination_name is valid.

IV. EXECUTION STEPS

Service: Add the Child-Check query to voidTransaction.

Service: Clean up the "Unknown" fallback logic.

UI: Update CSS for Copy Icon.

Build: Verify.