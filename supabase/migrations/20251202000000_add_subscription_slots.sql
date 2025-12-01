
-- Add slots to subscription_members
ALTER TABLE public.subscription_members 
ADD COLUMN IF NOT EXISTS slots integer DEFAULT 1;

-- Ensure other columns exist in subscriptions (just in case)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS note_template text,
ADD COLUMN IF NOT EXISTS payment_account_id uuid REFERENCES public.accounts(id),
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
