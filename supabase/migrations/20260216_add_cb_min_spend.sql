-- Migration: Add cb_min_spend column to accounts table
-- Date: 2026-02-16
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'accounts'
        AND column_name = 'cb_min_spend'
) THEN
ALTER TABLE "public"."accounts"
ADD COLUMN "cb_min_spend" numeric DEFAULT 0;
END IF;
END $$;
-- Data migration: Sync from legacy cashback_config if applicable
DO $$
DECLARE account_record RECORD;
config jsonb;
program jsonb;
BEGIN FOR account_record IN
SELECT id,
    cashback_config
FROM accounts
WHERE cashback_config IS NOT NULL LOOP config := account_record.cashback_config;
IF jsonb_typeof(config) = 'string' THEN config := config::text::jsonb;
END IF;
program := config->'program';
IF program IS NOT NULL
AND (program->>'minSpendTarget') IS NOT NULL THEN
UPDATE accounts
SET cb_min_spend = (program->>'minSpendTarget')::numeric
WHERE id = account_record.id;
END IF;
END LOOP;
END $$;