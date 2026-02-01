
/*Secured account*/
INSERT INTO public.accounts
(id, "name", "type", currency, credit_limit, current_balance, owner_id, cashback_config, is_active, created_at, secured_by_account_id, image_url, parent_account_id, total_in, total_out, annual_fee, cashback_config_version, receiver_name, account_number)
VALUES('9527c56a-81c6-438f-b470-93cb80cace08'::uuid, 'Sổ TK đảm bảo cho Exim Violet', 'savings'::public."account_type", 'VND', 0.00, 0.00, '917455ba-16c0-42f9-9cea-264f81a3db66'::uuid, NULL, true, '2025-11-30 19:04:42.646', NULL, 'https://img.icons8.com/color/48/safe.png', NULL, 0.00, 0.00, 0.00, 1, NULL, NULL);

/*Credit card*/
INSERT INTO public.accounts
(id, "name", "type", currency, credit_limit, current_balance, owner_id, cashback_config, is_active, created_at, secured_by_account_id, image_url, parent_account_id, total_in, total_out, annual_fee, cashback_config_version, receiver_name, account_number)
VALUES('fb1ba42e-04d1-4321-944d-1803049a57ab'::uuid, 'Exim Violet', 'credit_card'::public."account_type", 'VND', 18000000.00, 1669920.00, '917455ba-16c0-42f9-9cea-264f81a3db66'::uuid, '{"program": {"levels": [], "dueDate": null, "cycleType": "calendar_month", "maxBudget": 300000, "defaultRate": 0.1, "statementDay": null, "minSpendTarget": 3000000}, "parentAccountId": null}'::jsonb, true, '2025-11-30 19:04:42.646', '9527c56a-81c6-438f-b470-93cb80cace08'::uuid, 'https://res.cloudinary.com/dpnrln3ug/image/upload/v1763789710/the-tin-dung-quoc-te-eximbank-visa-violet_ucx2sa.jpg', NULL, 0.00, -1669920.00, 499000.00, 2, 'NGUYEN THI THAO TRANG', '220310501000217')
ON CONFLICT (id) DO UPDATE SET secured_by_account_id = '9527c56a-81c6-438f-b470-93cb80cace08'::uuid;

/* Secured Saving Account (Mock for Exim Violet) */
INSERT INTO public.accounts
(id, "name", "type", currency, credit_limit, current_balance, owner_id, is_active, created_at, image_url, account_number)
VALUES('9527c56a-81c6-438f-b470-93cb80cace08'::uuid, 'Sổ TK đảm bảo thẻ Exim', 'savings'::public."account_type", 'VND', 0, 20000000.00, '917455ba-16c0-42f9-9cea-264f81a3db66'::uuid, true, NOW(), NULL, 'STK-001')
ON CONFLICT (id) DO NOTHING;

/*Credit card Vpbank Lady with advanced cashback*/
INSERT INTO public.accounts
(id, "name", "type", currency, credit_limit, current_balance, owner_id, cashback_config, is_active, created_at, secured_by_account_id, image_url, parent_account_id, total_in, total_out, annual_fee, cashback_config_version, receiver_name, account_number)
VALUES('83a27121-0e34-4231-b060-2818da672eca'::uuid, 'Vpbank Lady', 'credit_card'::public."account_type", 'VND', 38000000.00, 10114347.00, 'dba2a24b-d89b-4d29-a51e-b92c5632228d'::uuid, '{"program": {"levels": [{"id": "lvl_premium", "name": "Premium Tier ≥15M", "rules": [{"id": "rule_1", "rate": 0.15, "maxReward": 300000, "categoryIds": ["aac49051-7231-471e-a3ae-7925c78afa7d"]}], "defaultRate": 0.15, "minTotalSpend": 15000000}, {"id": "lvl_standard", "name": "Standard (<15M)", "rules": [{"id": "rule_2", "rate": 0.075, "maxReward": 150000, "categoryIds": ["aac49051-7231-471e-a3ae-7925c78afa7d"]}], "defaultRate": 0.075, "minTotalSpend": 0}], "dueDate": 15, "cycleType": "statement_cycle", "maxBudget": null, "defaultRate": 0.003, "statementDay": 20, "minSpendTarget": null}, "parentAccountId": null}'::jsonb, true, '2025-11-30 19:04:42.646', NULL, 'https://haagrico.com.vn/wp-content/uploads/2023/06/vpbank-lady-mastercard-la-the-gi-4.jpg', NULL, 0.00, -10114347.00, NULL, 6, 'NGUYEN THI THAO TRANG', '0362790199');
SELECT id, "name", "type", currency, credit_limit, current_balance, owner_id, cashback_config, is_active, created_at, secured_by_account_id, image_url, parent_account_id, total_in, total_out, annual_fee, cashback_config_version, receiver_name, account_number
FROM public.accounts
WHERE id='83a27121-0e34-4231-b060-2818da672eca'::uuid;

/* Sample debt transactions for Exim Violet credit card */
INSERT INTO "public"."transactions" ("id", "created_at", "occurred_at", "amount", "type", "note", "account_id", "target_account_id", "category_id", "person_id", "shop_id", "tag", "linked_transaction_id", "metadata", "status", "created_by", "is_installment", "installment_plan_id", "persisted_cycle_tag", "cashback_share_percent", "cashback_share_fixed", "original_amount", "final_price", "cashback_mode", "parent_transaction_id") VALUES ('0854adb5-7980-4988-b06b-c7e5b01e5f3f', '2026-01-10 03:31:44.17474+00', '2026-01-10 03:31:12.537+00', '-2158586.00', 'debt', 'Dư nợ T12', '377f4331-1291-47d0-abd1-fee601f7feed', null, 'e0000000-0000-0000-0000-000000000089', 'd419fd12-ad21-4dfa-8054-c6205f6d6b02', 'ea3477cb-30dd-4b7f-8826-a89a1b919661', '2026-01', null, '{}', 'void', null, 'false', null, '2026-01', '0.0000', '0.00', null, '-2158586.000000', 'real_fixed', null), ('128e5f80-7849-41b3-8955-556c5f581c9f', '2025-12-10 12:55:23.257033+00', '2025-12-10 12:49:18.325+00', '-1111.00', 'debt', '111', '377f4331-1291-47d0-abd1-fee601f7feed', null, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'dba2a24b-d89b-4d29-a51e-b92c5632228d', 'ea3477cb-30dd-4b7f-8826-a89a1b919661', '2025-12', null, null, 'posted', null, 'false', null, '2025-12', '0.0000', null, null, '-1111.000000', null, null);

-- Migration: Add annual_fee_waiver_target to accounts table 
-- Date: 2026-01-31
-- Purpose: Track spending threshold for annual fee waiver eligibility  
INSERT INTO "public"."accounts" ("id", "name", "type", "currency", "credit_limit", "current_balance", "owner_id", "cashback_config", "is_active", "created_at", "secured_by_account_id", "image_url", "parent_account_id", "total_in", "total_out", "annual_fee", "cashback_config_version", "receiver_name", "account_number", "annual_fee_waiver_target") VALUES ('40c3998b-7550-414c-be42-fe93ed767a06', 'Vcb Signature', 'credit_card', 'VND', '150000000.00', '40232000.00', '917455ba-16c0-42f9-9cea-264f81a3db66', '{"program": {"levels": [{"id": "lvl_1", "name": "Default", "rules": [{"id": "rule_1", "rate": 0.1, "maxReward": null, "categoryIds": ["aac49051-7231-471e-a3ae-7925c78afa7d"]}], "defaultRate": 0, "minTotalSpend": 0}], "dueDate": 20, "cycleType": "statement_cycle", "defaultRate": 0, "statementDay": 21}}', 'true', '2025-11-30 12:04:42.646344+00', null, 'https://res.cloudinary.com/dpnrln3ug/image/upload/v1763898711/Gemini_Generated_Image_u7lg45u7lg45u7lg_oyy5gp.png', null, '0.00', '-40232000.00', '1999000.00', '6', 'NGUYEN THANH NAM', '9389191959', '150000000.00');