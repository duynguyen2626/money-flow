-- 1. Create the correct calculation function (Fixed: Removed initial_balance)
CREATE OR REPLACE FUNCTION fix_account_card_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'credit_card' THEN
         -- Credit Cards: Available = Limit + In (payments) + Out (spending is negative)
        NEW.current_balance := COALESCE(NEW.credit_limit, 0) + COALESCE(NEW.total_in, 0) + COALESCE(NEW.total_out, 0);
    ELSE
         -- Normal Accounts: Balance = In + Out
        NEW.current_balance := COALESCE(NEW.total_in, 0) + COALESCE(NEW.total_out, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a 'Final' trigger that runs last
DROP TRIGGER IF EXISTS zz_final_card_balance_fix ON accounts;
CREATE TRIGGER zz_final_card_balance_fix
BEFORE INSERT OR UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION fix_account_card_balance();

-- 3. Force update all accounts immediately
UPDATE accounts SET id = id;
