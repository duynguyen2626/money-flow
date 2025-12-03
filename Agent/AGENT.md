MILESTONE 2 - SPRINT 2: REAL MONEY AUTOMATION & BOT

Goal: Implement the "Confirm" workflow to turn Draft allocations into Real Transactions, and build the Service Automation Bot UI.

1. Git Convention

Branch: feat/M2-SP2-batch-confirm-and-bot

Commit: [M2-SP2] feat: ...

2. Feature 1: Batch Confirmation & Revert Logic

Context:
Currently, Batch Items are just "Draft" allocations. We need a "Confirm" button to materialize them into REAL transactions in the transactions table. Conversely, voiding that transaction must "Revert" the batch item status so it can be re-processed.

A. Backend Logic (Batch Service)

File: src/services/batch.service.ts

Task 1: confirmBatchItem(itemId, targetAccountId)

Input: itemId (UUID), targetAccountId (UUID - The Real Bank Account receiving money).

Process:

Fetch Batch Item. Verify status is funded (which means Pending in our UI terms).

Create Transaction:

from_account_id: '88888888-9999-9999-9999-111111111111' (Fixed ID for "Draft Fund").

to_account_id: targetAccountId.

amount: item.amount.

type: 'transfer' (Internal movement).

category_id: Use the Service's Category ID (if available) or leave null for transfers.

description: CKL: ${item.note} (CKL = Chu Kỳ Lương/Cycle).

transaction_date: new Date().

Update Batch Item:

status: 'confirmed'.

transaction_id: The ID of the newly created transaction.

Task 2: revertBatchItem(transactionId)

Process:

Find the batch_item linked to this transactionId.

Update batch_item:

status: 'funded' (Reset to Pending).

transaction_id: null (Unlink).

B. Backend Logic (Transaction Service)

File: src/services/transaction.service.ts

Task: Hook into voidTransaction or updateTransactionStatus.

Logic:

// Inside voidTransaction function
// ... existing void logic ...

// [M2-SP2] Trigger Batch Revert if applicable
const { data: batchItem } = await supabase
    .from('batch_items')
    .select('id')
    .eq('transaction_id', transactionId)
    .single();

if (batchItem) {
    // Call the revert function from BatchService (you might need to inject dependencies or use a shared helper to avoid circular imports)
    // Ideally, emit an event or call a dedicated handler.
    await BatchService.revertBatchItem(transactionId); 
}


C. UI Update (Batch Detail Page)

File: src/app/batch/[id]/page.tsx & src/components/batch/items-table.tsx

Column "Account":

Old: Shows only "Draft Fund".

New Requirement:

If status === 'confirmed': Show Draft Fund ➔ [Target Account Name]. Use a visual arrow icon (e.g., Lucide ArrowRight).

If status === 'funded': Show Draft Fund ➔ [Greyed out Placeholder].

Action "Confirm":

Add a Green "Confirm" Button for items with status funded.

Behavior: Clicking "Confirm" opens a Modal/Dialog:

Title: "Confirm Transfer to Real Account".

Dropdown: Select "Target Account" (Load list from accounts table).

Auto-select: If the batch item already has a target_account_id set (from Bot config), pre-select it.

On Save: Call confirmBatchItem action. Update UI state to "Confirmed" (Disable button or change to "View Txn").

3. Feature 2: Service Bot Automation Settings

Context:
Each Service (e.g., Netflix, Spotify) needs a "Settings" tab to configure auto-distribution rules.

File: src/app/services/[id]/page.tsx (or new component ServiceSettingsTab)

UI Requirements:

Tab Layout: Add a new tab named "Settings & Bot".

Card 1: Automation Config

Toggle Switch: "Auto Run Monthly".

Input Number: "Run Day" (1-31).

Input Text: "Note Template" (e.g., "Tiền {Service} T{Month}").

Note: Save these configs to the bot_configs table (linked to service_id).

Card 2: Manual Trigger (Testing)

Button: "⚡ Run Distribution Now".

Behavior: Trigger the existing distribution logic immediately (Manual Mode).

Logic Constraint: If re-running, DO NOT overwrite items that are already confirmed. Only update amount for funded (pending) items if the Service price changed.

4. Execution Plan (Step-by-Step for Agent)

Step 1: Implement confirmBatchItem and revertBatchItem in batch.service.ts.

Step 2: Hook voidTransaction in transaction.service.ts to call revertBatchItem.

Step 3: Update Batch Items Table UI (Columns & Confirm Button + Dialog).

Step 4: Build Service Settings Tab with Auto/Manual controls.

Step 5: Verification: Run npm run build to ensure no circular dependency errors between Services.

👉 Acknowledge this plan and start with Step 1.