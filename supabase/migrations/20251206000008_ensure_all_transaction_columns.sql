-- Comprehensive migration to ensure ALL required columns exist on the transactions table
-- This prevents "column does not exist" errors for: is_installment, installment_plan_id, persisted_cycle_tag, created_by, shop_id

-- 1. is_installment
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. installment_plan_id
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS installment_plan_id UUID REFERENCES public.installments(id);
EXCEPTION
    WHEN duplicate_column THEN null;
    WHEN undefined_table THEN 
        -- Fallback if installments table doesn't exist yet (unlikely but safe)
        -- We won't add foreign key constraint if table missing, but we add column as UUID
        ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS installment_plan_id UUID;
END $$;

-- 3. persisted_cycle_tag
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS persisted_cycle_tag TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. created_by (Safety check)
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. shop_id (Safety check)
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Indexes for performance on these columns
CREATE INDEX IF NOT EXISTS idx_transactions_is_installment ON public.transactions(is_installment);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_plan_id ON public.transactions(installment_plan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_persisted_cycle_tag ON public.transactions(persisted_cycle_tag);
