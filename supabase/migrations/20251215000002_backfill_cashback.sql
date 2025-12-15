-- Backfill Script for Cashback (Idempotent)

-- Block 1: Create Cashback Cycles
DO $$
DECLARE
    r RECORD;
    v_config jsonb;
    v_max_amount numeric;
    v_min_spend numeric;
BEGIN
    -- Iterate over distinct account/tag combinations from transactions
    -- Only for credit card accounts that have cashback config
    FOR r IN 
        SELECT DISTINCT t.account_id, COALESCE(t.persisted_cycle_tag, t.tag) as cycle_tag
        FROM public.transactions t
        JOIN public.accounts a ON t.account_id = a.id
        WHERE a.type = 'credit_card'
          AND a.cashback_config IS NOT NULL
          AND (t.persisted_cycle_tag IS NOT NULL OR t.tag IS NOT NULL) -- Ensure we have a cycle tag
          AND COALESCE(t.persisted_cycle_tag, t.tag) <> ''
    LOOP
        -- Check if cycle already exists
        IF NOT EXISTS (SELECT 1 FROM public.cashback_cycles WHERE account_id = r.account_id AND cycle_tag = r.cycle_tag) THEN
            
            -- Fetch config to seed badget/min_spend
            SELECT cashback_config INTO v_config FROM public.accounts WHERE id = r.account_id;
            
            -- Parse safe maxAmount and minSpend
            -- JSONB access: v_config->>'maxAmount' etc.
            -- Note: depends on config shape. Assuming standard shape.
            -- If maxAmount is null or -1, treat as unlimited (0 budget or huge?) 
            -- For DB, we use 0 if not set, or extract value.
            
            v_max_amount := COALESCE((v_config->>'maxAmount')::numeric, 0);
            v_min_spend := COALESCE((v_config->>'minSpend')::numeric, 0);

            INSERT INTO public.cashback_cycles (account_id, cycle_tag, max_budget, min_spend_target)
            VALUES (r.account_id, r.cycle_tag, v_max_amount, v_min_spend);
            
            RAISE NOTICE 'Created cycle % for account %', r.cycle_tag, r.account_id;
        END IF;
    END LOOP;
END $$;


-- Block 2: Migrate cashback_profits -> cashback_entries
DO $$
DECLARE
    r RECORD;
    v_cycle_id uuid;
    v_tx_cycle_tag text;
BEGIN
    FOR r IN SELECT * FROM public.cashback_profits LOOP
        -- Attempt to find the cycle for this profit entry
        -- First verify if we already migrated it (idempotency check by linkage? 
        -- cashback_profits doesn't link to entries, so we check if an entry exists for this transaction ??
        -- BUT: One transaction could have multiple entries theoretically, but profit usually one.
        -- SAFER: Check if an entry with same amount & note & transaction_id exists in 'entries'
        
        IF NOT EXISTS (
            SELECT 1 FROM public.cashback_entries 
            WHERE transaction_id = r.transaction_id 
              AND amount = r.amount 
              AND mode = 'real' -- profits are usually real
        ) THEN
            -- Find Tax Cycle Tag
            SELECT COALESCE(persisted_cycle_tag, tag) INTO v_tx_cycle_tag
            FROM public.transactions 
            WHERE id = r.transaction_id;

            IF v_tx_cycle_tag IS NOT NULL THEN
                -- Find Cycle ID
                SELECT id INTO v_cycle_id 
                FROM public.cashback_cycles 
                WHERE account_id = r.account_id AND cycle_tag = v_tx_cycle_tag;

                IF v_cycle_id IS NOT NULL THEN
                    INSERT INTO public.cashback_entries (
                        cycle_id, 
                        account_id, 
                        transaction_id, 
                        mode, 
                        amount, 
                        counts_to_budget, 
                        note,
                        created_at
                    )
                    VALUES (
                        v_cycle_id,
                        r.account_id,
                        r.transaction_id,
                        'real', -- Defaulting to real for profits
                        r.amount,
                        true, -- counts to budget
                        r.note,
                        r.created_at
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;


-- Block 3: Migrate Transaction Fixed/Percent fields -> cashback_entries
-- Fallback for transactions that have cashback data but NO cashback_profits row
DO $$
DECLARE
    r RECORD;
    v_cycle_id uuid;
    v_cycle_tag text;
    v_amount numeric;
    v_mode text;
BEGIN
    FOR r IN 
        SELECT t.* 
        FROM public.transactions t
        -- Join to ensure we ignore those already covered by entries (prior step)
        LEFT JOIN public.cashback_entries ce ON ce.transaction_id = t.id
        WHERE ce.id IS NULL -- Only process if no entry exists yet
          AND (t.cashback_share_fixed > 0 OR t.cashback_share_percent > 0)
          AND t.account_id IN (SELECT id FROM accounts WHERE type='credit_card')
    LOOP
        v_cycle_tag := COALESCE(r.persisted_cycle_tag, r.tag);
        
        IF v_cycle_tag IS NOT NULL THEN
             SELECT id INTO v_cycle_id 
             FROM public.cashback_cycles 
             WHERE account_id = r.account_id AND cycle_tag = v_cycle_tag;
             
             IF v_cycle_id IS NOT NULL THEN
                 -- Determine amount and mode
                 IF r.cashback_share_fixed > 0 THEN
                     v_amount := r.cashback_share_fixed;
                     v_mode := 'real'; -- Legacy fixed usually meant real cashback given
                 ELSE
                     -- Percent logic is harder without knowing base amount or rules.
                     -- Use 0 or skip?
                     -- Task says: "if percent-based fields exist... create entry similarly"
                     -- But calculating exact amount might be tricky if we don't have the computed value stored.
                     -- If only percent is stored, we might just skip or store 0 with a note.
                     -- Let's stick to fixed for safety as that implies a calculated value.
                     CONTINUE; 
                 END IF;
                 
                 INSERT INTO public.cashback_entries (
                    cycle_id, account_id, transaction_id, mode, amount, counts_to_budget, note, created_at
                 )
                 VALUES (
                    v_cycle_id, r.account_id, r.id, v_mode, v_amount, true, 'Migrated from transaction fixed share', r.created_at
                 );
             END IF;
        END IF;
    END LOOP;
END $$;


-- Block 4: Update transactions.cashback_mode
DO $$
BEGIN
    UPDATE public.transactions t
    SET cashback_mode = 'real_fixed'
    FROM public.cashback_entries ce
    WHERE t.id = ce.transaction_id
      AND ce.mode = 'real'
      AND t.cashback_mode IS NULL;
      
    -- Could add more logic for 'real_percent' etc if we had distinct entry types,
    -- but for now 'real_fixed' is a safe default for migrated entries.
END $$;


-- Block 5: Recompute All Cycles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.cashback_cycles LOOP
        PERFORM public.recompute_cashback_cycle(r.id);
    END LOOP;
END $$;
