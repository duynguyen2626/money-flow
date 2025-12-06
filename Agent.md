AGENT TASK: PHASE 70.5 - REFUND UI POLISH & CONFIRM ACTION

Context:

Note Format Bug: Refund transactions lack the ID badge reference (e.g., [A1B2]).

Missing Action: The "Confirm Refund" button does not appear for Pending transactions (GD2).

Logic Bug: Full Refund logic fails to UNLINK the person from the original transaction.

Constants:

PENDING_REFUNDS_ID: '99999999-9999-9999-9999-999999999999'

I. BACKEND: FORMAT NOTE & UNLINK LOGIC (src/services/transaction.service.ts)

Target: requestRefund function.

Logic Update:

Extract Short ID: const shortId = originalTxn.id.substring(0, 4).toUpperCase();

Format Note (GD2):

Format: [${shortId}] Refund Request: ${originalTxn.note}

Unlink Logic (Crucial):

IF isFullRefund AND originalTxn.person_id:

Fetch Person Name.

Update GD1 (Original):

person_id: NULL (Remove debt).

note: ${originalTxn.note} [Cancelled Debt: ${PersonName}].

status: 'waiting_refund'.

II. FRONTEND: ENABLE CONFIRM ACTION (src/components/moneyflow/unified-transaction-table.tsx)

1. Add "Confirm Refund" to Menu

Condition: Show this menu item ONLY if:

row.status === 'pending'

OR row.account_id === PENDING_REFUNDS_ID

Icon: CheckCircle (Green).

Label: "Confirm Money Received".

Action: Open ConfirmRefundDialog (reuse Refund mode or dedicated dialog).

2. Update TransactionForm for Confirm

If opening for "Confirm":

mode: 'confirm_refund'.

from_account: PENDING_REFUNDS_ID (Fixed).

to_account: Selectable (Real Bank).

amount: Fixed (from pending txn).

note: [${shortId}] Refund Received.

III. EXECUTION STEPS

Service: Fix requestRefund (Add Unlink logic & Note formatting).

UI: Add "Confirm Refund" item to the Action Menu for pending rows.

Form: Handle confirm_refund mode to auto-fill Source=System, Target=Selectable.

Test:

Cancel Debt Order -> Original Note should change, Person removed.

See Pending Row -> Click Confirm -> Select Bank -> Money in Bank.
