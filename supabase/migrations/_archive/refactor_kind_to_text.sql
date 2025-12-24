-- Refactor kind column from text[] to text
-- Step 1: Change column type
ALTER TABLE categories 
ALTER COLUMN kind TYPE text 
USING CASE 
    WHEN kind @> ARRAY['in'] THEN 'internal'
    WHEN kind @> ARRAY['ex'] THEN 'external'
    ELSE 'internal'
END;

-- Step 2: Set default value
ALTER TABLE categories 
ALTER COLUMN kind SET DEFAULT 'internal';

-- Step 3: Update data based on category type
UPDATE categories SET kind = 'external' WHERE type = 'expense';
UPDATE categories SET kind = 'internal' WHERE type = 'income';
UPDATE categories SET kind = 'internal' WHERE type = 'transfer';

-- Step 4: Update specific categories for Lending/Repay (they should be external)
UPDATE categories SET kind = 'external' 
WHERE name IN ('Debt Repayment', 'Repayment', 'Thu nợ người khác', 'Lending');
