-- 1. Create cashback_cycles table
CREATE TABLE IF NOT EXISTS public.cashback_cycles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    account_id uuid REFERENCES public.accounts(id) NOT NULL,
    cycle_tag text NOT NULL, -- e.g. "DEC25"

    -- Snapshots from account config at time of creation/update
    max_budget numeric DEFAULT 0,
    min_spend_target numeric DEFAULT 0, -- nullable in logic, but numeric 0 often safer for sums

    -- Aggregates
    spent_amount numeric DEFAULT 0,
    real_awarded numeric DEFAULT 0, -- Counts toward budget
    virtual_profit numeric DEFAULT 0, -- Clamped profit
    overflow_loss numeric DEFAULT 0, -- Budget overflow + voluntary

    -- Status flags
    is_exhausted boolean DEFAULT false,
    met_min_spend boolean DEFAULT false,

    UNIQUE(account_id, cycle_tag)
);

-- Enable RLS for cashback_cycles
ALTER TABLE public.cashback_cycles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_cycles' AND policyname = 'Users can view their own cycles') THEN
        CREATE POLICY "Users can view their own cycles" ON public.cashback_cycles 
        FOR SELECT USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_cycles.account_id));
    END IF;
    
    -- Allow insert/update/delete for owner (or service role)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_cycles' AND policyname = 'Users can manage their own cycles') THEN
         CREATE POLICY "Users can manage their own cycles" ON public.cashback_cycles 
         FOR ALL USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_cycles.account_id));
    END IF;
END $$;


-- 2. Create cashback_entries table
CREATE TABLE IF NOT EXISTS public.cashback_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    
    cycle_id uuid REFERENCES public.cashback_cycles(id) ON DELETE CASCADE,
    account_id uuid REFERENCES public.accounts(id) NOT NULL,
    transaction_id uuid REFERENCES public.transactions(id), -- Nullable if manual adjustment? Usually linked.

    mode text NOT NULL CHECK (mode IN ('real', 'virtual', 'voluntary')),
    amount numeric NOT NULL DEFAULT 0,
    
    counts_to_budget boolean DEFAULT false, 
    note text,

    -- Denormalized tag for easier querying if needed, or rely on cycle
    -- We rely on cycle_id usually.
    
    CONSTRAINT positive_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cashback_entries_account_txn ON public.cashback_entries(account_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_cashback_entries_cycle ON public.cashback_entries(cycle_id);

-- Enable RLS for cashback_entries
ALTER TABLE public.cashback_entries ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_entries' AND policyname = 'Users can view their own entries') THEN
        CREATE POLICY "Users can view their own entries" ON public.cashback_entries 
        FOR SELECT USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_entries.account_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_entries' AND policyname = 'Users can manage their own entries') THEN
        CREATE POLICY "Users can manage their own entries" ON public.cashback_entries 
        FOR ALL USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_entries.account_id));
    END IF;
END $$;


-- 3. Add cashback_mode to transactions
DO $$ 
BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cashback_mode text;
    -- We won't enforce a strict enum check constraint here to allow flexibility, 
    -- but expected values are: 'none_back', 'real_fixed', 'real_percent', 'shared', 'voluntary'
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
