-- Fix Installment Constraints to avoid ambiguous relationships

BEGIN;

-- 1. Drop existing constraints (if any, auto-generated names might vary)
-- We try to drop by the most likely auto-generated names or just recreate them.
-- Since we can't easily know the auto-generated name without inspecting, 
-- we will try to drop the column constraint and re-add it.

-- However, dropping constraint by name requires knowing the name.
-- A safer way is to rely on the fact that we can add a named constraint.
-- But we want to avoid duplicate constraints.

-- Let's try to rename the constraint if it exists, or drop it.
-- We can query pg_constraint but we are in a migration file.

-- Strategy: Drop the column's FK and re-add it with a specific name.
-- ALTER TABLE installments DROP CONSTRAINT IF EXISTS installments_original_transaction_id_fkey;
-- But if the name was auto-generated as something else, this won't work.

-- Let's assume standard naming convention first.
DO $$ BEGIN
    ALTER TABLE installments DROP CONSTRAINT IF EXISTS installments_original_transaction_id_fkey;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Also try to drop the one on transactions
DO $$ BEGIN
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_installment_plan_id_fkey;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 2. Re-add constraints with explicit names

-- Installments -> Transactions (Original Transaction)
ALTER TABLE installments
    ADD CONSTRAINT installments_original_transaction_id_fkey
    FOREIGN KEY (original_transaction_id)
    REFERENCES transactions(id)
    ON DELETE SET NULL;

-- Transactions -> Installments (Installment Plan)
ALTER TABLE transactions
    ADD CONSTRAINT transactions_installment_plan_id_fkey
    FOREIGN KEY (installment_plan_id)
    REFERENCES installments(id)
    ON DELETE SET NULL;

COMMIT;
