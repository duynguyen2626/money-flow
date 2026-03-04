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
    receiver_name text,
    account_number text,
    annual_fee_waiver_target numeric DEFAULT NULL::numeric,
    cb_type text DEFAULT 'none'::text CHECK (
        cb_type = ANY (
            ARRAY ['none'::text, 'simple'::text, 'tiered'::text]
        )
    ),
    cb_base_rate numeric DEFAULT 0,
    cb_max_budget numeric,
    cb_is_unlimited boolean DEFAULT false,
    cb_rules_json jsonb,
    statement_day integer,
    due_date integer,
    cb_min_spend numeric DEFAULT 0,
    cb_cycle_type text DEFAULT 'calendar_month'::text CHECK (
        cb_cycle_type = ANY (
            ARRAY ['calendar_month'::text, 'statement_cycle'::text]
        )
    ),
    holder_type text DEFAULT 'me'::text CHECK (
        holder_type = ANY (
            ARRAY ['me'::text, 'relative'::text, 'other'::text]
        )
    ),
    holder_person_id uuid,
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT accounts_holder_person_id_fkey FOREIGN KEY (holder_person_id) REFERENCES public.people(id),
    CONSTRAINT accounts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.people(id),
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
    bank_code text NOT NULL,
    bank_name text NOT NULL,
    short_name text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    bank_type text DEFAULT 'VIB'::text,
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
    is_installment_payment boolean DEFAULT false,
    master_item_id uuid,
    bank_code text,
    CONSTRAINT batch_items_pkey PRIMARY KEY (id),
    CONSTRAINT batch_items_master_item_id_fkey FOREIGN KEY (master_item_id) REFERENCES public.batch_master_items(id),
    CONSTRAINT batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id),
    CONSTRAINT batch_items_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.batch_master_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bank_type text NOT NULL CHECK (
        bank_type = ANY (ARRAY ['MBB'::text, 'VIB'::text])
    ),
    receiver_name text NOT NULL,
    bank_number text NOT NULL,
    bank_name text NOT NULL,
    target_account_id uuid,
    cutoff_period text NOT NULL CHECK (
        cutoff_period = ANY (ARRAY ['before'::text, 'after'::text])
    ),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    category_id uuid,
    default_note text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    bank_code text,
    CONSTRAINT batch_master_items_pkey PRIMARY KEY (id),
    CONSTRAINT batch_master_items_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(id),
    CONSTRAINT batch_master_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.batch_phases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bank_type text NOT NULL CHECK (
        bank_type = ANY (ARRAY ['MBB'::text, 'VIB'::text])
    ),
    label text NOT NULL,
    period_type text NOT NULL CHECK (
        period_type = ANY (ARRAY ['before'::text, 'after'::text])
    ),
    cutoff_day integer NOT NULL CHECK (
        cutoff_day >= 1
        AND cutoff_day <= 31
    ),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT batch_phases_pkey PRIMARY KEY (id)
);
CREATE TABLE public.batch_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bank_type text NOT NULL UNIQUE CHECK (
        bank_type = ANY (ARRAY ['MBB'::text, 'VIB'::text])
    ),
    sheet_url text CHECK (
        sheet_url IS NULL
        OR sheet_url ~ '^https://script\.google\.com/macros/s/.+/exec$'::text
    ),
    sheet_name text,
    webhook_url text CHECK (
        webhook_url IS NULL
        OR webhook_url ~ '^https?://.+'::text
    ),
    webhook_enabled boolean DEFAULT false,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cutoff_day integer DEFAULT 15,
    display_sheet_url text,
    display_sheet_name text,
    CONSTRAINT batch_settings_pkey PRIMARY KEY (id)
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
    bank_type text NOT NULL DEFAULT 'VIB'::text CHECK (
        bank_type = ANY (ARRAY ['VIB'::text, 'MBB'::text])
    ),
    funding_transaction_id uuid,
    display_name text,
    month_year text,
    cloned_from_id uuid,
    is_archived boolean DEFAULT false,
    phase_id uuid,
    CONSTRAINT batches_pkey PRIMARY KEY (id),
    CONSTRAINT batches_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.batch_phases(id),
    CONSTRAINT batches_funding_transaction_id_fkey FOREIGN KEY (funding_transaction_id) REFERENCES public.transactions(id),
    CONSTRAINT batches_cloned_from_id_fkey FOREIGN KEY (cloned_from_id) REFERENCES public.batches(id),
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
CREATE TABLE public.bot_user_links (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    platform text NOT NULL CHECK (
        platform = ANY (ARRAY ['telegram'::text, 'slack'::text])
    ),
    platform_user_id text NOT NULL,
    profile_id uuid NOT NULL,
    state jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bot_user_links_pkey PRIMARY KEY (id),
    CONSTRAINT bot_user_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.people(id)
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
CREATE TABLE public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL,
    icon text,
    mcc_codes ARRAY,
    image_url text,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    kind text NOT NULL DEFAULT 'external'::text,
    is_archived boolean DEFAULT false,
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
    CONSTRAINT installments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.people(id),
    CONSTRAINT installments_debtor_id_fkey FOREIGN KEY (debtor_id) REFERENCES public.people(id)
);
CREATE TABLE public.people (
    id uuid NOT NULL,
    name text NOT NULL,
    email text,
    role text DEFAULT 'member'::text,
    is_group boolean DEFAULT false,
    image_url text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    sheet_link text,
    is_owner boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    google_sheet_url text,
    group_parent_id uuid,
    sheet_full_img text,
    sheet_show_bank_account boolean DEFAULT false,
    sheet_show_qr_image boolean DEFAULT false,
    sheet_bank_info text,
    sheet_linked_bank_id uuid,
    CONSTRAINT people_pkey PRIMARY KEY (id),
    CONSTRAINT people_sheet_linked_bank_id_fkey FOREIGN KEY (sheet_linked_bank_id) REFERENCES public.accounts(id),
    CONSTRAINT profiles_group_parent_id_fkey FOREIGN KEY (group_parent_id) REFERENCES public.people(id)
);
CREATE TABLE public.person_cycle_sheets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL,
    cycle_tag text NOT NULL,
    sheet_id text,
    sheet_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    show_bank_account boolean,
    show_qr_image boolean,
    CONSTRAINT person_cycle_sheets_pkey PRIMARY KEY (id),
    CONSTRAINT person_cycle_sheets_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id)
);
CREATE TABLE public.quick_add_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    name text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT quick_add_templates_pkey PRIMARY KEY (id),
    CONSTRAINT quick_add_templates_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.people(id)
);
CREATE TABLE public.service_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    service_id uuid,
    person_id uuid,
    slots integer DEFAULT 1,
    is_owner boolean DEFAULT false,
    CONSTRAINT service_members_pkey PRIMARY KEY (id),
    CONSTRAINT service_members_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id),
    CONSTRAINT service_members_subscription_id_fkey FOREIGN KEY (service_id) REFERENCES public.subscriptions(id)
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
    is_archived boolean DEFAULT false,
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
    last_distribution_date timestamp with time zone,
    next_distribution_date timestamp with time zone,
    distribution_status text DEFAULT 'pending'::text,
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
    parent_transaction_id uuid,
    debt_cycle_tag text,
    statement_cycle_tag text,
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_parent_transaction_id_fkey FOREIGN KEY (parent_transaction_id) REFERENCES public.transactions(id),
    CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
    CONSTRAINT transactions_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(id),
    CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
    CONSTRAINT transactions_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id),
    CONSTRAINT transactions_shop_id_fkey1 FOREIGN KEY (shop_id) REFERENCES public.shops(id),
    CONSTRAINT transactions_created_by_fkey1 FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT transactions_installment_plan_id_fkey1 FOREIGN KEY (installment_plan_id) REFERENCES public.installments(id)
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