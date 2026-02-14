-- Migration: Implement Trigger-based Account Balance Calculation
-- Date: 2026-02-14

-- 1. Create function to calculate balance for a single account
CREATE OR REPLACE FUNCTION calculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_account_type TEXT;
    v_total_out NUMERIC := 0;
    v_total_in NUMERIC := 0;
    v_balance NUMERIC := 0;
BEGIN
    -- Get account type
    SELECT type INTO v_account_type FROM accounts WHERE id = p_account_id;
    
    -- If account not found (deleted), return 0
    IF v_account_type IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate Total Outgoing (Money leaving the account: expense, transfer, debt_loan)
    -- We exclude 'income' and 'debt_repayment' even if they are linked to account_id as source (conceptually main account)
    -- Actually, looking at JS logic:
    -- isIncomingType = 'income' || 'repayment'.
    -- If account_id is source:
    --   If incoming type => Add to Total In
    --   Else => Add to Total Out
    
    SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO v_total_out
    FROM transactions
    WHERE account_id = p_account_id
      AND type NOT IN ('income', 'debt_repayment')
      AND status != 'void';

    -- Calculate Total Incoming (Money matching account_id as source but is income type)
    SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO v_total_in
    FROM transactions
    WHERE account_id = p_account_id
      AND type IN ('income', 'debt_repayment')
      AND status != 'void';
      
    -- Calculate Total Incoming from Transfers (Target is this account)
    -- Assuming target_account_id implies money moving INTO this account
    DECLARE
        v_transfer_in NUMERIC := 0;
    BEGIN
        SELECT COALESCE(SUM(ABS(amount)), 0)
        INTO v_transfer_in
        FROM transactions
        WHERE target_account_id = p_account_id
          AND status != 'void';
          
        v_total_in := v_total_in + v_transfer_in;
    END;

    -- Update Balance based on Type
    IF v_account_type = 'credit_card' THEN
        -- Credit Card: Balance is DEBT (Positive). 
        -- Spending (Out) INCREASES Debt.
        -- Repayment/Income (In) DECREASES Debt.
        v_balance := v_total_out - v_total_in;
    ELSE
        -- Asset Accounts (Bank, Wallet, etc.): Balance is ASSET (Positive).
        -- Income (In) INCREASES Asset.
        -- Spending (Out) DECREASES Asset.
        v_balance := v_total_in - v_total_out;
    END IF;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 2. Create Trigger Function to update balance on transaction changes
CREATE OR REPLACE FUNCTION update_account_balance_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    -- Update Source Account for INSERT/UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.account_id IS NOT NULL THEN
            UPDATE accounts 
            SET current_balance = calculate_account_balance(NEW.account_id)
            WHERE id = NEW.account_id;
        END IF;
        
        IF NEW.target_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET current_balance = calculate_account_balance(NEW.target_account_id)
            WHERE id = NEW.target_account_id;
        END IF;
    END IF;

    -- Update Source Account for DELETE or OLD values in UPDATE
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        -- If account_id changed, update the old one too
        IF (TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id) OR TG_OP = 'DELETE' THEN
            IF OLD.account_id IS NOT NULL THEN
                UPDATE accounts 
                SET current_balance = calculate_account_balance(OLD.account_id)
                WHERE id = OLD.account_id;
            END IF;
        END IF;

        -- If target_account_id changed, update the old one too
        IF (TG_OP = 'UPDATE' AND OLD.target_account_id IS DISTINCT FROM NEW.target_account_id) OR TG_OP = 'DELETE' THEN
            IF OLD.target_account_id IS NOT NULL THEN
                UPDATE accounts 
                SET current_balance = calculate_account_balance(OLD.target_account_id)
                WHERE id = OLD.target_account_id;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trg_update_account_balance ON transactions;

CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_trigger_func();

-- 4. Initial Recalculation (Batch update to avoid timeouts)
-- We use a DO block to iterate and update.
DO $$
DECLARE
    acc RECORD;
BEGIN
    FOR acc IN SELECT id FROM accounts LOOP
        UPDATE accounts 
        SET current_balance = calculate_account_balance(acc.id)
        WHERE id = acc.id;
    END LOOP;
END $$;
