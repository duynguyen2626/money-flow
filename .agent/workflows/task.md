---
description: TASK: Fix Repayment Debt Account Auto-Link (Sprint 5.2)
---

TASK: Fix Repayment Debt Account Auto-Link (Sprint 5.2)

1. Context & Objective

We are transitioning from Sprint 5.1 to 5.2.
Current Issue: When editing a Repayment transaction, the system fails to automatically select the corresponding debt account associated with the person (profile). It requires manual selection, which is error-prone.
Goal: Automate the mapping logic so that any Lend or Repay action (add/edit) automatically links to the correct debt account based on the selected Profile (owner_id).

2. Branch Convention (Sprint 5)

Branch Name: fix/sprint-5.2-repayment-context-binding

Commit Message Format: [Sprint 5.2] <type>: <subject> (e.g., [Sprint 5.2] fix: auto-bind debt account on repayment edit)

3. Data Context (Reproducible Sample)

Use the following SQL to set up your local environment for debugging. notice the relationship between profiles.id and accounts.owner_id.

-- Profile: Ngọc
INSERT INTO "public"."profiles" ("id", "name", "email", "role", "is_group", "avatar_url", "created_at", "sheet_link", "is_owner", "is_archived", "google_sheet_url", "group_parent_id", "sheet_full_img", "sheet_show_bank_account", "sheet_show_qr_image") 
VALUES ('dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248', 'Ngọc', null, 'member', 'false', '[https://ui-avatars.com/api/?name=Ngọc&background=random](https://ui-avatars.com/api/?name=Ngọc&background=random)', '2025-11-30 11:52:25.371122+00', null, 'false', 'false', null, null, null, 'false', 'false');

-- Account: Receivable - Ngọc (Linked via owner_id)
INSERT INTO "public"."accounts" ("id", "name", "type", "currency", "credit_limit", "current_balance", "owner_id", "cashback_config", "is_active", "created_at", "secured_by_account_id", "image_url", "parent_account_id", "total_in", "total_out", "annual_fee", "cashback_config_version", "receiver_name", "account_number") 
VALUES ('3b3ae4a2-c64e-4edc-88a4-7d538f776786', 'Receivable - Ngọc', 'debt', 'VND', '0.00', '0.00', 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248', null, 'true', '2025-11-30 12:11:00.118276+00', null, '[https://img.icons8.com/fluency/48/receive-cash.png](https://img.icons8.com/fluency/48/receive-cash.png)', null, '0.00', '0.00', '0.00', '1', null, null);


4. Business Rules (Mandatory)

Strict Debt Linking: Any code related to Lend or Repay (Transaction Types) MUST resolve the debt account.

If creating a new Person -> Ensure a debt account is created.

If Adding/Editing a Transaction -> Lookup accounts where owner_id = profile_id AND type = 'debt'.

No "Guessing": Do not assume the account ID is passed from the frontend. Verify it against the database/store using the owner_id.

5. Technical Constraints & Verification

File to Study: transaction.service.ts (or equivalent backend logic file).

Critical Question: logic regarding mapTransactionRow.

Async Requirement: You must understand why mapping rows might need to be async (Hint: Database lookups for foreign keys).

6. Implementation Steps

Analyze: Read the codebase to find where Repayment editing logic resides.

Reproduction: Create a test case using the SQL above. Try to edit a repayment for "Ngọc" and observe the account field.

Fix: Implement the lookup logic to pre-fill the debt account.

Verify: Ensure no regression on normal expense transactions.

7. Definition of Done

[ ] User opens "Edit Transaction" for a Repayment.

[ ] The system automatically selects "Receivable - Ngọc" as the account.

[ ] Code passes all linting rules defined in .agent/rules/gravityrules.md.