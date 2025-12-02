PROJECT: MONEY FLOW 3.0

PHASE: 60 - AUTOMATION DASHBOARD & ADVANCED BATCH FUNDING

WORKFLOW:

Branch: feat/phase-60-automation-batch

Safety: Run npm run build.

OBJECTIVE:

Automation UI: Build /automation page to manage Bot Configs (Toggle, Edit JSON). Move "Manual Run" here.

Subscription Logic: Update logic to check profiles.is_owner (Me) -> Create Expense line instead of Debt line.

Batch Logic: Implement "Draft Funding" -> "Confirm Source" workflow.

I. FEATURE: AUTOMATION CENTER (src/app/automation/page.tsx)

1. Service: src/services/bot-config.service.ts

getBots(), toggleBot(key), updateBotConfig(key, json).

runBotManual(key): Calls the respective service logic (Subscription or Batch).

2. UI: Bot Card

Name, Description, Status Badge.

Switch: Enable/Disable.

Button: "⚙️ Config" (Edit JSON fields).

Button: "▶️ Run Now" (Manual Trigger).

II. LOGIC: SUBSCRIPTION BOT UPGRADE

Target: src/services/subscription.service.ts -> processSubscription

Logic Change:

Fetch bot_configs to get default_category_id.

Member Loop:

Check member.profile.is_owner.

IF TRUE (Me): Create Debit Line with category_id (Expense). Note: Do not create Debt Line.

IF FALSE (Others): Create Debit Line with account_id (Debt Account).

III. LOGIC: BATCH FUNDING WORKFLOW (src/services/batch.service.ts)

Constants:

DRAFT_FUND_ID = '88888888-9999-9999-9999-111111111111'

CLEARING_ID = '88888888-9999-9999-9999-888888888888'

1. Create Batch:

Default source_account_id = DRAFT_FUND_ID.

2. Fund Batch (fundBatch):

Action: Create Transaction.

From: batch.source_account_id (Draft or Real).

To: CLEARING_ID.

Amount: batch.total_amount (or delta if funding more).

3. Confirm Source (confirmBatchSource):

Input: batchId, realAccountId.

Logic:

Calculate TotalFundedSoFar (from transaction_lines of Draft Account linked to this batch tag?). Simpler: Just take batch.total_amount (assuming fully funded).

Create Transfer:

From: realAccountId (VCB).

To: DRAFT_FUND_ID.

Amount: batch.total_amount.

Update Batch: Set source_account_id = realAccountId. (Future funds will go directly from Real -> Clearing).

4. UI Update (BatchDetail):

If source_account_id == DRAFT_FUND_ID AND status == 'funded':

Show Button: "🏦 Confirm Source (Chọn nguồn tiền)".

Click -> Select Account Modal -> Call confirmBatchSource.

IV. EXECUTION STEPS

Service: Create bot-config service.

Page: Build /automation.

Logic: Update Subscription Bot to use is_owner and config.

Logic: Update Batch Service with Draft/Real funding flow.

Icons: Update Sidebar Service Icon to Settings (or keep Cloud for Services page, use Settings/Bot for Automation).