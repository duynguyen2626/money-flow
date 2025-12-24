-- Migration: 20251223110000_cashback_cycle_txn_trigger.sql
-- Description: Ensure cashback cycles exist and recompute on transaction changes.

CREATE OR REPLACE FUNCTION public.ensure_cashback_cycle(p_account_id uuid, p_cycle_tag text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_id uuid;
  v_config jsonb;
  v_max_amount_raw jsonb;
  v_min_spend_raw jsonb;
  v_max_amount numeric;
  v_min_spend numeric;
  v_type text;
BEGIN
  IF p_account_id IS NULL OR p_cycle_tag IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT type, cashback_config INTO v_type, v_config
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_type IS DISTINCT FROM 'credit_card' OR v_config IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_cycle_id
  FROM public.cashback_cycles
  WHERE account_id = p_account_id
    AND cycle_tag = p_cycle_tag;

  IF v_cycle_id IS NOT NULL THEN
    RETURN v_cycle_id;
  END IF;

  v_max_amount_raw := COALESCE(v_config->'program'->'maxAmount', v_config->'maxAmount', v_config->'max_amt');
  v_min_spend_raw := COALESCE(v_config->'program'->'minSpend', v_config->'minSpend', v_config->'min_spend');

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

  INSERT INTO public.cashback_cycles (account_id, cycle_tag, max_budget, min_spend_target, spent_amount)
  VALUES (p_account_id, p_cycle_tag, v_max_amount, v_min_spend, 0)
  RETURNING id INTO v_cycle_id;

  RETURN v_cycle_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_cashback_cycle_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_id uuid;
  v_old_cycle_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.persisted_cycle_tag IS NULL THEN
      RETURN NEW;
    END IF;

    v_cycle_id := public.ensure_cashback_cycle(NEW.account_id, NEW.persisted_cycle_tag);
    IF v_cycle_id IS NOT NULL THEN
      PERFORM public.recompute_cashback_cycle(v_cycle_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.persisted_cycle_tag IS NOT NULL THEN
      v_old_cycle_id := public.ensure_cashback_cycle(OLD.account_id, OLD.persisted_cycle_tag);
      IF v_old_cycle_id IS NOT NULL THEN
        PERFORM public.recompute_cashback_cycle(v_old_cycle_id);
      END IF;
    END IF;

    IF NEW.persisted_cycle_tag IS NOT NULL THEN
      v_cycle_id := public.ensure_cashback_cycle(NEW.account_id, NEW.persisted_cycle_tag);
      IF v_cycle_id IS NOT NULL THEN
        PERFORM public.recompute_cashback_cycle(v_cycle_id);
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.persisted_cycle_tag IS NULL THEN
      RETURN OLD;
    END IF;

    v_old_cycle_id := public.ensure_cashback_cycle(OLD.account_id, OLD.persisted_cycle_tag);
    IF v_old_cycle_id IS NOT NULL THEN
      PERFORM public.recompute_cashback_cycle(v_old_cycle_id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cashback_cycle_on_transaction ON public.transactions;
CREATE TRIGGER trg_cashback_cycle_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_cashback_cycle_on_transaction();
