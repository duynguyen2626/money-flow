-- Migration: Extract statement_day and due_date to columns
-- Date: 2026-02-14

-- 1. Add new columns independently of cashback
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'statement_day') THEN
        ALTER TABLE "public"."accounts" ADD COLUMN "statement_day" integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'due_date') THEN
        ALTER TABLE "public"."accounts" ADD COLUMN "due_date" integer;
    END IF;
END $$;

-- 2. Data Migration: Extract existing values from cashback_config if present
DO $$
DECLARE
    account_record RECORD;
    config jsonb;
    program jsonb;
    s_day integer;
    d_date integer;
BEGIN
    FOR account_record IN SELECT id, cashback_config FROM accounts WHERE cashback_config IS NOT NULL LOOP
        config := account_record.cashback_config;
        
        -- Handle both stringified and object formats
        IF jsonb_typeof(config) = 'string' THEN
            config := config::text::jsonb;
        END IF;

        program := config -> 'program';
        
        IF program IS NOT NULL THEN
            IF (program ->> 'statementDay') IS NOT NULL THEN
                s_day := (program ->> 'statementDay')::integer;
                UPDATE accounts SET statement_day = s_day WHERE id = account_record.id;
            END IF;

            IF (program ->> 'dueDate') IS NOT NULL THEN
                d_date := (program ->> 'dueDate')::integer;
                UPDATE accounts SET due_date = d_date WHERE id = account_record.id;
            END IF;
        END IF;
    END LOOP;
END $$;
