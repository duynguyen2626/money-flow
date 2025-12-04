MILESTONE 2 - SPRINT 3.2: AUTO-DISTRIBUTE FIXES, BULK ACTION & UI POLISH

Goal: Ensure Data Integrity for Auto-Distributed Transactions (Shop Image/ID), implement "Run All", and standardize Icon sizing across the app.

1. Git Convention

Branch: fix/M2-SP3.2-distribute-polish

Commit: [M2-SP3.2] fix: ...

PART A: DATA INTEGRITY FIX (Backend)

1. Fix Missing Shop ID in Auto-Distribute

File: src/services/service-manager.ts (Function: distributeServiceCost)

The Bug:
Transactions created by auto-distribution have shop_id: null. This breaks the Sheet Sync (missing Shop Name) and causes UI inconsistency (fallback to Category icon instead of Shop Logo).

The Fix:

Retrieve: Ensure shop_id is selected when fetching subscriptions.

Insert: Pass shop_id explicitly to TransactionService.createTransaction.

// Ensure payload includes:
{
  shop_id: subscription.shop_id, // <--- MUST BE PRESENT
  // ... other fields
}


PART B: UI POLISH (Frontend)

1. Standardize Transaction Icons

File: src/components/moneyflow/unified-transaction-table.tsx (or transaction-table.tsx)

The Bug:
Icons have inconsistent sizes. Some are Emojis (Category), some are Images (Shop/Account). Youtube icon is showing at wrong size/ratio compared to iCloud.

The Fix:

Locate the Avatar or Image component rendering the transaction icon/logo.

Enforce Strict Classes:

Container: w-8 h-8 (or w-10 h-10), flex items-center justify-center, overflow-hidden, rounded-full (or rounded-md).

Image: w-full h-full object-cover (or object-contain).

Emoji Fallback: text-lg (or specific size to match image visual weight).

Logic: Always try to render shop.logo_url first. If not, category.icon (Emoji).

PART C: NEW FEATURE - DISTRIBUTE ALL (Backend & Frontend)

1. Backend Action

File: src/actions/service-actions.ts
Task: Create runAllServiceDistributions().

Fetch active subscriptions.

Run distributeServiceCost for each in parallel (Promise.allSettled).

Return summary stats.

2. UI Button

File: src/app/services/page.tsx
Task: Add "⚡ Distribute All" button next to "Add Service".

Interaction: Confirm Dialog -> Call Action -> Toast Success.

4. Execution Plan

Step 1 (Backend): Fix service-manager.ts (Shop ID logic).

Step 2 (Frontend): Fix transaction-table.tsx (Strict Icon CSS).

Step 3 (Feature): Implement "Distribute All" (Action + UI).

Step 4 (Verify):

Delete old "Youtube" transaction.

Click "Distribute All".

Check: New transaction MUST have the Youtube Shop Logo (not generic Category icon) and it must be the same size as other icons.

👉 Acknowledge Sprint 3.2 and start with Step 1.