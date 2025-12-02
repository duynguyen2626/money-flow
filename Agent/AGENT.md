AGENT TASK: FIX BOT MANUAL RUN & PREVIEW UI

Context:

Error: "Manual run not implemented". The backend handler is missing.

UX: User wants to see exactly what the bot will do before it runs (Preview Mode).

Confusion: "Auto Renew" bot card is confusing -> Hide it for now.

Objective:

Implement previewSubscriptionRun (Backend) to list due services.

Implement runBotManual (Backend) to execute the creation.

Connect UI: Click Run -> Show Preview Modal -> Confirm -> Success.

I. BACKEND LOGIC (src/services/subscription.service.ts)

1. Implement previewSubscriptionRun()

Logic:

Fetch subscriptions where next_billing_date <= NOW AND is_active = true.

Calculations: For each sub, calculate UnitCost and MembersDebt.

Return:

{
  dueCount: number,
  totalAmount: number,
  items: [
    { id, name: "Youtube", price: 166000, nextDate: "2025-12-01", membersCount: 3 }
  ]
}


2. Implement processSubscriptions(force: boolean)

Logic:

Fetch due subscriptions.

Loop & Create Transactions:

Use transaction.service.createTransaction.

Important: Use shop_id, category_id (from Config or Default '88...88'), and generate Notes with Slot info.

Update Date: Set next_billing_date = Next Month.

Log: Update bot_configs -> last_run_at, last_run_status.

II. BACKEND WIREING (src/services/bot-config.service.ts)

Update runBotManual(key):

Switch key:

Case 'subscription_bot': Call subscriptionService.processSubscriptions(true).

Default: Throw error.

III. UI: RUN PREVIEW DIALOG (src/components/automation/run-bot-dialog.tsx)

Flow:

Trigger: User clicks "Run Now" on the Card.

State 1 (Loading): Call API /api/automation/preview?key=subscription_bot.

State 2 (Preview):

If Empty: Show "✅ No services due today."

If Data:

Show Table: Service Name | Price | Members.

Button: "🚀 Execute (Tạo [x] Giao dịch)".

State 3 (Executing): Call API /api/automation/run. Show Toast on success.

IV. EXECUTION STEPS

Service: Implement previewSubscriptionRun & processSubscriptions.

API: Ensure /api/automation/preview and /api/automation/run endpoints call the service.

UI: Finish the RunBotDialog to display the preview data.

Cleanup: Hide the Batch Clone bot from the UI list if it's confusing.