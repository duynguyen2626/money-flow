/* Sample MSB Online cards*/
INSERT INTO public.accounts
(id, "name", "type", currency, credit_limit, current_balance, owner_id, cashback_config, is_active, created_at, secured_by_account_id, image_url, parent_account_id, total_in, total_out, annual_fee, cashback_config_version, receiver_name, account_number, annual_fee_waiver_target)
VALUES('96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, 'Msb Online', 'credit_card'::public."account_type", 'VND', 30000000.00, 6980879.00, '917455ba-16c0-42f9-9cea-264f81a3db66'::uuid, '{"program": {"levels": [{"id": "sz0jybxex", "name": "Level 1", "rules": [{"id": "pyyu3dwf3", "rate": 0.1, "maxReward": 300000, "categoryIds": ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99"]}], "defaultRate": 0.1, "minTotalSpend": 3000000}], "dueDate": 10, "cycleType": "statement_cycle", "maxBudget": 300000, "defaultRate": 0.1, "statementDay": 25, "minSpendTarget": 3000000}}'::jsonb, true, '2025-11-30 19:04:42.646', NULL, 'https://res.cloudinary.com/dpnrln3ug/image/upload/v1764834568/Th%E1%BA%BB_MSB_Visa_Online_epovcz.jpg', '29c7b1b5-2977-44e0-b995-d523168a36da'::uuid, 300000.00, -7280879.00, 0.00, 4, 'NGUYEN THANH NAM', '04201012971663', 0.00);
/*Related Txns of Msb Online sample: */
INSERT INTO public.transactions
(id, created_at, occurred_at, amount, "type", note, account_id, target_account_id, category_id, person_id, shop_id, tag, linked_transaction_id, metadata, status, created_by, is_installment, installment_plan_id, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, original_amount, final_price, cashback_mode, parent_transaction_id)
VALUES('ca3fc556-a7a2-44e2-88af-70ca50134fc3'::uuid, '2025-12-07 21:05:51.488', '2025-12-04 21:05:31.000', -2919718.00, 'debt', 'Điện T11', '96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'::uuid, '72e7f115-2125-4eef-8298-2fee62eb02d3'::uuid, 'ea3477cb-30dd-4b7f-8826-a89a1b919661'::uuid, '2025-12', NULL, NULL, 'posted', NULL, false, NULL, '2025-12', 0.0500, NULL, NULL, -2773732.100000, 'real_percent', NULL);
INSERT INTO public.transactions
(id, created_at, occurred_at, amount, "type", note, account_id, target_account_id, category_id, person_id, shop_id, tag, linked_transaction_id, metadata, status, created_by, is_installment, installment_plan_id, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, original_amount, final_price, cashback_mode, parent_transaction_id)
VALUES('13aab4f9-6ffa-45d3-8584-bacdffcbfb1b'::uuid, '2026-01-05 22:24:35.313', '2026-01-05 22:22:23.558', -548923.00, 'debt', 'Điện T11 (536,395)', '96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'::uuid, 'c8714b94-ff8d-4838-98d6-246d543ac552'::uuid, 'ea3477cb-30dd-4b7f-8826-a89a1b919661'::uuid, '2025-12', NULL, '{}'::jsonb, 'void', NULL, false, NULL, '2025-12', 0.0400, 0.00, NULL, -526966.080000, 'real_percent', NULL);
INSERT INTO public.transactions
(id, created_at, occurred_at, amount, "type", note, account_id, target_account_id, category_id, person_id, shop_id, tag, linked_transaction_id, metadata, status, created_by, is_installment, installment_plan_id, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, original_amount, final_price, cashback_mode, parent_transaction_id)
VALUES('155c9954-8e43-452f-9591-ba8592557f3f'::uuid, '2026-01-10 10:09:43.843', '2026-01-10 10:09:20.223', 300000.00, 'income', 'Cashback T12', '96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, NULL, 'e0000000-0000-0000-0000-000000000003'::uuid, NULL, NULL, '2026-01', NULL, '{}'::jsonb, 'posted', NULL, false, NULL, NULL, 0.0000, 0.00, NULL, 300000.000000, 'none_back', NULL);
INSERT INTO public.transactions
(id, created_at, occurred_at, amount, "type", note, account_id, target_account_id, category_id, person_id, shop_id, tag, linked_transaction_id, metadata, status, created_by, is_installment, installment_plan_id, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, original_amount, final_price, cashback_mode, parent_transaction_id)
VALUES('002e55cc-2f01-4e67-85d2-37f90e675196'::uuid, '2026-01-05 22:19:22.917', '2026-01-05 22:18:22.932', -1806749.00, 'debt', 'Điện T11 (1,769,588)', '96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'::uuid, 'eccde148-a84e-455f-ba96-c8aa0b149ac8'::uuid, 'ea3477cb-30dd-4b7f-8826-a89a1b919661'::uuid, '2026-01', NULL, '{}'::jsonb, 'posted', NULL, false, NULL, '2026-01', 0.0400, 0.00, NULL, -1734479.040000, 'real_percent', NULL);
INSERT INTO public.transactions
(id, created_at, occurred_at, amount, "type", note, account_id, target_account_id, category_id, person_id, shop_id, tag, linked_transaction_id, metadata, status, created_by, is_installment, installment_plan_id, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, original_amount, final_price, cashback_mode, parent_transaction_id)
VALUES('fd6682e4-fa3f-4989-8ee8-2ff977dbb0ef'::uuid, '2026-01-20 11:45:44.968', '2026-01-15 00:00:00.000', -796500.00, 'debt', 'Derma: B3 + Tricky', '96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'::uuid, 'eccde148-a84e-455f-ba96-c8aa0b149ac8'::uuid, 'ea3477cb-30dd-4b7f-8826-a89a1b919661'::uuid, '2026-01', NULL, '{}'::jsonb, 'void', NULL, false, NULL, '2026-01', 0.0800, 0.00, NULL, -732780.000000, 'real_percent', NULL);
INSERT INTO public.transactions
(id, created_at, occurred_at, amount, "type", note, account_id, target_account_id, category_id, person_id, shop_id, tag, linked_transaction_id, metadata, status, created_by, is_installment, installment_plan_id, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, original_amount, final_price, cashback_mode, parent_transaction_id)
VALUES('3ef30b97-9a2b-4f75-b723-87290c3869f4'::uuid, '2026-01-05 22:32:13.830', '2026-01-05 22:31:18.436', -687632.00, 'expense', 'Điện t11', '96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, NULL, 'e0000000-0000-0000-0000-000000000002'::uuid, NULL, '1fe82aac-029a-4038-864f-effb182c480c'::uuid, '2026-01', NULL, '{}'::jsonb, 'posted', NULL, false, NULL, '2026-01', 0.0000, 0.00, NULL, -687632.000000, 'none_back', NULL);
INSERT INTO public.transactions
(id, created_at, occurred_at, amount, "type", note, account_id, target_account_id, category_id, person_id, shop_id, tag, linked_transaction_id, metadata, status, created_by, is_installment, installment_plan_id, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, original_amount, final_price, cashback_mode, parent_transaction_id)
VALUES('2a1b9431-c895-4118-bdbe-3d01f5c16633'::uuid, '2026-01-20 12:03:34.482', '2026-01-15 00:00:00.000', -1294780.00, 'debt', 'Derma: 2 Rescuer (992.200) + 1 Zakka probi (302.580) ', '96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'::uuid, 'eccde148-a84e-455f-ba96-c8aa0b149ac8'::uuid, 'ea3477cb-30dd-4b7f-8826-a89a1b919661'::uuid, '2026-01', NULL, '{}'::jsonb, 'posted', NULL, false, NULL, '2026-01', 0.0800, 0.00, NULL, -1191197.600000, 'real_percent', NULL);
INSERT INTO public.transactions
(id, created_at, occurred_at, amount, "type", note, account_id, target_account_id, category_id, person_id, shop_id, tag, linked_transaction_id, metadata, status, created_by, is_installment, installment_plan_id, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, original_amount, final_price, cashback_mode, parent_transaction_id)
VALUES('5e2f8064-7487-4c53-9218-6b3143246016'::uuid, '2026-02-09 11:22:05.310', '2026-01-15 11:19:08.025', -572000.00, 'debt', 'Derma: 1 Roug + 1 Vic C ', '96194195-127f-45bb-8ec3-8fa4eb703875'::uuid, NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'::uuid, 'eccde148-a84e-455f-ba96-c8aa0b149ac8'::uuid, 'ea3477cb-30dd-4b7f-8826-a89a1b919661'::uuid, '2026-01', NULL, NULL, 'posted', NULL, false, NULL, '2026-01', 0.0800, NULL, NULL, -526240.000000, 'real_percent', NULL);


/***************************Category***************/
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000090'::uuid, 'Transfer', 'transfer', '💸', NULL, 'https://img.icons8.com/color/48/switch.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000091'::uuid, 'Credit Payment', 'transfer', '💳', NULL, 'https://img.icons8.com/color/48/credit-card.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000080'::uuid, 'Money Transfer', 'transfer', '💸', NULL, 'https://img.icons8.com/fluency/48/money-transfer.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('dac6e2f4-12a0-41f2-89dd-8d597854bbe6'::uuid, 'Subscriptions', 'expense', NULL, NULL, NULL, NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000099'::uuid, 'Other Expense', 'expense', '📝', NULL, NULL, NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000002'::uuid, 'Utilities', 'expense', NULL, NULL, 'https://img.icons8.com/color/48/electricity.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000098'::uuid, 'Adjustment', 'expense', '🎁', NULL, 'https://img.icons8.com/color/48/request-money.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000001'::uuid, 'Food & Drink', 'expense', NULL, '{5812,5814}', 'https://img.icons8.com/color/48/hamburger.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'::uuid, 'Shopping', 'expense', '🛍️', NULL, 'https://img.icons8.com/fluency/48/shopping-bag.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000003'::uuid, 'Income', 'income', NULL, NULL, 'https://img.icons8.com/color/48/money-bag.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000088'::uuid, 'Online Services', 'expense', '☁️', NULL, 'https://img.icons8.com/fluency/48/cloud-sync.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000092'::uuid, 'Hoàn tiền (Cashback)', 'income', '💰', NULL, NULL, NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000095'::uuid, 'Refund', 'income', '↩️', NULL, 'https://cdn-icons-png.flaticon.com/128/1585/1585145.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('aac49051-7231-471e-a3ae-7925c78afa7d'::uuid, 'EDUCATION', 'expense', '', NULL, 'https://tse3.mm.bing.net/th/id/OIP.AV1XZBTIUlxxsm6htBbRMQHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000089'::uuid, 'Lending', 'expense', '💸', NULL, 'https://img.icons8.com/color/48/borrow-book.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('405a25bf-f106-41aa-9414-b1a8c9862069'::uuid, 'Repayment', 'income', NULL, NULL, NULL, NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('e0000000-0000-0000-0000-000000000096'::uuid, 'Debt Repayment', 'income', '🤝', NULL, 'https://img.icons8.com/fluency/48/handshake.png', NULL, '2025-12-23 15:42:31.330');
INSERT INTO public.categories
(id, "name", "type", icon, mcc_codes, image_url, parent_id, created_at)
VALUES('3017eba6-dc65-4f2b-be01-6e1e207e08d2'::uuid, 'Refund', 'income', '↪️', NULL, NULL, NULL, '2026-01-12 21:09:35.771');
