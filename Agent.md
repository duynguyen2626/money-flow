AGENT TASK: REFUND LOGIC HARDENING & HISTORY TRACKING

Context:

Refund Bugs: Notes lack [ID] badges. "Confirm Refund" menu item is missing for Pending items.

Logic Flaws: Full Refund doesn't unlink Person correctly. Voiding allows deleting intermediate transactions out of order.

Audit: User needs to track Edits (History).

Objective:

Fix requestRefund (Note Format & Unlink).

Fix voidTransaction (Constraint Chain).

Implement logHistory on Edit/Void.

Fix UnifiedTransactionTable (Menu Actions & Void Tab).

I. BACKEND: LOGIC HARDENING (src/services/transaction.service.ts)

1. Upgrade requestRefund

Note Format:

Get Short ID of Original: original.id.split('-')[0].toUpperCase().

Format: Refund Request [${ShortID}].

If Debt: Append  - Cancel Debt: ${PersonName}.

Unlink Logic (Full Refund):

Verify person_id is explicitly set to null in the update payload.

Crucial: Also clear tag if it was a Debt Tag, or keep it for reference? -> Keep Tag for history context, but clear Person.

2. Upgrade voidTransaction (The Guard)

Check Children:

Before voiding txn, query if ANY other transaction has linked_transaction_id == txn.id AND status != 'void'.

If found: Throw Error: "Không thể hủy! Tồn tại giao dịch liên quan (VD: Đã xác nhận hoàn tiền). Hãy hủy giao dịch đó trước."

3. Implement logHistory & Update updateTransaction

Before Update:

Insert into transaction_history:

transaction_id: id

snapshot_before: current data from DB.

change_type: 'edit'

Hook: Call this inside updateTransaction and voidTransaction.

II. FRONTEND: UI POLISH

1. Fix "Confirm Refund" Visibility

Target: UnifiedTransactionTable -> Action Menu.

Condition:

Show "Confirm Refund" IF:

status === 'pending' (Yellow Badge)

AND (account.type === 'system' OR account_id === PENDING_REFUNDS_ID).

Current bug: Likely checking for expense type only. Pending Refund is income.

2. Fix Void Tab

Target: getUnifiedTransactions or Page Filter.

Logic: Ensure that when "Void" tab is selected, the API fetches status = 'void'.

Visual: In Void Tab, show rows normally (no opacity). In All Tab, show Void rows with opacity (or hide them based on user pref).

III. EXECUTION STEPS

Service: Implement History Logging.

Service: Harden Refund/Void logic.

UI: Update Menu Conditions.

Build: Verify.