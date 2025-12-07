-- Fix: Ensure transaction_history table has created_at column
-- This resolves: "column transaction_history.created_at does not exist"

-- First, check if table exists and if column is missing
DO $$ 
BEGIN
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_history' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.transaction_history 
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;

    -- Also ensure changed_at exists (in case that's what was used instead)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_history' 
        AND column_name = 'changed_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_history' 
        AND column_name = 'created_at'
    ) THEN
        -- Rename changed_at to created_at if that's what exists
        ALTER TABLE public.transaction_history 
        RENAME COLUMN changed_at TO created_at;
    END IF;
END $$;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at 
ON public.transaction_history(created_at);
