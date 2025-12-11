-- Migration to fix final_price calculation logic and backfill data
-- Date: 2025-12-10 19:15:00

CREATE OR REPLACE FUNCTION update_final_price()
RETURNS TRIGGER AS $$
DECLARE
    rate numeric;
    percent_val numeric;
    fixed_val numeric;
    cashback_amt numeric;
BEGIN
    -- Initialize variables
    percent_val := COALESCE(NEW.cashback_share_percent, 0);
    fixed_val := COALESCE(NEW.cashback_share_fixed, 0);
    
    -- Determine Rate logic
    -- If percent is >= 1 (e.g., 1.0, 5.0, 100.0), treat as percentage (divide by 100)
    -- If percent is < 1 (e.g., 0.01, 0.05), treat as decimal rate
    -- Exception: 0 is 0.
    IF ABS(percent_val) >= 1 THEN
        rate := percent_val / 100.0;
    ELSE
        rate := percent_val;
    END IF;

    -- Calculate total cashback amount
    -- Cashback = (Amount * Rate) + Fixed
    -- We use ABS(Amount) because cashback is an absolute value derived from the transaction size
    cashback_amt := (ABS(NEW.amount) * rate) + ABS(fixed_val);

    -- Calculate Final Price
    -- Formula: amount - (SIGN(amount) * cashback_amount)
    -- Expense (-100), Cashback (5) -> -100 - (-1 * 5) = -100 + 5 = -95 (Correct, cost less)
    -- Income (100), Cashback (5) -> 100 - (1 * 5) = 100 - 5 = 95 (Received less? Maybe fee? usually cashback is not for income, but math consistent)
    -- If amount is 0, final is 0.
    
    IF NEW.amount = 0 THEN
        NEW.final_price := 0;
    ELSE
        NEW.final_price := NEW.amount - (SIGN(NEW.amount) * cashback_amt);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger (if it doesn't exist, though strictly we updated the function it uses)
DROP TRIGGER IF EXISTS update_final_price_trigger ON transactions;

CREATE TRIGGER update_final_price_trigger
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_final_price();

-- Force recalculation for all rows
UPDATE transactions SET id = id;
