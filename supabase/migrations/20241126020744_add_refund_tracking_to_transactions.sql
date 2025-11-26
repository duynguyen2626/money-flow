
ALTER TABLE public.transactions
ADD COLUMN refunded_amount numeric DEFAULT 0,
ADD COLUMN refund_status text DEFAULT 'none';
