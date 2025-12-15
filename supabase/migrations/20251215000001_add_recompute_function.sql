-- Function: recompute_cashback_cycle
-- Purpose: Aggregates entries and updates the cycle summary deterministically.

CREATE OR REPLACE FUNCTION public.recompute_cashback_cycle(p_cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_real_awarded numeric;
    v_overflow_loss numeric;
    v_virtual_profit numeric;
    v_max_budget numeric;
    v_min_spend numeric;
    v_spent_amount numeric;
    v_remaining_budget numeric;
BEGIN
    -- 1. Get cycle config
    SELECT max_budget, min_spend_target, spent_amount 
    INTO v_max_budget, v_min_spend, v_spent_amount
    FROM public.cashback_cycles
    WHERE id = p_cycle_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Aggregate Real Awarded (counts_to_budget = true)
    -- Typically mode='real'
    SELECT COALESCE(SUM(amount), 0)
    INTO v_real_awarded
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND counts_to_budget = true;

    -- 3. Aggregate Overflow/Voluntary
    -- mode='voluntary' OR (mode='real' AND counts_to_budget=false - theoretically possible if manually adjusted)
    -- Actually, usually overflow is calculated: 
    -- If real_awarded > max_budget, the excess is overflow. 
    -- PLUS any explicit 'voluntary' entries.
    
    -- Wait, the task says:
    -- "overflow_loss = sum(amount) where mode='voluntary' OR counts_to_budget=false"
    -- This implies entries themselves are marked as voluntary/overflow.
    -- BUT we also have the case where "Real" entries exceed the budget.
    -- If we rely ONLY on entries, we might miss the implicit overflow.
    -- However, MF5.1 spec says: "Derive overflow_loss = sum(amount) where mode='voluntary' OR counts_to_budget=false"
    -- AND "is_exhausted = (real_awarded >= max_budget)".
    -- So we just sum the entries as they are categorized.
    -- The "Implicit" overflow logic (budget cap) might be handled by switching the mode of the entry? 
    -- Or simply: Real is Real. If Real > Budget, then is_exhausted = true.
    -- The "Excess" isn't stored as separate "Overflow" entries automatically unless we split them.
    -- For this function, let's stick to the simple aggregation defined in the task.
    
    SELECT COALESCE(SUM(amount), 0)
    INTO v_overflow_loss
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND (mode = 'voluntary' OR counts_to_budget = false);

    -- 4. Aggregate Virtual Profit
    -- "virtual_profit = sum(virtual) clamped to remaining budget after real_awarded"
    SELECT COALESCE(SUM(amount), 0)
    INTO v_virtual_profit
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND mode = 'virtual';
      
    -- Clamp Virtual Profit
    -- Remaining budget for virtual profit = Max Budget - Real Awarded
    -- If Real Awarded >= Max Budget, then 0 virtual profit allowed? or just no budget left?
    -- Task says: "clamped to remaining budget after real_awarded"
    
    v_remaining_budget := GREATEST(0, v_max_budget - v_real_awarded);
    v_virtual_profit := LEAST(v_virtual_profit, v_remaining_budget);

    -- 5. Update Cycle
    UPDATE public.cashback_cycles
    SET 
        real_awarded = v_real_awarded,
        overflow_loss = v_overflow_loss,
        virtual_profit = v_virtual_profit,
        is_exhausted = (v_real_awarded >= v_max_budget),
        met_min_spend = (v_min_spend IS NULL OR v_min_spend = 0 OR v_spent_amount >= v_min_spend),
        updated_at = now()
    WHERE id = p_cycle_id;

END;
$$;
