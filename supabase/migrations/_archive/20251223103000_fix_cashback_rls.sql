-- Migration: 20251223103000_fix_cashback_rls.sql
-- Description: Add WITH CHECK clauses so authenticated users can insert/update cashback rows.

DROP POLICY IF EXISTS "Users can manage their own cycles" ON public.cashback_cycles;
CREATE POLICY "Users can manage their own cycles" ON public.cashback_cycles
  FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_cycles.account_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_cycles.account_id));

DROP POLICY IF EXISTS "Users can manage their own entries" ON public.cashback_entries;
CREATE POLICY "Users can manage their own entries" ON public.cashback_entries
  FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_entries.account_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_entries.account_id));
