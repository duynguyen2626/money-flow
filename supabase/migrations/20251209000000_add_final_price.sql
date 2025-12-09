-- Add final_price column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS final_price numeric;

-- Create function to calculate final_price
CREATE OR REPLACE FUNCTION update_final_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Logic: Start with amount.
    -- If cashback_share_fixed is present, subtract its magnitude from the absolute value of amount.
    -- Since expenses are negative, we ADD cashback to make it closer to zero (less negative).
    -- Since income is positive, we SUBTRACT cashback to make it closer to zero (less positive).
    -- Formula: amount - (SIGN(amount) * cashback_share_fixed)
    -- If amount is 0, SIGN is 0, so no change.

    IF NEW.cashback_share_fixed IS NOT NULL AND NEW.cashback_share_fixed != 0 THEN
        NEW.final_price := NEW.amount - (SIGN(NEW.amount) * ABS(NEW.cashback_share_fixed));
    ELSE
        NEW.final_price := NEW.amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before INSERT or UPDATE
DROP TRIGGER IF EXISTS update_final_price_trigger ON transactions;

CREATE TRIGGER update_final_price_trigger
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_final_price();

-- Backfill existing rows
UPDATE transactions
SET final_price = CASE
    WHEN cashback_share_fixed IS NOT NULL AND cashback_share_fixed != 0 THEN
        amount - (SIGN(amount) * ABS(cashback_share_fixed))
    ELSE
        amount
    END;
