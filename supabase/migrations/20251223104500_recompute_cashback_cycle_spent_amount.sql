-- Migration: 20251223104500_recompute_cashback_cycle_spent_amount.sql
-- Description: Align DB recompute with runtime logic by recalculating spent_amount.

CREATE OR REPLACE FUNCTION public.recompute_cashback_cycle(p_cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account_id uuid;
    v_cycle_tag text;
    v_real_awarded numeric;
    v_overflow_loss numeric;
    v_virtual_profit numeric;
    v_real_total numeric;
    v_virtual_total_raw numeric;
    v_voluntary_total numeric;
    v_max_budget numeric;
    v_min_spend numeric;
    v_spent_amount numeric;
    v_cap_after_real numeric;
    v_real_overflow numeric;
    v_virtual_overflow numeric;
BEGIN
    SELECT account_id, cycle_tag, max_budget, min_spend_target
    INTO v_account_id, v_cycle_tag, v_max_budget, v_min_spend
    FROM public.cashback_cycles
    WHERE id = p_cycle_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_max_budget := COALESCE(v_max_budget, 0);

    SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO v_spent_amount
    FROM public.transactions
    WHERE account_id = v_account_id
      AND persisted_cycle_tag = v_cycle_tag
      AND status <> 'void'
      AND type IN ('expense', 'debt');

    SELECT COALESCE(SUM(amount), 0)
    INTO v_real_total
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND mode = 'real'
      AND counts_to_budget = true;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_voluntary_total
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND (
        mode = 'voluntary'
        OR counts_to_budget = false
      );

    SELECT COALESCE(SUM(amount), 0)
    INTO v_virtual_total_raw
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND mode = 'virtual';

    v_cap_after_real := GREATEST(0, v_max_budget - v_real_total);
    v_virtual_profit := LEAST(v_virtual_total_raw, v_cap_after_real);
    v_virtual_overflow := GREATEST(0, v_virtual_total_raw - v_virtual_profit);
    v_real_overflow := GREATEST(0, v_real_total - v_max_budget);
    v_real_awarded := LEAST(v_real_total, v_max_budget);
    v_overflow_loss := v_voluntary_total + v_virtual_overflow + v_real_overflow;

    UPDATE public.cashback_cycles
    SET real_awarded = v_real_awarded,
        virtual_profit = v_virtual_profit,
        overflow_loss = v_overflow_loss,
        spent_amount = v_spent_amount,
        is_exhausted = (v_real_total + v_virtual_profit) >= v_max_budget,
        met_min_spend = (
            COALESCE(v_min_spend, 0) <= 0
            OR v_spent_amount >= v_min_spend
        ),
        updated_at = now()
    WHERE id = p_cycle_id;
END;
$$;
