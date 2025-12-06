AGENT TASK: PHASE 70.5 - REFUND UI POLISH & CONFIRM ACTION

Context:

Note Format Bug: Refund transactions lack the ID badge reference (e.g., [A1B2]).

Missing Action: The "Confirm Refund" button does not appear for Pending transactions (GD2).

Goal: Complete the 3-Step Refund Workflow on the UI.

Constants:

PENDING_REFUNDS_ID: '99999999-9999-9999-9999-999999999999'

I. BACKEND: FORMAT NOTE (src/services/transaction.service.ts)

Target: requestRefund function.

Logic Update:

Extract Short ID: const shortId = originalTxn.id.substring(0, 4).toUpperCase();

Format Note (GD2):

Format: [${shortId}] Refund Request: ${originalTxn.note}

Format Note (GD3 - Confirm):

Format: [${shortId}] Refund Received

II. FRONTEND: ENABLE CONFIRM ACTION (src/components/moneyflow/unified-transaction-table.tsx)

1. Add "Confirm Refund" to Menu

Condition: Show this menu item ONLY if:

row.status === 'pending'

OR row.account_id === PENDING_REFUNDS_ID

Icon: CheckCircle (Green).

Label: "Confirm Money Received".

2. Build ConfirmRefundDialog

Trigger: Clicking the menu item opens this dialog.

UI:

Title: "Xác nhận tiền về (Confirm Refund)".

Text: "Khoản tiền [Amount] đã về tài khoản nào?"

Input: Select Account (Filter: Real Banks/Cash only).

Action: Call transactionService.confirmRefund(pendingTxnId, targetAccountId).

III. EXECUTION STEPS

Service: Update requestRefund to include the [ID] badge in notes.

Component: Create ConfirmRefundDialog (Simple selection).

Table: Add the "Confirm" action to the dropdown menu.

Verify:

Cancel an order -> Check Note format.

See Pending row -> Click Confirm -> Select VCB -> Check Result.