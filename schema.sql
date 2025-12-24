-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
CREATE TABLE public.accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type USER - DEFINED NOT NULL,
    currency text DEFAULT 'VND'::text,
    credit_limit numeric DEFAULT 0,
    current_balance numeric DEFAULT 0,
    owner_id uuid,
    cashback_config jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    secured_by_account_id uuid,
    image_url text,
    parent_account_id uuid,
    total_in numeric DEFAULT 0,
    total_out numeric DEFAULT 0,
    annual_fee numeric DEFAULT 0,
    cashback_config_version integer NOT NULL DEFAULT 1,
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT accounts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
    CONSTRAINT accounts_secured_by_account_id_fkey FOREIGN KEY (secured_by_account_id) REFERENCES public.accounts(id),
    CONSTRAINT accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.auth_users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text UNIQUE,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT auth_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bank_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bank_code text NOT NULL UNIQUE,
    bank_name text NOT NULL,
    short_name text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bank_mappings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.batch_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    batch_id uuid,
    receiver_name text,
    target_account_id uuid,
    amount numeric NOT NULL,
    note text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    bank_name text,
    bank_number text,
    card_name text,
    transaction_id uuid,
    is_confirmed boolean,
    CONSTRAINT batch_items_pkey PRIMARY KEY (id),
    CONSTRAINT batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id),
    CONSTRAINT batch_items_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.batches (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    source_account_id uuid,
    sheet_link text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sheet_name text,
    display_link text,
    status text,
    is_template boolean,
    auto_clone_day integer,
    last_cloned_month_tag text,
    CONSTRAINT batches_pkey PRIMARY KEY (id),
    CONSTRAINT batches_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.bot_configs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    name text,
    description text,
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    last_run_at timestamp with time zone,
    last_run_status text,
    last_run_log text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    is_enabled boolean DEFAULT false,
    CONSTRAINT bot_configs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cashback_cycles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    account_id uuid NOT NULL,
    cycle_tag text NOT NULL,
    max_budget numeric DEFAULT 0,
    min_spend_target numeric DEFAULT 0,
    spent_amount numeric DEFAULT 0,
    real_awarded numeric DEFAULT 0,
    virtual_profit numeric DEFAULT 0,
    overflow_loss numeric DEFAULT 0,
    is_exhausted boolean DEFAULT false,
    met_min_spend boolean DEFAULT false,
    CONSTRAINT cashback_cycles_pkey PRIMARY KEY (id),
    CONSTRAINT cashback_cycles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.cashback_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    cycle_id uuid,
    account_id uuid NOT NULL,
    transaction_id uuid,
    mode text NOT NULL CHECK (
        mode = ANY (
            ARRAY ['real'::text, 'virtual'::text, 'voluntary'::text]
        )
    ),
    amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0::numeric),
    counts_to_budget boolean DEFAULT false,
    note text,
    metadata jsonb,
    CONSTRAINT cashback_entries_pkey PRIMARY KEY (id),
    CONSTRAINT cashback_entries_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.cashback_cycles(id),
    CONSTRAINT cashback_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
    CONSTRAINT cashback_entries_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.cashback_profits (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    account_id uuid NOT NULL,
    transaction_id uuid,
    amount numeric NOT NULL,
    is_redeemed boolean DEFAULT false,
    note text,
    CONSTRAINT cashback_profits_pkey PRIMARY KEY (id),
    CONSTRAINT cashback_profits_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
    CONSTRAINT cashback_profits_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL,
    icon text,
    mcc_codes ARRAY,
    image_url text,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.installments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    original_transaction_id uuid,
    owner_id uuid NOT NULL,
    debtor_id uuid,
    name text NOT NULL,
    total_amount numeric NOT NULL,
    conversion_fee numeric DEFAULT 0,
    term_months integer NOT NULL,
    monthly_amount numeric NOT NULL,
    start_date date NOT NULL,
    remaining_amount numeric NOT NULL,
    next_due_date date,
    status USER - DEFINED DEFAULT 'active'::installment_status,
    type USER - DEFINED DEFAULT 'credit_card'::installment_type,
    CONSTRAINT installments_pkey PRIMARY KEY (id),
    CONSTRAINT installments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
    CONSTRAINT installments_debtor_id_fkey FOREIGN KEY (debtor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    email text,
    role text DEFAULT 'member'::text,
    is_group boolean DEFAULT false,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    sheet_link text,
    is_owner boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    google_sheet_url text,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    service_id uuid,
    profile_id uuid,
    slots integer DEFAULT 1,
    is_owner boolean DEFAULT false,
    CONSTRAINT service_members_pkey PRIMARY KEY (id),
    CONSTRAINT service_members_subscription_id_fkey FOREIGN KEY (service_id) REFERENCES public.subscriptions(id),
    CONSTRAINT service_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.sheet_webhook_links (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    url text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT sheet_webhook_links_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shops (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    image_url text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    default_category_id uuid,
    CONSTRAINT shops_pkey PRIMARY KEY (id),
    CONSTRAINT shops_default_category_id_fkey FOREIGN KEY (default_category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.subcategories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    category_id uuid,
    name text NOT NULL,
    pl_type USER - DEFINED DEFAULT 'normal'::pl_type,
    CONSTRAINT subcategories_pkey PRIMARY KEY (id),
    CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    price numeric NOT NULL,
    currency text DEFAULT 'VND'::text,
    cycle_interval integer DEFAULT 1,
    next_billing_date date,
    shop_id uuid,
    default_category_id uuid,
    note_template text DEFAULT 'Auto: {name} {date}'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    max_slots integer,
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id),
    CONSTRAINT subscriptions_default_category_id_fkey FOREIGN KEY (default_category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.transaction_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    transaction_id uuid,
    changed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    changed_by uuid,
    change_type text,
    snapshot_before jsonb,
    diff_note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT transaction_history_pkey PRIMARY KEY (id),
    CONSTRAINT transaction_history_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    occurred_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    amount numeric NOT NULL,
    type text NOT NULL,
    note text,
    account_id uuid,
    target_account_id uuid,
    category_id uuid,
    person_id uuid,
    shop_id uuid,
    tag text,
    linked_transaction_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'posted'::text,
    created_by uuid,
    is_installment boolean DEFAULT false,
    installment_plan_id uuid,
    persisted_cycle_tag text,
    cashback_share_percent numeric DEFAULT 0,
    cashback_share_fixed numeric DEFAULT 0,
    original_amount numeric,
    final_price numeric,
    cashback_mode text,
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
    CONSTRAINT transactions_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(id),
    CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
    CONSTRAINT transactions_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.profiles(id),
    CONSTRAINT transactions_shop_id_fkey1 FOREIGN KEY (shop_id) REFERENCES public.shops(id),
    CONSTRAINT transactions_created_by_fkey1 FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT transactions_installment_plan_id_fkey1 FOREIGN KEY (installment_plan_id) REFERENCES public.installments(id)
);
CREATE TABLE public.transactions_old (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    occurred_at date NOT NULL DEFAULT CURRENT_DATE,
    note text,
    status USER - DEFINED DEFAULT 'posted'::transaction_status,
    linked_transaction_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by uuid,
    tag text,
    shop_id uuid,
    cashback_cycle_tag text,
    persisted_cycle_tag text,
    refund_status USER - DEFINED DEFAULT 'none'::refund_status_type,
    refunded_amount numeric DEFAULT 0,
    metadata jsonb,
    installment_plan_id uuid,
    is_installment boolean DEFAULT false,
    CONSTRAINT transactions_old_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_linked_transaction_id_fkey FOREIGN KEY (linked_transaction_id) REFERENCES public.transactions_old(id),
    CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    CONSTRAINT transactions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id),
    CONSTRAINT transactions_installment_plan_id_fkey FOREIGN KEY (installment_plan_id) REFERENCES public.installments(id)
);
CREATE TABLE public.user_settings (
    key text NOT NULL,
    user_id uuid NOT NULL DEFAULT auth.uid(),
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_settings_pkey PRIMARY KEY (user_id, key),
    CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);