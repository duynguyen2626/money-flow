-- Add parent_transaction_id column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES transactions (id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions (parent_transaction_id);

-- Verify column addition (optional, relevant for tools that run SQL directly but harmless here)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'parent_transaction_id'
    ) THEN
        RAISE EXCEPTION 'Column parent_transaction_id was not created successfully';
    END IF;
END $$;