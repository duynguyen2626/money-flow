-- Migration: 20251216220000_fix_recompute_consistency.sql
-- Description: Updates recompute algorithm to match TypeScript engine, tracking overflow separately.
--              Normalizes budget fields (0 -> NULL for missing config).
-- 1. Replace recompute_cashback_cycle with standard logic
CREATE OR REPLACE FUNCTION public.recompute_cashback_cycle(p_cycle_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_real_awarded numeric;
v_overflow_loss numeric;
v_virtual_profit numeric;
-- Aggregates
v_real_total numeric;
v_virtual_total_raw numeric;
v_voluntary_total numeric;
-- Config
v_max_budget numeric;
v_min_spend numeric;
v_spent_amount numeric;
-- Working vars
v_cap_after_real numeric;
v_real_overflow numeric;
v_virtual_overflow numeric;
BEGIN -- 1. Get cycle config
SELECT max_budget,
    min_spend_target,
    spent_amount INTO v_max_budget,
    v_min_spend,
    v_spent_amount
FROM public.cashback_cycles
WHERE id = p_cycle_id;
IF NOT FOUND THEN RETURN;
END IF;
-- Treat NULL max_budget as 0 (no cashback budget)
v_max_budget := COALESCE(v_max_budget, 0);
-- 2. Aggregate Real Awarded (counts_to_budget = true)
SELECT COALESCE(SUM(amount), 0) INTO v_real_total
FROM public.cashback_entries
WHERE cycle_id = p_cycle_id
    AND mode = 'real'
    AND counts_to_budget = true;
-- 3. Aggregate Voluntary + Non-budget entries
SELECT COALESCE(SUM(amount), 0) INTO v_voluntary_total
FROM public.cashback_entries
WHERE cycle_id = p_cycle_id
    AND (
        mode = 'voluntary'
        OR counts_to_budget = false
    );
-- 4. Aggregate Virtual Profit
SELECT COALESCE(SUM(amount), 0) INTO v_virtual_total_raw
FROM public.cashback_entries
WHERE cycle_id = p_cycle_id
    AND mode = 'virtual';
-- 5. Logic Application
-- Cap available for Virtual = Max - Real (floor 0)
v_cap_after_real := GREATEST(0, v_max_budget - v_real_total);
-- Virtual Effective = min(VirtualRaw, CapAvailable)
v_virtual_profit := LEAST(v_virtual_total_raw, v_cap_after_real);
-- Virtual Overflow = VirtualRaw - VirtualEffective
v_virtual_overflow := GREATEST(0, v_virtual_total_raw - v_virtual_profit);
-- Real Overflow = max(0, RealTotal - Max)
-- This handles Case 2 where a single real entry exceeds budget
v_real_overflow := GREATEST(0, v_real_total - v_max_budget);
-- Real Awarded (effective count to budget)
-- We store the portion that actually counted (capped at Budget)
v_real_awarded := LEAST(v_real_total, v_max_budget);
-- Total Overflow Loss = Voluntary + VirtualOverflow + RealOverflow
v_overflow_loss := v_voluntary_total + v_virtual_overflow + v_real_overflow;
-- 6. Update Cycle
UPDATE public.cashback_cycles
SET real_awarded = v_real_awarded,
    virtual_profit = v_virtual_profit,
    overflow_loss = v_overflow_loss,
    -- Exhausted if Real Total >= Max OR (Real + Virtual Effective) >= Max
    is_exhausted = (v_real_total + v_virtual_profit) >= v_max_budget,
    -- Met min spend? (treat NULL min_spend as 0/met)
    met_min_spend = (
        COALESCE(v_min_spend, 0) <= 0
        OR v_spent_amount >= v_min_spend
    ),
    updated_at = now()
WHERE id = p_cycle_id;
END;
$$;
-- 2. Data Fix / Normalization Script (Idempotent)
DO $$
DECLARE r RECORD;
v_config jsonb;
v_max_amount_raw jsonb;
v_min_spend_raw jsonb;
v_max_amount numeric;
v_min_spend numeric;
BEGIN -- Iterate all cycles linked to an account
FOR r IN
SELECT c.id,
    c.account_id,
    a.cashback_config
FROM public.cashback_cycles c
    JOIN public.accounts a ON c.account_id = a.id
WHERE a.cashback_config IS NOT NULL LOOP v_config := r.cashback_config;
-- Extract raw values to check for nullity
v_max_amount_raw := v_config->'maxAmount';
v_min_spend_raw := v_config->'minSpend';
-- Determine normalized values
-- If raw is null/undefined -> store NULL
-- If raw is defined -> store number (even if 0)
IF v_max_amount_raw IS NULL
OR v_max_amount_raw::text = 'null' THEN v_max_amount := NULL;
-- Treat as 0 downstream but store NULL as per spec
ELSE v_max_amount := (v_max_amount_raw)::numeric;
END IF;
IF v_min_spend_raw IS NULL
OR v_min_spend_raw::text = 'null' THEN v_min_spend := NULL;
ELSE v_min_spend := (v_min_spend_raw)::numeric;
END IF;
-- Logic refinement: 
-- If current values are 0, and config says NULL (missing), update to NULL.
-- Or just force update to match config regardless.
-- This ensures sync with current account settings.
-- NOTE: This updates historical cycles to match CURRENT account config boundaries.
-- This is the intended behavior for now (cycles follow account config).
UPDATE public.cashback_cycles
SET max_budget = v_max_amount,
    min_spend_target = v_min_spend
WHERE id = r.id
    AND (
        -- Only update if different to avoid churn
        (
            max_budget IS DISTINCT
            FROM v_max_amount
        )
        OR (
            min_spend_target IS DISTINCT
            FROM v_min_spend
        )
    );
-- Always recompute to ensure calculations are fresh with new function logic
PERFORM public.recompute_cashback_cycle(r.id);
END LOOP;
END $$;