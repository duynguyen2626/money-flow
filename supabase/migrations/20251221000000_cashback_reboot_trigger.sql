-- Migration: 20251221000000_cashback_reboot_trigger.sql
-- Description: Trigger to update cashback_cycles when accounts.cashback_config changes.

-- 1. Helper function to sync cycles for a given account
CREATE OR REPLACE FUNCTION public.sync_cycles_on_account_config_change() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_new_config jsonb;
  v_max_amount numeric;
  v_min_spend numeric;
  v_max_amount_raw jsonb;
  v_min_spend_raw jsonb;
BEGIN
  -- Only proceed if cashback_config actually changed
  IF NEW.cashback_config IS NOT DISTINCT FROM OLD.cashback_config THEN
    RETURN NEW;
  END IF;

  v_new_config := NEW.cashback_config;

  -- If config is null, maybe we should clear targets? For now, let's just respect the parsing logic.
  IF v_new_config IS NULL THEN
    -- If config is removed, arguably we should remove limits from cycles, but let's keep it safe and do nothing or set to NULL.
    -- Let's set to NULL to indicate "no limit"
    v_max_amount := NULL;
    v_min_spend := NULL;
  ELSE
    -- Extract values similar to the TypeScript/JSON logic
    -- Support both program.maxAmount and legacy keys
    v_max_amount_raw := COALESCE(v_new_config->'program'->'maxAmount', v_new_config->'maxAmount', v_new_config->'max_amt');
    v_min_spend_raw := COALESCE(v_new_config->'program'->'minSpend', v_new_config->'minSpend', v_new_config->'min_spend');

    IF v_max_amount_raw IS NULL OR v_max_amount_raw::text = 'null' THEN 
        v_max_amount := NULL;
    ELSE 
        v_max_amount := (v_max_amount_raw)::numeric;
    END IF;

    IF v_min_spend_raw IS NULL OR v_min_spend_raw::text = 'null' THEN 
        v_min_spend := NULL;
    ELSE 
        v_min_spend := (v_min_spend_raw)::numeric;
    END IF;
  END IF;

  -- Update ALL cycles for this account to match the new config
  -- We only update max_budget and min_spend_target
  -- We do NOT retroactively change the cycle dates (start/end) because that would break existing data alignment.
  
  UPDATE public.cashback_cycles
  SET 
    max_budget = v_max_amount,
    min_spend_target = v_min_spend,
    updated_at = now()
  WHERE account_id = NEW.id;

  -- Trigger recompute for all affected cycles
  -- We can't call recompute_func efficiently in a set-based update, so we iterate?
  -- Or we relies on the app to recompute? No, the requirement is automatic.
  -- We can use a cursor loop.
  
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN SELECT id FROM public.cashback_cycles WHERE account_id = NEW.id LOOP
      PERFORM public.recompute_cashback_cycle(r.id);
    END LOOP;
  END;

  RETURN NEW;
END;
$$;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS trg_account_cashback_config_update ON public.accounts;

CREATE TRIGGER trg_account_cashback_config_update
AFTER UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.sync_cycles_on_account_config_change();
