-- Add created_by column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Safety fix for missing created_at
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);

-- Update RLS policy if needed (optional but good practice)
-- Assuming existing policies cover this if they reference auth.uid()
