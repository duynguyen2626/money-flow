--
-- PostgreSQL database dump
--

\restrict nkZJPhpeK5hag2VLsqxdemfWn7NU1U2gBfBtPOJEpo9wGEj0HOMv1inMXFlhpMY

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.account_type AS ENUM (
    'bank',
    'cash',
    'credit_card',
    'ewallet',
    'debt',
    'savings',
    'investment',
    'asset',
    'system'
);


ALTER TYPE public.account_type OWNER TO postgres;

--
-- Name: installment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.installment_status AS ENUM (
    'active',
    'completed',
    'settled_early',
    'cancelled'
);


ALTER TYPE public.installment_status OWNER TO postgres;

--
-- Name: installment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.installment_type AS ENUM (
    'credit_card',
    'p2p_lending'
);


ALTER TYPE public.installment_type OWNER TO postgres;

--
-- Name: line_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.line_type AS ENUM (
    'debit',
    'credit'
);


ALTER TYPE public.line_type OWNER TO postgres;

--
-- Name: pl_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pl_type AS ENUM (
    'normal',
    'fee',
    'cashback_redeemed',
    'reversal',
    'ignore'
);


ALTER TYPE public.pl_type OWNER TO postgres;

--
-- Name: refund_status_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.refund_status_type AS ENUM (
    'none',
    'pending',
    'partial',
    'full'
);


ALTER TYPE public.refund_status_type OWNER TO postgres;

--
-- Name: transaction_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transaction_status AS ENUM (
    'posted',
    'pending',
    'void',
    'waiting_refund',
    'refunded',
    'completed'
);


ALTER TYPE public.transaction_status OWNER TO postgres;

--
-- Name: calculate_cycle_start(timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_cycle_start(transaction_date timestamp with time zone, statement_day integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    txn_day int;
    cycle_start date;
BEGIN
    -- Lấy ngày trong tháng của giao dịch
    txn_day := EXTRACT(DAY FROM transaction_date);
    
    -- Logic: 
    -- Nếu ngày giao dịch >= ngày sao kê => Chu kỳ bắt đầu từ ngày sao kê tháng ĐÓ.
    -- Nếu ngày giao dịch < ngày sao kê => Chu kỳ bắt đầu từ ngày sao kê tháng TRƯỚC.
    IF txn_day >= statement_day THEN
        cycle_start := make_date(
            EXTRACT(YEAR FROM transaction_date)::int,
            EXTRACT(MONTH FROM transaction_date)::int,
            statement_day
        );
    ELSE
        cycle_start := make_date(
            EXTRACT(YEAR FROM transaction_date)::int,
            EXTRACT(MONTH FROM transaction_date)::int,
            statement_day
        ) - INTERVAL '1 month';
    END IF;

    -- Trả về định dạng chuẩn ISO YYYY-MM-DD
    RETURN to_char(cycle_start, 'YYYY-MM-DD');
END;
$$;


ALTER FUNCTION public.calculate_cycle_start(transaction_date timestamp with time zone, statement_day integer) OWNER TO postgres;

--
-- Name: check_batch_completion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_batch_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status = 'confirmed') THEN
        -- Kiểm tra còn item nào chưa confirm không
        IF NOT EXISTS (SELECT 1 FROM public.batch_items WHERE batch_id = NEW.batch_id AND status != 'confirmed') THEN
            UPDATE public.batches SET status = 'completed' WHERE id = NEW.batch_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.check_batch_completion() OWNER TO postgres;

--
-- Name: get_debt_by_tags(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_debt_by_tags(person_uuid uuid) RETURNS TABLE(tag text, net_balance numeric, original_principal numeric, total_back numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tag,
        -- Chỉ cộng dồn các giao dịch ĐANG HOẠT ĐỘNG (Posted)
        SUM(tl.amount) as net_balance,
        SUM(COALESCE(tl.original_amount, tl.amount)) as original_principal,
        SUM(COALESCE(tl.cashback_share_fixed, 0) + (COALESCE(tl.original_amount, tl.amount) * COALESCE(tl.cashback_share_percent, 0))) as total_back
    FROM 
        public.transaction_lines tl
    JOIN 
        public.transactions t ON tl.transaction_id = t.id
    JOIN
        public.accounts a ON tl.account_id = a.id
    WHERE 
        a.owner_id = person_uuid -- Tìm các dòng thuộc tài khoản nợ của người này
        AND a.type = 'debt'
        AND t.status = 'posted' -- <--- QUAN TRỌNG NHẤT: Loại bỏ Void/Waiting
    GROUP BY 
        t.tag
    HAVING 
        SUM(tl.amount) != 0 -- Chỉ hiện các tag còn nợ
    ORDER BY 
        t.tag DESC;
END;
$$;


ALTER FUNCTION public.get_debt_by_tags(person_uuid uuid) OWNER TO postgres;

--
-- Name: recalculate_account_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recalculate_account_stats(account_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_in_val NUMERIC;
    total_out_val NUMERIC;
BEGIN
    -- Total In: Tổng tiền VÀO (Debit lines > 0)
    -- Bao gồm: Income, Transfer In, Debt Repayment, Refund Receive
    SELECT COALESCE(SUM(amount), 0) INTO total_in_val
    FROM public.transaction_lines
    WHERE account_id = account_uuid AND amount > 0;

    -- Total Out: Tổng tiền RA (Credit lines < 0)
    -- Bao gồm: Expense, Transfer Out, Debt Lending, Batch Funding
    SELECT COALESCE(SUM(amount), 0) INTO total_out_val
    FROM public.transaction_lines
    WHERE account_id = account_uuid AND amount < 0;

    -- Update
    UPDATE public.accounts
    SET 
        total_in = total_in_val,
        total_out = total_out_val,
        -- Balance = Tổng đại số (In + Out). VD: 50tr + (-20tr) = 30tr
        current_balance = (total_in_val + total_out_val) 
    WHERE id = account_uuid;
END;
$$;


ALTER FUNCTION public.recalculate_account_stats(account_uuid uuid) OWNER TO postgres;

--
-- Name: update_account_balance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_account_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Logic: Tính toán lại Balance, Total In, Total Out
    -- Chỉ tính các giao dịch đã Posted (không tính Void)
    
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        -- Xác định ID cần update (NEW hoặc OLD)
        DECLARE 
            target_id UUID;
        BEGIN
            target_id := COALESCE(NEW.account_id, OLD.account_id);
            
            IF target_id IS NOT NULL THEN
                UPDATE public.accounts
                SET 
                    current_balance = (
                        SELECT COALESCE(SUM(amount), 0)
                        FROM public.transaction_lines tl
                        JOIN public.transactions t ON tl.transaction_id = t.id
                        WHERE tl.account_id = target_id AND t.status = 'posted'
                    ),
                    total_in = (
                        SELECT COALESCE(SUM(amount), 0)
                        FROM public.transaction_lines tl
                        JOIN public.transactions t ON tl.transaction_id = t.id
                        WHERE tl.account_id = target_id AND t.status = 'posted' AND amount > 0
                    ),
                    total_out = (
                        SELECT COALESCE(SUM(amount), 0)
                        FROM public.transaction_lines tl
                        JOIN public.transactions t ON tl.transaction_id = t.id
                        WHERE tl.account_id = target_id AND t.status = 'posted' AND amount < 0
                    )
                WHERE id = target_id;
            END IF;
        END;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_account_balance() OWNER TO postgres;

--
-- Name: update_account_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_account_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Logic: Khi có Line mới, update In/Out tương ứng
    -- (Đơn giản hóa: Chỉ cộng dồn, nếu sửa/xóa thì cần logic phức tạp hơn hoặc recalculate all)
    -- Để an toàn và chính xác nhất, ta dùng phương pháp Recalculate Total từ bảng Lines
    
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        -- Lấy ID tài khoản bị ảnh hưởng
        DECLARE 
            target_id UUID;
        BEGIN
            IF (TG_OP = 'DELETE') THEN target_id := OLD.account_id;
            ELSE target_id := NEW.account_id;
            END IF;

            IF target_id IS NOT NULL THEN
                UPDATE public.accounts
                SET 
                    total_in = (
                        SELECT COALESCE(SUM(amount), 0) 
                        FROM public.transaction_lines 
                        WHERE account_id = target_id AND amount > 0
                    ),
                    total_out = (
                        SELECT COALESCE(SUM(amount), 0) 
                        FROM public.transaction_lines 
                        WHERE account_id = target_id AND amount < 0
                    )
                WHERE id = target_id;
            END IF;
        END;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_account_stats() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.account_type NOT NULL,
    currency text DEFAULT 'VND'::text,
    credit_limit numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    owner_id uuid,
    cashback_config jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    secured_by_account_id uuid,
    image_url text,
    parent_account_id uuid,
    total_in numeric(15,2) DEFAULT 0,
    total_out numeric(15,2) DEFAULT 0,
    annual_fee numeric(15,2) DEFAULT 0
);

ALTER TABLE ONLY public.accounts REPLICA IDENTITY FULL;


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: auth_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.auth_users OWNER TO postgres;

--
-- Name: bank_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_code text NOT NULL,
    bank_name text NOT NULL,
    short_name text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.bank_mappings OWNER TO postgres;

--
-- Name: batch_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batch_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    is_confirmed boolean
);


ALTER TABLE public.batch_items OWNER TO postgres;

--
-- Name: batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    last_cloned_month_tag text
);


ALTER TABLE public.batches OWNER TO postgres;

--
-- Name: bot_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bot_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text,
    description text,
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    last_run_at timestamp with time zone,
    last_run_status text,
    last_run_log text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    is_enabled boolean DEFAULT false
);


ALTER TABLE public.bot_configs OWNER TO postgres;

--
-- Name: cashback_profits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cashback_profits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    account_id uuid NOT NULL,
    transaction_id uuid,
    amount numeric NOT NULL,
    is_redeemed boolean DEFAULT false,
    note text
);


ALTER TABLE public.cashback_profits OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    icon text,
    mcc_codes text[],
    image_url text
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: installments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    status public.installment_status DEFAULT 'active'::public.installment_status,
    type public.installment_type DEFAULT 'credit_card'::public.installment_type
);


ALTER TABLE public.installments OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    email text,
    role text DEFAULT 'member'::text,
    is_group boolean DEFAULT false,
    avatar_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    sheet_link text,
    is_owner boolean DEFAULT false,
    is_archived boolean DEFAULT false
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: service_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid,
    profile_id uuid,
    slots integer DEFAULT 1,
    is_owner boolean DEFAULT false
);


ALTER TABLE public.service_members OWNER TO postgres;

--
-- Name: sheet_webhook_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sheet_webhook_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sheet_webhook_links OWNER TO postgres;

--
-- Name: shops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    default_category_id uuid
);


ALTER TABLE public.shops OWNER TO postgres;

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    pl_type public.pl_type DEFAULT 'normal'::public.pl_type
);


ALTER TABLE public.subcategories OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price numeric(15,2) NOT NULL,
    currency text DEFAULT 'VND'::text,
    cycle_interval integer DEFAULT 1,
    next_billing_date date,
    shop_id uuid,
    default_category_id uuid,
    note_template text DEFAULT 'Auto: {name} {date}'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    max_slots integer
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: transaction_lines_old; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_lines_old (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    account_id uuid,
    category_id uuid,
    subcategory_id uuid,
    amount numeric(15,2) NOT NULL,
    type public.line_type NOT NULL,
    description text,
    metadata jsonb,
    original_amount numeric(15,2),
    cashback_share_percent numeric(5,4) DEFAULT 0,
    cashback_share_fixed numeric(15,2) DEFAULT 0,
    person_id uuid,
    bank_name text,
    bank_number text,
    card_name text,
    receiver_name text
);

ALTER TABLE ONLY public.transaction_lines_old REPLICA IDENTITY FULL;


ALTER TABLE public.transaction_lines_old OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    occurred_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    amount numeric(15,2) NOT NULL,
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
    status text DEFAULT 'posted'::text
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_old; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions_old (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    occurred_at date DEFAULT CURRENT_DATE NOT NULL,
    note text,
    status public.transaction_status DEFAULT 'posted'::public.transaction_status,
    linked_transaction_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by uuid,
    tag text,
    shop_id uuid,
    cashback_cycle_tag text,
    persisted_cycle_tag text,
    refund_status public.refund_status_type DEFAULT 'none'::public.refund_status_type,
    refunded_amount numeric(15,2) DEFAULT 0,
    metadata jsonb,
    installment_plan_id uuid,
    is_installment boolean DEFAULT false
);

ALTER TABLE ONLY public.transactions_old REPLICA IDENTITY FULL;


ALTER TABLE public.transactions_old OWNER TO postgres;

--
-- Name: COLUMN transactions_old.persisted_cycle_tag; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.transactions_old.persisted_cycle_tag IS 'Lưu ngày bắt đầu chu kỳ (YYYY-MM-DD) để định danh duy nhất kỳ sao kê, tránh lỗi trùng lặp qua các năm.';


--
-- Name: view_account_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_account_stats AS
 SELECT id AS account_id,
    name,
    (COALESCE(( SELECT sum(transactions.amount) AS sum
           FROM public.transactions
          WHERE ((transactions.account_id = a.id) AND (transactions.amount > (0)::numeric))), (0)::numeric) + COALESCE(( SELECT sum(abs(transactions.amount)) AS sum
           FROM public.transactions
          WHERE (transactions.target_account_id = a.id)), (0)::numeric)) AS total_in,
    COALESCE(( SELECT sum(transactions.amount) AS sum
           FROM public.transactions
          WHERE ((transactions.account_id = a.id) AND (transactions.amount < (0)::numeric))), (0)::numeric) AS total_out
   FROM public.accounts a;


ALTER VIEW public.view_account_stats OWNER TO postgres;

--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- Name: bank_mappings bank_mappings_bank_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_mappings
    ADD CONSTRAINT bank_mappings_bank_code_key UNIQUE (bank_code);


--
-- Name: bank_mappings bank_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_mappings
    ADD CONSTRAINT bank_mappings_pkey PRIMARY KEY (id);


--
-- Name: batch_items batch_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_items
    ADD CONSTRAINT batch_items_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: bot_configs bot_configs_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_configs
    ADD CONSTRAINT bot_configs_key_key UNIQUE (key);


--
-- Name: bot_configs bot_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_configs
    ADD CONSTRAINT bot_configs_pkey PRIMARY KEY (id);


--
-- Name: cashback_profits cashback_profits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashback_profits
    ADD CONSTRAINT cashback_profits_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: installments installments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: service_members service_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_pkey PRIMARY KEY (id);


--
-- Name: sheet_webhook_links sheet_webhook_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sheet_webhook_links
    ADD CONSTRAINT sheet_webhook_links_pkey PRIMARY KEY (id);


--
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: transaction_lines_old transaction_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_lines_old
    ADD CONSTRAINT transaction_lines_pkey PRIMARY KEY (id);


--
-- Name: transactions_old transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_old
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey1 PRIMARY KEY (id);


--
-- Name: accounts_parent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_parent_idx ON public.accounts USING btree (parent_account_id);


--
-- Name: transaction_lines_person_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transaction_lines_person_idx ON public.transaction_lines_old USING btree (person_id);


--
-- Name: transactions_cycle_tag_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_cycle_tag_idx ON public.transactions_old USING btree (cashback_cycle_tag);


--
-- Name: transactions_tag_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_tag_idx ON public.transactions_old USING btree (tag);


--
-- Name: transaction_lines_old update_balance_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_balance_trigger AFTER INSERT OR DELETE OR UPDATE ON public.transaction_lines_old FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();


--
-- Name: transaction_lines_old update_stats_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stats_trigger AFTER INSERT OR DELETE OR UPDATE ON public.transaction_lines_old FOR EACH ROW EXECUTE FUNCTION public.update_account_stats();


--
-- Name: accounts accounts_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: accounts accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: accounts accounts_secured_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_secured_by_account_id_fkey FOREIGN KEY (secured_by_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: batch_items batch_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_items
    ADD CONSTRAINT batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;


--
-- Name: batch_items batch_items_target_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_items
    ADD CONSTRAINT batch_items_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(id);


--
-- Name: batches batches_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.accounts(id);


--
-- Name: cashback_profits cashback_profits_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashback_profits
    ADD CONSTRAINT cashback_profits_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: cashback_profits cashback_profits_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashback_profits
    ADD CONSTRAINT cashback_profits_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions_old(id);


--
-- Name: installments installments_debtor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_debtor_id_fkey FOREIGN KEY (debtor_id) REFERENCES public.profiles(id);


--
-- Name: installments installments_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id);


--
-- Name: service_members service_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: service_members service_members_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_subscription_id_fkey FOREIGN KEY (service_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: shops shops_default_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_default_category_id_fkey FOREIGN KEY (default_category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_default_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_default_category_id_fkey FOREIGN KEY (default_category_id) REFERENCES public.categories(id);


--
-- Name: subscriptions subscriptions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id);


--
-- Name: transaction_lines_old transaction_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_lines_old
    ADD CONSTRAINT transaction_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: transaction_lines_old transaction_lines_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_lines_old
    ADD CONSTRAINT transaction_lines_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: transaction_lines_old transaction_lines_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_lines_old
    ADD CONSTRAINT transaction_lines_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.profiles(id);


--
-- Name: transaction_lines_old transaction_lines_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_lines_old
    ADD CONSTRAINT transaction_lines_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id);


--
-- Name: transaction_lines_old transaction_lines_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_lines_old
    ADD CONSTRAINT transaction_lines_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions_old(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: transactions_old transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_old
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: transactions_old transactions_installment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_old
    ADD CONSTRAINT transactions_installment_plan_id_fkey FOREIGN KEY (installment_plan_id) REFERENCES public.installments(id) ON DELETE SET NULL;


--
-- Name: transactions_old transactions_linked_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_old
    ADD CONSTRAINT transactions_linked_transaction_id_fkey FOREIGN KEY (linked_transaction_id) REFERENCES public.transactions_old(id);


--
-- Name: transactions transactions_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.profiles(id);


--
-- Name: transactions_old transactions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_old
    ADD CONSTRAINT transactions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_shop_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_shop_id_fkey1 FOREIGN KEY (shop_id) REFERENCES public.shops(id);


--
-- Name: transactions transactions_target_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(id);


--
-- Name: bank_mappings Allow authenticated users to manage bank mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to manage bank mappings" ON public.bank_mappings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: bank_mappings Allow authenticated users to read bank mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to read bank mappings" ON public.bank_mappings FOR SELECT TO authenticated USING (true);


--
-- Name: accounts Enable access to all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable access to all users" ON public.accounts USING (true) WITH CHECK (true);


--
-- Name: categories Enable access to all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable access to all users" ON public.categories USING (true) WITH CHECK (true);


--
-- Name: profiles Enable access to all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable access to all users" ON public.profiles USING (true) WITH CHECK (true);


--
-- Name: subcategories Enable access to all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable access to all users" ON public.subcategories USING (true) WITH CHECK (true);


--
-- Name: transaction_lines_old Enable access to all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable access to all users" ON public.transaction_lines_old USING (true) WITH CHECK (true);


--
-- Name: transactions_old Enable access to all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable access to all users" ON public.transactions_old USING (true) WITH CHECK (true);


--
-- Name: bank_mappings Enable all access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users" ON public.bank_mappings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: bot_configs Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.bot_configs FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: bot_configs Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON public.bot_configs FOR SELECT USING (true);


--
-- Name: bot_configs Enable update for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable update for authenticated users only" ON public.bot_configs FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: cashback_profits Users can delete their own cashback profits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own cashback profits" ON public.cashback_profits FOR DELETE USING ((auth.uid() = ( SELECT accounts.owner_id
   FROM public.accounts
  WHERE (accounts.id = cashback_profits.account_id))));


--
-- Name: installments Users can delete their own installments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own installments" ON public.installments FOR DELETE USING ((auth.uid() = owner_id));


--
-- Name: cashback_profits Users can insert their own cashback profits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own cashback profits" ON public.cashback_profits FOR INSERT WITH CHECK ((auth.uid() = ( SELECT accounts.owner_id
   FROM public.accounts
  WHERE (accounts.id = cashback_profits.account_id))));


--
-- Name: installments Users can insert their own installments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own installments" ON public.installments FOR INSERT WITH CHECK ((auth.uid() = owner_id));


--
-- Name: cashback_profits Users can update their own cashback profits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own cashback profits" ON public.cashback_profits FOR UPDATE USING ((auth.uid() = ( SELECT accounts.owner_id
   FROM public.accounts
  WHERE (accounts.id = cashback_profits.account_id))));


--
-- Name: installments Users can update their own installments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own installments" ON public.installments FOR UPDATE USING ((auth.uid() = owner_id));


--
-- Name: cashback_profits Users can view their own cashback profits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own cashback profits" ON public.cashback_profits FOR SELECT USING ((auth.uid() = ( SELECT accounts.owner_id
   FROM public.accounts
  WHERE (accounts.id = cashback_profits.account_id))));


--
-- Name: installments Users can view their own installments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own installments" ON public.installments FOR SELECT USING ((auth.uid() = owner_id));


--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: sheet_webhook_links allow_all_sheet_webhook_links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_all_sheet_webhook_links ON public.sheet_webhook_links USING (true) WITH CHECK (true);


--
-- Name: bank_mappings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bank_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_configs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bot_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: cashback_profits; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cashback_profits ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: installments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: sheet_webhook_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sheet_webhook_links ENABLE ROW LEVEL SECURITY;

--
-- Name: subcategories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_lines_old; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.transaction_lines_old ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions_old; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.transactions_old ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION calculate_cycle_start(transaction_date timestamp with time zone, statement_day integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_cycle_start(transaction_date timestamp with time zone, statement_day integer) TO anon;
GRANT ALL ON FUNCTION public.calculate_cycle_start(transaction_date timestamp with time zone, statement_day integer) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_cycle_start(transaction_date timestamp with time zone, statement_day integer) TO service_role;


--
-- Name: FUNCTION check_batch_completion(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_batch_completion() TO anon;
GRANT ALL ON FUNCTION public.check_batch_completion() TO authenticated;
GRANT ALL ON FUNCTION public.check_batch_completion() TO service_role;


--
-- Name: FUNCTION get_debt_by_tags(person_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_debt_by_tags(person_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_debt_by_tags(person_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_debt_by_tags(person_uuid uuid) TO service_role;


--
-- Name: FUNCTION recalculate_account_stats(account_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recalculate_account_stats(account_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.recalculate_account_stats(account_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.recalculate_account_stats(account_uuid uuid) TO service_role;


--
-- Name: FUNCTION update_account_balance(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_account_balance() TO anon;
GRANT ALL ON FUNCTION public.update_account_balance() TO authenticated;
GRANT ALL ON FUNCTION public.update_account_balance() TO service_role;


--
-- Name: FUNCTION update_account_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_account_stats() TO anon;
GRANT ALL ON FUNCTION public.update_account_stats() TO authenticated;
GRANT ALL ON FUNCTION public.update_account_stats() TO service_role;


--
-- Name: TABLE accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.accounts TO anon;
GRANT ALL ON TABLE public.accounts TO authenticated;
GRANT ALL ON TABLE public.accounts TO service_role;


--
-- Name: TABLE auth_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.auth_users TO anon;
GRANT ALL ON TABLE public.auth_users TO authenticated;
GRANT ALL ON TABLE public.auth_users TO service_role;


--
-- Name: TABLE bank_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bank_mappings TO anon;
GRANT ALL ON TABLE public.bank_mappings TO authenticated;
GRANT ALL ON TABLE public.bank_mappings TO service_role;


--
-- Name: TABLE batch_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.batch_items TO anon;
GRANT ALL ON TABLE public.batch_items TO authenticated;
GRANT ALL ON TABLE public.batch_items TO service_role;


--
-- Name: TABLE batches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.batches TO anon;
GRANT ALL ON TABLE public.batches TO authenticated;
GRANT ALL ON TABLE public.batches TO service_role;


--
-- Name: TABLE bot_configs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bot_configs TO anon;
GRANT ALL ON TABLE public.bot_configs TO authenticated;
GRANT ALL ON TABLE public.bot_configs TO service_role;


--
-- Name: TABLE cashback_profits; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cashback_profits TO anon;
GRANT ALL ON TABLE public.cashback_profits TO authenticated;
GRANT ALL ON TABLE public.cashback_profits TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;


--
-- Name: TABLE installments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.installments TO anon;
GRANT ALL ON TABLE public.installments TO authenticated;
GRANT ALL ON TABLE public.installments TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE service_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.service_members TO anon;
GRANT ALL ON TABLE public.service_members TO authenticated;
GRANT ALL ON TABLE public.service_members TO service_role;


--
-- Name: TABLE sheet_webhook_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sheet_webhook_links TO anon;
GRANT ALL ON TABLE public.sheet_webhook_links TO authenticated;
GRANT ALL ON TABLE public.sheet_webhook_links TO service_role;


--
-- Name: TABLE shops; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shops TO anon;
GRANT ALL ON TABLE public.shops TO authenticated;
GRANT ALL ON TABLE public.shops TO service_role;


--
-- Name: TABLE subcategories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subcategories TO anon;
GRANT ALL ON TABLE public.subcategories TO authenticated;
GRANT ALL ON TABLE public.subcategories TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: TABLE transaction_lines_old; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transaction_lines_old TO anon;
GRANT ALL ON TABLE public.transaction_lines_old TO authenticated;
GRANT ALL ON TABLE public.transaction_lines_old TO service_role;


--
-- Name: TABLE transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transactions TO anon;
GRANT ALL ON TABLE public.transactions TO authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;


--
-- Name: TABLE transactions_old; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transactions_old TO anon;
GRANT ALL ON TABLE public.transactions_old TO authenticated;
GRANT ALL ON TABLE public.transactions_old TO service_role;


--
-- Name: TABLE view_account_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.view_account_stats TO anon;
GRANT ALL ON TABLE public.view_account_stats TO authenticated;
GRANT ALL ON TABLE public.view_account_stats TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict nkZJPhpeK5hag2VLsqxdemfWn7NU1U2gBfBtPOJEpo9wGEj0HOMv1inMXFlhpMY
