-- Create transaction_history table for audit trail
CREATE TABLE IF NOT EXISTS public.transaction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    snapshot_before JSONB NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('edit', 'void')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    changed_by UUID REFERENCES auth.users(id)
);

-- Index for quick lookups by transaction
CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction_id ON public.transaction_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at ON public.transaction_history(created_at);

-- Enable RLS
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON public.transaction_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Allow insert access to authenticated users" ON public.transaction_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
