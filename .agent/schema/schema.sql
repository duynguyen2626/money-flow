DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='logo_url') THEN
    ALTER TABLE public.accounts RENAME COLUMN logo_url TO image_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='logo_url') THEN
    ALTER TABLE public.shops RENAME COLUMN logo_url TO image_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='logo_url') THEN
    ALTER TABLE public.categories RENAME COLUMN logo_url TO image_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_mappings' AND column_name='logo_url') THEN
    ALTER TABLE public.bank_mappings RENAME COLUMN logo_url TO image_url;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
create table if not exists public.person_cycle_sheets (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.profiles(id) on delete cascade,
  cycle_tag text not null,
  sheet_id text,
  sheet_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists person_cycle_sheets_person_cycle_idx
  on public.person_cycle_sheets (person_id, cycle_tag);

create index if not exists person_cycle_sheets_person_id_idx
  on public.person_cycle_sheets (person_id);
/*
Consolidated placeholder migrations (already applied remotely).
This file replaces the per-timestamp placeholder files removed on 2025-12-27.

Local placeholders removed:
- 20251124225834_placeholder.sql
- 20251127120000_placeholder.sql
- 20251127131500_placeholder.sql
- 20251127142500_placeholder.sql
- 20251127151000_placeholder.sql
- 20251127154000_placeholder.sql
- 20251127163000_placeholder.sql
- 20251127164500_placeholder.sql
- 20251127171000_placeholder.sql
- 20251127172400_placeholder.sql
- 20251127190500_placeholder.sql
- 20251127230900_placeholder.sql
- 20251127235500_placeholder.sql
- 20251128120000_placeholder.sql
- 20251128121500_placeholder.sql
- 20251129100000_placeholder.sql
- 20251129183000_placeholder.sql
- 20251202000000_placeholder.sql
- 20251202000001_placeholder.sql
- 20251203000000_placeholder.sql
- 20251204000000_placeholder.sql
- 20251205000000_placeholder.sql
- 20251205000001_placeholder.sql
- 20251205000002_placeholder.sql
- 20251205000003_placeholder.sql
- 20251205000004_placeholder.sql
- 20251206000000_placeholder.sql
- 20251206000001_placeholder.sql
- 20251206000002_placeholder.sql
- 20251206000003_placeholder.sql
- 20251206000004_placeholder.sql
- 20251208112652_placeholder.sql
- 20251210121454_placeholder.sql
- 20251211074535_placeholder.sql
- 20251213124710_placeholder.sql
- 20251215065711_placeholder.sql
- 20251215065725_placeholder.sql
- 20251215065727_placeholder.sql
- 20251219080516_placeholder.sql
- 20251219090720_placeholder.sql
- 20251219100905_placeholder.sql
- 20251223083426_placeholder.sql
- 20251223083437_placeholder.sql
- 20251223084231_placeholder.sql
- 20251223084847_placeholder.sql

Archived remote placeholders removed:
- 20251124225834_remote_placeholder.sql
- 20251127120000_remote_placeholder.sql
- 20251127131500_remote_placeholder.sql
- 20251127142500_remote_placeholder.sql
- 20251127151000_remote_placeholder.sql
- 20251127154000_remote_placeholder.sql
- 20251127163000_remote_placeholder.sql
- 20251127164500_remote_placeholder.sql
- 20251127171000_remote_placeholder.sql
- 20251127172400_remote_placeholder.sql
- 20251127190500_remote_placeholder.sql
- 20251127230900_remote_placeholder.sql
- 20251127235500_remote_placeholder.sql
- 20251128120000_remote_placeholder.sql
- 20251128121500_remote_placeholder.sql
- 20251129100000_remote_placeholder.sql
- 20251129183000_remote_placeholder.sql
- 20251202000000_remote_placeholder.sql
- 20251202000001_remote_placeholder.sql
- 20251203000000_remote_placeholder.sql
- 20251204000000_remote_placeholder.sql
- 20251205000000_remote_placeholder.sql
- 20251205000001_remote_placeholder.sql
- 20251205000002_remote_placeholder.sql
- 20251205000003_remote_placeholder.sql
- 20251205000004_remote_placeholder.sql
- 20251206000000_remote_placeholder.sql
- 20251206000001_remote_placeholder.sql
- 20251206000002_remote_placeholder.sql
- 20251206000003_remote_placeholder.sql
- 20251206000004_remote_placeholder.sql
- 20251208112652_remote_placeholder.sql
- 20251210121454_remote_placeholder.sql
- 20251211074535_remote_placeholder.sql
- 20251213124710_remote_placeholder.sql
- 20251215065711_remote_placeholder.sql
- 20251215065725_remote_placeholder.sql
- 20251215065727_remote_placeholder.sql
- 20251219080516_remote_placeholder.sql
- 20251219090720_remote_placeholder.sql
- 20251219100905_remote_placeholder.sql
- 20251223083426_remote_placeholder.sql
- 20251223083437_remote_placeholder.sql
- 20251223084231_remote_placeholder.sql
- 20251223084847_remote_placeholder.sql
*/
alter table public.profiles
  add column if not exists is_group boolean default false,
  add column if not exists group_parent_id uuid references public.profiles(id) on delete set null;

create index if not exists profiles_group_parent_id_idx on public.profiles(group_parent_id);
-- Fix RLS policy for cashback_cycles to allow authenticated owners to insert/update.

alter table public.cashback_cycles enable row level security;

drop policy if exists "Users can manage their own cycles" on public.cashback_cycles;
create policy "Users can manage their own cycles" on public.cashback_cycles
  for all
  using (auth.uid() = (select owner_id from public.accounts where id = cashback_cycles.account_id))
  with check (auth.uid() = (select owner_id from public.accounts where id = cashback_cycles.account_id));
create table if not exists public.bot_user_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('telegram', 'slack')),
  platform_user_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  state jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bot_user_links_platform_user_idx
  on public.bot_user_links(platform, platform_user_id);

create index if not exists bot_user_links_profile_idx
  on public.bot_user_links(profile_id);

alter table public.bot_user_links enable row level security;
create table if not exists public.quick_add_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quick_add_templates_profile_name_idx
  on public.quick_add_templates(profile_id, name);

alter table public.quick_add_templates enable row level security;
-- Add sheet_full_img column to profiles table
-- This stores the full QR image URL for Google Sheets
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS sheet_full_img TEXT;
-- Add toggle fields for sheet sync behavior per person
-- This replaces the hardcoded ANH_SCRIPT environment variable approach

alter table "public"."profiles" 
  add column if not exists "sheet_show_bank_account" boolean default false;

alter table "public"."profiles" 
  add column if not exists "sheet_show_qr_image" boolean default false;

comment on column "public"."profiles"."sheet_show_bank_account" is 
  'When true, sends bank account display to Google Sheet at L6:N6 (merged cells)';

comment on column "public"."profiles"."sheet_show_qr_image" is 
  'When true, sends QR image URL to Google Sheet at cell L6';
-- Add RLS policies for quick_add_templates table
-- Allow users to manage their own templates
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "quick_add_templates_select_own" ON public.quick_add_templates;
DROP POLICY IF EXISTS "quick_add_templates_insert_own" ON public.quick_add_templates;
DROP POLICY IF EXISTS "quick_add_templates_update_own" ON public.quick_add_templates;
DROP POLICY IF EXISTS "quick_add_templates_delete_own" ON public.quick_add_templates;
-- Create policies
CREATE POLICY "quick_add_templates_select_own" ON public.quick_add_templates FOR
SELECT USING (auth.uid() = profile_id);
CREATE POLICY "quick_add_templates_insert_own" ON public.quick_add_templates FOR
INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "quick_add_templates_update_own" ON public.quick_add_templates FOR
UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "quick_add_templates_delete_own" ON public.quick_add_templates FOR DELETE USING (auth.uid() = profile_id);
-- Enable RLS
ALTER TABLE public.quick_add_templates ENABLE ROW LEVEL SECURITY;
-- Seed common Bank Mappings if not exist
-- Remove duplicates (keep latest updated_at)
DELETE FROM "public"."bank_mappings" a USING "public"."bank_mappings" b
WHERE a.id < b.id
    AND a.bank_code = b.bank_code;
-- Add unique constraint if not exists
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bank_mappings_bank_code_key'
) THEN
ALTER TABLE "public"."bank_mappings"
ADD CONSTRAINT "bank_mappings_bank_code_key" UNIQUE ("bank_code");
END IF;
END $$;
INSERT INTO "public"."bank_mappings" (
        "bank_code",
        "bank_name",
        "short_name",
        "updated_at"
    )
VALUES (
        'VCB',
        'Ngân hàng TMCP Ngoại Thương Việt Nam',
        'Vietcombank',
        NOW()
    ),
    (
        'BIDV',
        'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
        'BIDV',
        NOW()
    ),
    (
        'CTG',
        'Ngân hàng TMCP Công Thương Việt Nam',
        'VietinBank',
        NOW()
    ),
    (
        'VBA',
        'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
        'Agribank',
        NOW()
    ),
    (
        'VPB',
        'Ngân hàng TMCP Việt Nam Thịnh Vượng',
        'VPBank',
        NOW()
    ),
    ('MB', 'Ngân hàng TMCP Quân Đội', 'MBBank', NOW()),
    (
        'TCB',
        'Ngân hàng TMCP Kỹ Thương Việt Nam',
        'Techcombank',
        NOW()
    ),
    ('ACB', 'Ngân hàng TMCP Á Châu', 'ACB', NOW()),
    (
        'VIB',
        'Ngân hàng TMCP Quốc tế Việt Nam',
        'VIB',
        NOW()
    ),
    (
        'STB',
        'Ngân hàng TMCP Sài Gòn Thương Tín',
        'Sacombank',
        NOW()
    ),
    (
        'TPB',
        'Ngân hàng TMCP Tiên Phong',
        'TPBank',
        NOW()
    ) ON CONFLICT ("bank_code") DO NOTHING;
-- Add bank_type column to batches table
ALTER TABLE "public"."batches"
ADD COLUMN IF NOT EXISTS "bank_type" text NOT NULL DEFAULT 'VIB';
-- Add check constraint for allowed bank types (optional but good practice)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'batches_bank_type_check'
) THEN
ALTER TABLE "public"."batches"
ADD CONSTRAINT "batches_bank_type_check" CHECK ("bank_type" IN ('VIB', 'MBB'));
END IF;
END $$;
-- Add funding_transaction_id column to batches table if it doesn't exist
ALTER TABLE "public"."batches" 
ADD COLUMN IF NOT EXISTS "funding_transaction_id" uuid REFERENCES "public"."transactions"("id") ON DELETE SET NULL;
-- Add sheet_name column to batches table
ALTER TABLE "public"."batches" 
ADD COLUMN IF NOT EXISTS "sheet_name" text;
-- Add display_name column to batches table to distinguish from sheet_name (which is used for Google Script)
ALTER TABLE "public"."batches" 
ADD COLUMN IF NOT EXISTS "display_name" text;
-- Migration to add receiver_name to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_number TEXT;
-- Add bank_type column to bank_mappings table
ALTER TABLE "public"."bank_mappings"
ADD COLUMN IF NOT EXISTS "bank_type" TEXT DEFAULT 'VIB';
-- Drop old unique constraint on bank_code
ALTER TABLE "public"."bank_mappings" DROP CONSTRAINT IF EXISTS "bank_mappings_bank_code_key";
-- Add composite unique constraint on (bank_code, bank_type)
-- Add composite unique constraint on (bank_code, bank_type)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bank_mappings_bank_code_bank_type_key'
) THEN
ALTER TABLE "public"."bank_mappings"
ADD CONSTRAINT "bank_mappings_bank_code_bank_type_key" UNIQUE ("bank_code", "bank_type");
END IF;
END $$;
-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_bank_mappings_bank_type ON "public"."bank_mappings" ("bank_type");
-- Seed MBB-specific bank mappings
-- Format: Name (Code) for MBB
INSERT INTO "public"."bank_mappings" (
        "bank_code",
        "bank_name",
        "short_name",
        "bank_type",
        "updated_at"
    )
VALUES (
        'VBA',
        'Nông nghiệp và Phát triển nông thôn',
        'Agribank',
        'MBB',
        NOW()
    ),
    (
        'VCB',
        'Ngoại thương Việt Nam',
        'Vietcombank',
        'MBB',
        NOW()
    ),
    (
        'BIDV',
        'Đầu tư và phát triển',
        'BIDV',
        'MBB',
        NOW()
    ),
    (
        'CTG',
        'Công Thương Việt Nam',
        'VietinBank',
        'MBB',
        NOW()
    ),
    (
        'VPB',
        'Việt Nam Thịnh Vượng',
        'VPBank',
        'MBB',
        NOW()
    ),
    ('VIB', 'Quốc tế', 'VIB', 'MBB', NOW()),
    (
        'EIB',
        'Xuất nhập khẩu',
        'Eximbank',
        'MBB',
        NOW()
    ),
    ('SHB', 'Sài Gòn Hà Nội', 'SHB', 'MBB', NOW()),
    ('TPB', 'Tiên Phong', 'TPBank', 'MBB', NOW()) ON CONFLICT ("bank_code", "bank_type") DO
UPDATE
SET "bank_name" = EXCLUDED."bank_name",
    "short_name" = EXCLUDED."short_name",
    "updated_at" = NOW();
-- Seed VIB-specific bank mappings (all common banks)
-- Format: Code - Name for VIB
INSERT INTO "public"."bank_mappings" (
        "bank_code",
        "bank_name",
        "short_name",
        "bank_type",
        "updated_at"
    )
VALUES (
        'VCB',
        'Ngân hàng TMCP Ngoại Thương Việt Nam',
        'Vietcombank',
        'VIB',
        NOW()
    ),
    (
        'BIDV',
        'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
        'BIDV',
        'VIB',
        NOW()
    ),
    (
        'CTG',
        'Ngân hàng TMCP Công Thương Việt Nam',
        'VietinBank',
        'VIB',
        NOW()
    ),
    (
        'VBA',
        'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
        'Agribank',
        'VIB',
        NOW()
    ),
    (
        'VPB',
        'Ngân hàng TMCP Việt Nam Thịnh Vượng',
        'VPBank',
        'VIB',
        NOW()
    ),
    (
        'MB',
        'Ngân hàng TMCP Quân Đội',
        'MBBank',
        'VIB',
        NOW()
    ),
    (
        'TCB',
        'Ngân hàng TMCP Kỹ Thương Việt Nam',
        'Techcombank',
        'VIB',
        NOW()
    ),
    (
        'ACB',
        'Ngân hàng TMCP Á Châu',
        'ACB',
        'VIB',
        NOW()
    ),
    (
        'VIB',
        'Ngân hàng TMCP Quốc tế Việt Nam',
        'VIB',
        'VIB',
        NOW()
    ),
    (
        'STB',
        'Ngân hàng TMCP Sài Gòn Thương Tín',
        'Sacombank',
        'VIB',
        NOW()
    ),
    (
        'TPB',
        'Ngân hàng TMCP Tiên Phong',
        'TPBank',
        'VIB',
        NOW()
    ),
    (
        'SHB',
        'Ngân hàng TMCP Sài Gòn - Hà Nội',
        'SHB',
        'VIB',
        NOW()
    ),
    (
        'EIB',
        'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam',
        'Eximbank',
        'VIB',
        NOW()
    ),
    (
        'MSB',
        'Ngân hàng TMCP Hàng Hải Việt Nam',
        'MSB',
        'VIB',
        NOW()
    ),
    (
        'OCB',
        'Ngân hàng TMCP Phương Đông',
        'OCB',
        'VIB',
        NOW()
    ),
    (
        'SEA',
        'Ngân hàng TMCP Đông Nam Á',
        'SeABank',
        'VIB',
        NOW()
    ),
    (
        'NAB',
        'Ngân hàng TMCP Nam Á',
        'NamABank',
        'VIB',
        NOW()
    ),
    (
        'VAB',
        'Ngân hàng TMCP Việt Á',
        'VietABank',
        'VIB',
        NOW()
    ),
    (
        'PGB',
        'Ngân hàng TMCP Xăng dầu Petrolimex',
        'PGBank',
        'VIB',
        NOW()
    ),
    (
        'BAB',
        'Ngân hàng TMCP Bắc Á',
        'BacABank',
        'VIB',
        NOW()
    ) ON CONFLICT ("bank_code", "bank_type") DO
UPDATE
SET "bank_name" = EXCLUDED."bank_name",
    "short_name" = EXCLUDED."short_name",
    "updated_at" = NOW();
-- Add per-cycle toggle overrides to person_cycle_sheets
-- These allow individual cycles to override the master settings from profiles table
ALTER TABLE person_cycle_sheets
ADD COLUMN IF NOT EXISTS show_bank_account BOOLEAN DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS show_qr_image BOOLEAN DEFAULT NULL;
-- Add comments explaining the inheritance behavior
COMMENT ON COLUMN person_cycle_sheets.show_bank_account IS 'Per-cycle override for showing bank account. NULL = inherit from profiles.sheet_show_bank_account, TRUE/FALSE = override master setting';
COMMENT ON COLUMN person_cycle_sheets.show_qr_image IS 'Per-cycle override for sending QR image. NULL = inherit from profiles.sheet_show_qr_image, TRUE/FALSE = override master setting';
-- Create index for faster lookups when checking cycle settings
CREATE INDEX IF NOT EXISTS idx_person_cycle_sheets_person_cycle ON person_cycle_sheets(person_id, cycle_tag);
-- Add bot status tracking columns to subscriptions table
-- Track last distribution, next distribution, and status
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_distribution_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_distribution_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS distribution_status TEXT DEFAULT 'pending';
-- Add comments explaining the columns
COMMENT ON COLUMN subscriptions.last_distribution_date IS 'Timestamp of last successful distribution';
COMMENT ON COLUMN subscriptions.next_distribution_date IS 'Calculated next distribution date based on due_day (next month)';
COMMENT ON COLUMN subscriptions.distribution_status IS 'Distribution status: pending (not run yet), completed (successful), failed (error occurred)';
-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_distribution_status ON subscriptions(distribution_status, next_distribution_date)
WHERE is_active = true;
-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_distribution ON subscriptions(next_distribution_date)
WHERE is_active = true
    AND distribution_status = 'pending';
-- Create RPC function to get year cashback summary matrix
CREATE OR REPLACE FUNCTION get_year_cashback_summary(year_input int) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE result JSONB;
BEGIN WITH parsed_cycles AS (
    SELECT c.id,
        c.account_id,
        c.cycle_tag,
        c.real_awarded,
        c.spent_amount,
        CASE
            -- YYYY-MM
            WHEN c.cycle_tag ~ '^\d{4}-\d{2}$' THEN substring(c.cycle_tag, 1, 4)::int -- MONYY
            WHEN c.cycle_tag ~ '^[A-Z]{3}\d{2}$' THEN ('20' || substring(c.cycle_tag, 4, 2))::int
            ELSE NULL
        END as cycle_year,
        CASE
            -- YYYY-MM
            WHEN c.cycle_tag ~ '^\d{4}-\d{2}$' THEN substring(c.cycle_tag, 6, 2)::int -- MONYY
            WHEN c.cycle_tag ~ '^[A-Z]{3}\d{2}$' THEN CASE
                substring(c.cycle_tag, 1, 3)
                WHEN 'JAN' THEN 1
                WHEN 'FEB' THEN 2
                WHEN 'MAR' THEN 3
                WHEN 'APR' THEN 4
                WHEN 'MAY' THEN 5
                WHEN 'JUN' THEN 6
                WHEN 'JUL' THEN 7
                WHEN 'AUG' THEN 8
                WHEN 'SEP' THEN 9
                WHEN 'OCT' THEN 10
                WHEN 'NOV' THEN 11
                WHEN 'DEC' THEN 12
                ELSE 0
            END
            ELSE NULL
        END as cycle_month
    FROM cashback_cycles c
),
cycle_estimates AS (
    SELECT e.cycle_id,
        SUM(
            COALESCE((e.metadata->>'cashback_amount')::numeric, 0)
        ) as estimated_amount
    FROM cashback_entries e
    WHERE e.metadata->>'cashback_amount' IS NOT NULL
    GROUP BY e.cycle_id
),
aggregated_cycles AS (
    SELECT pc.account_id,
        pc.cycle_month,
        COALESCE(ce.estimated_amount, 0) as estimated,
        COALESCE(pc.real_awarded, 0) as real_val
    FROM parsed_cycles pc
        LEFT JOIN cycle_estimates ce ON ce.cycle_id = pc.id
    WHERE pc.cycle_year = year_input
),
account_stats AS (
    SELECT a.id,
        a.name,
        a.image_url,
        COALESCE(a.annual_fee, 0) as annual_fee,
        COALESCE(SUM(ac.real_val), 0) as total_real
    FROM accounts a
        LEFT JOIN aggregated_cycles ac ON ac.account_id = a.id
    WHERE a.is_active = true
    GROUP BY a.id,
        a.name,
        a.image_url,
        a.annual_fee
),
json_output AS (
    SELECT ast.id,
        ast.name,
        ast.image_url,
        ast.annual_fee,
        ast.total_real,
        (ast.total_real - ast.annual_fee) as profit,
        COALESCE(
            (
                SELECT jsonb_object_agg(
                        ac.cycle_month,
                        jsonb_build_object(
                            'estimated',
                            ac.estimated,
                            'real',
                            ac.real_val
                        )
                    )
                FROM aggregated_cycles ac
                WHERE ac.account_id = ast.id
            ),
            '{}'::jsonb
        ) as months
    FROM account_stats ast
    ORDER BY ast.name
)
SELECT jsonb_agg(row_to_json(jo)) INTO result
FROM json_output jo;
RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
-- Make account_id nullable to support virtual debt transactions
ALTER TABLE "public"."transactions"
ALTER COLUMN "account_id" DROP NOT NULL;
-- Add image_url column to profiles table if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'image_url'
) THEN
ALTER TABLE profiles
ADD COLUMN image_url TEXT;
END IF;
END $$;
-- Migration: Fix persisted_cycle_tag data integrity issue
-- Created: 2026-01-11
-- Issue: Some transactions have tag='2025-12' but persisted_cycle_tag='2025-11'
-- This causes wrong data to display when filtering by cycle (e.g., clicking DEC 25 shows NOV 2025 data)
-- Update persisted_cycle_tag to match tag for all transactions where they don't match
UPDATE transactions
SET persisted_cycle_tag = tag
WHERE persisted_cycle_tag IS NOT NULL
    AND persisted_cycle_tag != tag
    AND tag ~ '^\d{4}-\d{2}$';
-- Only update if tag is in YYYY-MM format
-- Verify the fix (should return 0 rows after migration)
-- SELECT 
--     id,
--     note,
--     tag,
--     persisted_cycle_tag,
--     occurred_at
-- FROM transactions
-- WHERE persisted_cycle_tag IS NOT NULL
--   AND persisted_cycle_tag != tag
-- ORDER BY occurred_at DESC
-- LIMIT 20;
-- Rename avatar_url to image_url in profiles table
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'avatar_url'
) THEN
ALTER TABLE profiles
    RENAME COLUMN avatar_url TO image_url;
END IF;
END $$;
-- Force schema cache reload by touching the schema
-- 1. Ensure permissions are correct (Renaming sometimes drops grants)
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON TABLE public.people TO anon,
    authenticated,
    service_role;
-- 2. Ensure RLS is enabled (good practice)
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
-- 3. Create a dummy policy if none exists (just to be safe, though existing ones should persist)
-- Check if policies exist first? simpler to just re-apply or ensure open access if that was the intent.
-- Assuming "people" behaves like "profiles" did.
-- 4. Force a DDL change to trigger PostgREST schema reload reliably
COMMENT ON TABLE public.people IS 'People profiles (renamed from profiles)';
-- 5. Explicit Reload Command
NOTIFY pgrst,
'reload schema';
NOTIFY pgrst,
'reload schema';
-- Rename table 'profiles' to 'people'
ALTER TABLE IF EXISTS "public"."profiles"
    RENAME TO "people";
-- Rename column 'avatar_url' to 'image_url' in 'people' table
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'people'
        AND column_name = 'avatar_url'
) THEN
ALTER TABLE "public"."people"
    RENAME COLUMN "avatar_url" TO "image_url";
END IF;
END $$;
-- Update RLS Policies (Fix references to 'profiles')
-- Note: PostgreSQL usually handles table renaming in policies automatically, 
-- but we should check if any raw SQL strings or functions rely on it.
-- This part is a safety check or explicit update if needed. 
-- Re-creating views or triggers if they rely on text, but usually simple rename is safe.
-- We will proceed with simple renames as requested.
