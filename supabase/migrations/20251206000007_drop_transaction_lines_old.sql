-- Drop deprecated table transaction_lines_old
DROP TABLE IF EXISTS public.transaction_lines_old CASCADE;

-- Also verify if we need to clean up transactions_old
-- DROP TABLE IF EXISTS public.transactions_old CASCADE;
