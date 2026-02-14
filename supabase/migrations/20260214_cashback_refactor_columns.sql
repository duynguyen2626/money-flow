-- Migration: Add explicit cashback columns to accounts table
-- Date: 2026-02-14

-- 1. Add new columns (Idempotent: Only add if not exists to prevent errors on re-run)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'cb_type') THEN
        ALTER TABLE "public"."accounts" ADD COLUMN "cb_type" text DEFAULT 'none' CHECK (cb_type IN ('none', 'simple', 'tiered'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'cb_base_rate') THEN
        ALTER TABLE "public"."accounts" ADD COLUMN "cb_base_rate" numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'cb_max_budget') THEN
        ALTER TABLE "public"."accounts" ADD COLUMN "cb_max_budget" numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'cb_is_unlimited') THEN
        ALTER TABLE "public"."accounts" ADD COLUMN "cb_is_unlimited" boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'cb_rules_json') THEN
        ALTER TABLE "public"."accounts" ADD COLUMN "cb_rules_json" jsonb;
    END IF;
END $$;

-- 2. Data Migration Script (Populate from existing JSON only if not already set)
DO $$
DECLARE
    account_record RECORD;
    config jsonb;
    program jsonb;
    levels jsonb;
BEGIN
    -- Only process accounts that have config but haven't been migrated (cb_type is still 'none' or null)
    -- OR process all to be safe, but be careful not to overwrite manual changes if any.
    -- For now, we'll re-process to ensure consistency with the JSON source of truth.
    FOR account_record IN SELECT id, cashback_config FROM accounts WHERE cashback_config IS NOT NULL LOOP
        config := account_record.cashback_config;
        
        -- Handle both stringified and object formats
        IF jsonb_typeof(config) = 'string' THEN
            config := config::text::jsonb;
        END IF;

        program := config -> 'program';
        
        IF program IS NOT NULL THEN
            levels := program -> 'levels';
            
            -- Simple logic to determine cb_type
            IF levels IS NOT NULL AND jsonb_array_length(levels) > 0 THEN
                UPDATE accounts SET 
                    cb_type = 'tiered',
                    cb_base_rate = COALESCE((program ->> 'defaultRate')::numeric, 0),
                    cb_max_budget = (program ->> 'maxBudget')::numeric,
                    cb_rules_json = levels
                WHERE id = account_record.id;
            ELSE
                UPDATE accounts SET 
                    cb_type = 'simple',
                    cb_base_rate = COALESCE((program ->> 'defaultRate')::numeric, 0),
                    cb_max_budget = (program ->> 'maxBudget')::numeric
                WHERE id = account_record.id;
            END IF;
            
            -- Handle unlimited flag
            IF (program ->> 'maxBudget') IS NULL OR (program ->> 'maxBudget')::numeric = 0 THEN
                UPDATE accounts SET cb_is_unlimited = true WHERE id = account_record.id;
            ELSE
                UPDATE accounts SET cb_is_unlimited = false WHERE id = account_record.id;
            END IF;
        END IF;
    END LOOP;
END $$;
