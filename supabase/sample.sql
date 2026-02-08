-- Money Flow 3 - Enhanced Sample Data
-- Date: 2026-02-08
-- 1. CLEANUP (Optional - keep existing if needed, but let's add new samples safely)
--------------------------------------------------------------------------------
-- 2. PEOPLE SAMPLES
--------------------------------------------------------------------------------
INSERT INTO public.people (id, name, email, role, is_owner, image_url)
VALUES (
        '917455ba-16c0-42f9-9cea-264f81a3db66',
        'Nam Nguyen',
        'nam@example.com',
        'owner',
        true,
        'https://img.icons8.com/color/48/user.png'
    ),
    (
        'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
        'Thao Trang',
        'trang@example.com',
        'family',
        false,
        'https://img.icons8.com/color/48/woman-profile.png'
    ),
    (
        'dba2a24b-d89b-4d29-a51e-b92c5632228d',
        'John Doe',
        'john@example.com',
        'debtor',
        false,
        'https://img.icons8.com/color/48/worker-beard.png'
    ) ON CONFLICT (id) DO
UPDATE
SET name = EXCLUDED.name;
-- 3. CATEGORY SAMPLES
--------------------------------------------------------------------------------
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
    ) ON CONFLICT (id) DO
UPDATE
SET icon = EXCLUDED.icon;
-- 4. SHOP SAMPLES
--------------------------------------------------------------------------------
INSERT INTO public.shops (id, name, category)
VALUES (
        'ea3477cb-30dd-4b7f-8826-a89a1b919661',
        'Starbucks',
        'Dining Out'
    ),
    (
        '40c3998b-7550-414c-be42-fe93ed767a06',
        'Shopee',
        'Shopping'
    ) ON CONFLICT (id) DO
UPDATE
SET category = EXCLUDED.category;
-- 5. ACCOUNT SAMPLES
--------------------------------------------------------------------------------
-- Main Bank
INSERT INTO public.accounts (
        id,
        name,
        type,
        current_balance,
        owner_id,
        image_url,
        account_number
    )
VALUES (
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'Vcb Main',
        'bank',
        50000000.00,
        '917455ba-16c0-42f9-9cea-264f81a3db66',
        'https://img.icons8.com/color/48/bank.png',
        '1234567890'
    ) ON CONFLICT (id) DO NOTHING;
-- Credit Card: Vpbank Lady
INSERT INTO public.accounts (
        id,
        name,
        type,
        credit_limit,
        current_balance,
        owner_id,
        cashback_config,
        image_url
    )
VALUES (
        '83a27121-0e34-4231-b060-2818da672eca',
        'Vpbank Lady',
        'credit_card',
        38000000.00,
        10114347.00,
        '917455ba-16c0-42f9-9cea-264f81a3db66',
        '{"program": {"levels": [{"id": "lvl_1", "name": "Basic", "rules": [], "defaultRate": 0.003, "minTotalSpend": 0}], "dueDate": 15, "cycleType": "statement_cycle", "statementDay": 20}}'::jsonb,
        'https://img.icons8.com/color/48/visa.png'
    ) ON CONFLICT (id) DO NOTHING;
-- 6. TRANSACTION SAMPLES
--------------------------------------------------------------------------------
INSERT INTO public.transactions (
        id,
        type,
        amount,
        note,
        account_id,
        category_id,
        occurred_at,
        status
    )
VALUES (
        gen_random_uuid(),
        'expense',
        -55000.00,
        'Coffee with friends',
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'e0000000-0000-0000-0000-000000000089',
        NOW() - INTERVAL '1 day',
        'posted'
    ),
    (
        gen_random_uuid(),
        'income',
        20000000.00,
        'Monthly Salary',
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
        NOW() - INTERVAL '5 days',
        'posted'
    ),
    (
        gen_random_uuid(),
        'debt',
        -1000000.00,
        'Lent to Thao Trang',
        '377f4331-1291-47d0-abd1-fee601f7feed',
        'aac49051-7231-471e-a3ae-7925c78afa7d',
        NOW() - INTERVAL '2 days',
        'posted'
    ) ON CONFLICT DO NOTHING;