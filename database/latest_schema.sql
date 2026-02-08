-- Money Flow 3 - Latest Database Schema (Post-Phase 75)
-- Generation Date: 2026-02-08
-- Purpose: Unified SQL schema for agent reference and local database setup.
-- 1. ENUM TYPES
--------------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE public.account_type AS ENUM (
    'bank',
    'credit_card',
    'e_wallet',
    'receivable',
    'debt',
    'savings',
    'investment',
    'asset'
);
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense',
    'transfer',
    'debt',
    'repayment'
);
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- 2. CORE TABLES
--------------------------------------------------------------------------------
-- People Table (formerly profiles)
CREATE TABLE IF NOT EXISTS public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'debtor',
    -- 'debtor', 'creditor', 'family', 'owner'
    is_group BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_owner BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    google_sheet_url TEXT,
    group_parent_id UUID REFERENCES public.people(id),
    sheet_full_img TEXT,
    sheet_show_bank_account BOOLEAN DEFAULT true,
    sheet_show_qr_image BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id)
);
-- Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type public.account_type NOT NULL,
    currency TEXT DEFAULT 'VND',
    current_balance DECIMAL(15, 2) DEFAULT 0,
    credit_limit DECIMAL(15, 2),
    owner_id UUID REFERENCES public.people(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Configs
    cashback_config JSONB,
    cashback_config_version INTEGER DEFAULT 1,
    secured_by_account_id UUID REFERENCES public.accounts(id),
    parent_account_id UUID REFERENCES public.accounts(id),
    -- Metadata
    annual_fee DECIMAL(15, 2) DEFAULT 0,
    annual_fee_waiver_target DECIMAL(15, 2),
    account_number TEXT,
    receiver_name TEXT,
    total_in DECIMAL(15, 2) DEFAULT 0,
    total_out DECIMAL(15, 2) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id)
);
-- Shops Table
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    category TEXT,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);
-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT,
    image_url TEXT,
    type TEXT DEFAULT 'expense',
    -- 'income', 'expense'
    parent_id UUID REFERENCES public.categories(id),
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);
-- Cashback Cycles Table
CREATE TABLE IF NOT EXISTS public.cashback_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    cycle_tag TEXT NOT NULL,
    -- Format: 'YYYY-MM'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    max_budget DECIMAL(15, 2),
    min_spend_target DECIMAL(15, 2),
    spent_amount DECIMAL(15, 2) DEFAULT 0,
    real_awarded DECIMAL(15, 2) DEFAULT 0,
    virtual_profit DECIMAL(15, 2) DEFAULT 0,
    met_min_spend BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    UNIQUE(account_id, cycle_tag)
);
-- Transactions Table (The Source of Truth)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type public.transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    final_price DECIMAL(15, 2),
    -- Calculated via trigger
    cashback_amount DECIMAL(15, 2) DEFAULT 0,
    -- Relationships
    account_id UUID REFERENCES public.accounts(id),
    target_account_id UUID REFERENCES public.accounts(id),
    -- For transfers
    person_id UUID REFERENCES public.people(id),
    -- For debts/repayments
    category_id UUID REFERENCES public.categories(id),
    shop_id UUID REFERENCES public.shops(id),
    -- Metadata & Status
    note TEXT,
    status TEXT DEFAULT 'posted',
    -- 'posted', 'void', 'pending'
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}',
    tag TEXT,
    -- Custom tag or cycle tag
    persisted_cycle_tag TEXT,
    -- Installment logic
    is_installment BOOLEAN DEFAULT false,
    parent_transaction_id UUID REFERENCES public.transactions(id),
    -- Linking logic (Refunds/Void Trio)
    linked_transaction_id UUID REFERENCES public.transactions(id),
    -- Cashback Mode
    cashback_mode TEXT,
    -- 'auto', 'voluntary', 'real_fixed'
    cashback_share_percent DECIMAL(5, 4) DEFAULT 0,
    cashback_share_fixed DECIMAL(15, 2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    user_id UUID REFERENCES auth.users(id)
);
-- Transaction History (Snapshots)
CREATE TABLE IF NOT EXISTS public.transaction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now(),
    changed_by UUID REFERENCES auth.users(id)
);
-- Subscriptions Table (Services)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'VND',
    cycle_interval INTEGER DEFAULT 1,
    next_billing_date DATE,
    shop_id UUID REFERENCES public.shops(id),
    default_category_id UUID REFERENCES public.categories(id),
    is_active BOOLEAN DEFAULT true,
    max_slots INTEGER,
    last_distribution_date TIMESTAMPTZ,
    next_distribution_date TIMESTAMPTZ,
    distribution_status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);
-- Service Members Table
CREATE TABLE IF NOT EXISTS public.service_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
    slots INTEGER DEFAULT 1,
    is_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Batch Import Tables
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source TEXT,
    account_id UUID REFERENCES public.accounts(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    matched_transaction_id UUID REFERENCES public.transactions(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 3. INDEXES
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON public.transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_person_id ON public.transactions(person_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON public.batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_cashback_cycles_tag ON public.cashback_cycles(account_id, cycle_tag);