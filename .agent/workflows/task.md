🚨 GRAVITY TASK: M1.1 - REFACTOR CORE ACCOUNT & CASHBACK LOGIC

Status: CRITICAL
Priority: P0 (Stop existing work, fix this first)
Context: The integration of Cashback Analysis has corrupted the Account Balance logic and introduced RLS blocking issues. The Data Layer is currently unreliable.

🎯 OBJECTIVES

Restructure the Database Logic and Service Layer to ensure Data Integrity for Accounts and Cashback Cycles.

🛠️ SPECIFIC TASKS

1. 🛡️ Fix Database Security & Integrity (RLS)

Problem: Failed to sync cashback... new row violates row-level security policy for table "cashback_cycles".

Action:

Audit and Fix RLS policies for cashback_cycles and cashback_entries.

Ensure the authenticated role can INSERT/UPDATE these tables when triggered by a transaction change.

Verification: Run a script to simulate a transaction insert and ensure cashback_cycles accepts the data.

2. 🧮 Fix Account Balance Logic (The "30M Limit" Bug)

Problem: Limit 30M, Spent ~2.9M, but Balance = 32.9M and Available = 62.9M.

Root Cause: The current logic is incorrectly adding Debt to Limit or treating Debt as positive Assets during aggregation.

Action:

Refactor: Update calculate_account_balance (SQL or TS Service) to strictly follow the formulas in .agent/context/domain_logic.md.

Display: Ensure account-card.tsx uses the correct Available formula.

3. 🔄 Refactor Cashback Trigger Logic (The "Cycle" Bug)

Problem: Cashback is pulling wrong tags (DEC25 for debt vs Cashback Cycle), and Edits don't trigger updates.

Action:

Unify Cycle Logic: Implement the "Cashback Cycle Determination" logic from .agent/context/domain_logic.md.

Triggers: Ensure INSERT, UPDATE, and DELETE on transactions table correctly trigger the cashback recalculation.

Metadata: Ensure year is handled to prevent Year-over-Year collision.

4. 🧹 Data Cleanup Script

Create a script (scripts/hotfix-m1-integrity.ts) to:

Recalculate current_balance for all accounts based on actual transaction history using the corrected formulas.

Wipe invalid cashback_cycles / cashback_entries.

Re-sync Cashback history from transactions table.

🧪 VERIFICATION (Definition of Done)

Balance Check: Account with 30M Limit and 2.9M Debt MUST show:

Balance: -2.9M (or 2.9M Debt)

Available: ~27.1M

Sync Check: Creating/Editing a Transaction (via UI or SQL) MUST update cashback_cycles.

No Console Errors: No RLS 42501 errors in logs.

Instruction for Agent: 1. Read @domain_logic.md carefully.
2. Fix RLS policies in supabase/migrations.
3. Fix Balance calculation in src/services/account.service.ts or DB functions.
4. Fix Cashback triggers in src/services/cashback.service.ts or DB triggers.
5. Run cleanup script.