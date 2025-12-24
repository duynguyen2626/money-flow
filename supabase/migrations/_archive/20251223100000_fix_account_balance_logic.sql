-- Migration: 20251223100000_fix_account_balance_logic.sql
-- Description: Align account balance trigger with domain logic (credit card debt vs available).

CREATE OR REPLACE FUNCTION fix_account_card_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'credit_card' THEN
        -- Credit cards store current_balance as debt owed (positive).
        NEW.current_balance := COALESCE(ABS(NEW.total_out), 0) - COALESCE(NEW.total_in, 0);
    ELSE
        -- Non-credit accounts use net flow.
        NEW.current_balance := COALESCE(NEW.total_in, 0) + COALESCE(NEW.total_out, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
