-- Money Flow 3 - Complete Sample Data (Post-Phase 75)
-- Generation Date: 2026-02-08
-- Purpose: Full database hydration for testing and development.
-- Compatible with: database/latest_schema.sql
--------------------------------------------------------------------------------
-- 1. PEOPLE (Profiles)
--------------------------------------------------------------------------------
-- Primary user (Owner)
INSERT INTO public.people (id, name, email, role, is_owner, image_url)
VALUES (
        '917455ba-16c0-42f9-9cea-264f81a3db66',
        'Nam Nguyen',
        'nam@moneyflow.ai',
        'owner',
        true,
        'https://img.icons8.com/color/48/user.png'
    ) ON CONFLICT (id) DO
UPDATE
SET name = EXCLUDED.name;
-- Family member
INSERT INTO public.people (id, name, role, image_url)
VALUES (
        'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
        'Thao Trang',
        'family',
        'https://img.icons8.com/color/48/woman-profile.png'
    ) ON CONFLICT (id) DO
UPDATE
SET role = EXCLUDED.role;
-- Regular debtor
INSERT INTO public.people (id, name, role, image_url)
VALUES (
        'dba2a24b-d89b-4d29-a51e-b92c5632228d',
        'John Doe',
        'debtor',
        'https://img.icons8.com/color/48/worker-beard.png'
    ) ON CONFLICT (id) DO NOTHING;
--------------------------------------------------------------------------------
-- 2. ACCOUNTS
--------------------------------------------------------------------------------
-- Main Bank Account
INSERT INTO public.accounts (
        id,
        name,
        type,
        currency,
        current_balance,
        owner_id,
        image_url,
        account_number,
        receiver_name
    )
VALUES (
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'Vcb Priority',
        'bank',
        'VND',
        150000000.00,
        '917455ba-16c0-42f9-9cea-264f81a3db66',
        'https://img.icons8.com/color/48/bank.png',
        '9389191959',
        'NGUYEN THANH NAM'
    ) ON CONFLICT (id) DO NOTHING;
-- Savings Account (Secured for Credit Card)
INSERT INTO public.accounts (
        id,
        name,
        type,
        current_balance,
        owner_id,
        image_url
    )
VALUES (
        '9527c56a-81c6-438f-b470-93cb80cace08',
        'Sổ Tiết Kiệm Đảm Bảo',
        'savings',
        20000000.00,
        '917455ba-16c0-42f9-9cea-264f81a3db66',
        'https://img.icons8.com/color/48/safe.png'
    ) ON CONFLICT (id) DO NOTHING;
-- Credit Card: Vpbank Lady (Advanced Cashback)
INSERT INTO public.accounts (
        id,
        name,
        type,
        credit_limit,
        current_balance,
        owner_id,
        secured_by_account_id,
        image_url,
        annual_fee,
        cashback_config
    )
VALUES (
        '83a27121-0e34-4231-b060-2818da672eca',
        'Vpbank Lady',
        'credit_card',
        38000000.00,
        10114347.00,
        '917455ba-16c0-42f9-9cea-264f81a3db66',
        '9527c56a-81c6-438f-b470-93cb80cace08',
        'https://haagrico.com.vn/wp-content/uploads/2023/06/vpbank-lady-mastercard-la-the-gi-4.jpg',
        499000.00,
        '{
  "program": {
    "levels": [
      {
        "id": "lvl_premium",
        "name": "Premium Tier ≥15M",
        "rules": [{"id": "rule_1", "rate": 0.15, "maxReward": 300000, "categoryIds": ["aac49051-7231-471e-a3ae-7925c78afa7d"]}],
        "defaultRate": 0.15,
        "minTotalSpend": 15000000
      },
      {
        "id": "lvl_standard",
        "name": "Standard (<15M)",
        "rules": [{"id": "rule_2", "rate": 0.075, "maxReward": 150000, "categoryIds": ["aac49051-7231-471e-a3ae-7925c78afa7d"]}],
        "defaultRate": 0.075,
        "minTotalSpend": 0
      }
    ],
    "dueDate": 15,
    "cycleType": "statement_cycle",
    "defaultRate": 0.003,
    "statementDay": 20
  }
}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;
--------------------------------------------------------------------------------
-- 3. SHOPS & CATEGORIES
--------------------------------------------------------------------------------
-- Categories
INSERT INTO public.categories (id, name, icon, type)
VALUES (
        'aac49051-7231-471e-a3ae-7925c78afa7d',
        'Shopping',
        '🛍️',
        'expense'
    ),
    (
        'e0000000-0000-0000-0000-000000000089',
        'Dining Out',
        '🍴',
        'expense'
    ),
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
        'Salary',
        '💰',
        'income'
    ),
    (
        'b1111111-1111-1111-1111-111111111111',
        'Netflix',
        '📺',
        'expense'
    ) ON CONFLICT (id) DO
UPDATE
SET icon = EXCLUDED.icon;
-- Shops
INSERT INTO public.shops (id, name, category, image_url)
VALUES (
        'ea3477cb-30dd-4b7f-8826-a89a1b919661',
        'Starbucks',
        'Dining Out',
        'https://img.icons8.com/color/48/starbucks.png'
    ),
    (
        '40c3998b-7550-414c-be42-fe93ed767a06',
        'Shopee',
        'Shopping',
        'https://img.icons8.com/color/48/shopee.png'
    ),
    (
        'f2222222-2222-2222-2222-222222222222',
        'Netflix Inc',
        'Entertainment',
        'https://img.icons8.com/color/48/netflix.png'
    ) ON CONFLICT (id) DO
UPDATE
SET category = EXCLUDED.category;
--------------------------------------------------------------------------------
-- 4. SUBSCRIPTIONS (Services)
--------------------------------------------------------------------------------
INSERT INTO public.subscriptions (
        id,
        name,
        price,
        currency,
        shop_id,
        default_category_id,
        max_slots
    )
VALUES (
        's1111111-1111-1111-1111-111111111111',
        'Netflix Premium',
        260000.00,
        'VND',
        'f2222222-2222-2222-2222-222222222222',
        'b1111111-1111-1111-1111-111111111111',
        4
    ) ON CONFLICT (id) DO NOTHING;
-- Service Members
INSERT INTO public.service_members (service_id, person_id, slots, is_owner)
VALUES (
        's1111111-1111-1111-1111-111111111111',
        '917455ba-16c0-42f9-9cea-264f81a3db66',
        1,
        true
    ),
    (
        's1111111-1111-1111-1111-111111111111',
        'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
        1,
        false
    ) ON CONFLICT DO NOTHING;
--------------------------------------------------------------------------------
-- 5. BATCHES
--------------------------------------------------------------------------------
INSERT INTO public.batches (id, name, source, account_id, status)
VALUES (
        'b0000000-0000-0000-0000-000000000001',
        'VCB Statement Feb',
        'excel',
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'confirmed'
    ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.batch_items (
        batch_id,
        transaction_date,
        amount,
        details,
        status
    )
VALUES (
        'b0000000-0000-0000-0000-000000000001',
        '2026-02-05',
        -150000.00,
        'Tiki Payment',
        'confirmed'
    ) ON CONFLICT DO NOTHING;
--------------------------------------------------------------------------------
-- 6. TRANSACTIONS
--------------------------------------------------------------------------------
-- Income
INSERT INTO public.transactions (
        id,
        type,
        amount,
        note,
        account_id,
        category_id,
        occurred_at
    )
VALUES (
        gen_random_uuid(),
        'income',
        45000000.00,
        'Lương Tháng 1',
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
        '2026-01-31 09:00:00+00'
    ) ON CONFLICT DO NOTHING;
-- Expense with Cashback
INSERT INTO public.transactions (
        id,
        type,
        amount,
        note,
        account_id,
        category_id,
        shop_id,
        occurred_at,
        final_price,
        cashback_amount
    )
VALUES (
        gen_random_uuid(),
        'expense',
        -2000000.00,
        'Mua sắm Tết',
        '83a27121-0e34-4231-b060-2818da672eca',
        'aac49051-7231-471e-a3ae-7925c78afa7d',
        '40c3998b-7550-414c-be42-fe93ed767a06',
        '2026-02-01 10:00:00+00',
        -1850000.00,
        150000.00
    ) ON CONFLICT DO NOTHING;
-- Debt
INSERT INTO public.transactions (
        id,
        type,
        amount,
        note,
        account_id,
        person_id,
        occurred_at
    )
VALUES (
        'd0000000-0000-0000-0000-000000000001',
        'debt',
        -5000000.00,
        'Cho John vay tiền',
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'dba2a24b-d89b-4d29-a51e-b92c5632228d',
        '2026-02-03 14:00:00+00'
    ) ON CONFLICT (id) DO NOTHING;
-- Repayment (FIFO Linked)
INSERT INTO public.transactions (
        id,
        type,
        amount,
        note,
        account_id,
        person_id,
        occurred_at,
        linked_transaction_id
    )
VALUES (
        gen_random_uuid(),
        'repayment',
        2000000.00,
        'John trả bớt nợ',
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'dba2a24b-d89b-4d29-a51e-b92c5632228d',
        '2026-02-07 16:00:00+00',
        'd0000000-0000-0000-0000-000000000001'
    ) ON CONFLICT DO NOTHING;