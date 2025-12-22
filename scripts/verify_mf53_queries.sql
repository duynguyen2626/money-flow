-- 1. Check Cashback Entries Metadata (New Column)
-- Should show policySource, categoryId, rates, limits
SELECT created_at,
    transaction_id,
    amount,
    mode,
    metadata
FROM cashback_entries
ORDER BY created_at DESC
LIMIT 5;
-- 2. Check Cashback Cycles Spent Amount
-- Ensure spent_amount includes eligible expenses
SELECT id,
    cycle_tag,
    spent_amount,
    real_awarded,
    virtual_profit,
    max_budget,
    min_spend_target
FROM cashback_cycles
ORDER BY updated_at DESC
LIMIT 5;
-- 3. Verify Cycle Totals Calculation (Manual Check)
-- Sum of expenses for a specific cycle
-- Replace 'ACCOUNT_ID' and 'CYCLE_TAG' with actual values
/*
 SELECT SUM(ABS(amount)) as calculated_spent
 FROM transactions
 WHERE account_id = 'ACCOUNT_ID'
 AND persisted_cycle_tag = 'CYCLE_TAG'
 AND type = 'expense'
 AND status != 'void';
 */