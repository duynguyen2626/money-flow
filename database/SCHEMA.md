# Money Flow 3 - Database Schema Documentation

> **Generated:** 2026-02-03 (Updated after people table refactor)  
> **Purpose:** Complete database schema reference for future agents
> **Migration:** Renamed `profiles` → `people`, `profile_id` → `person_id`

## Overview

Money Flow 3 uses PostgreSQL via Supabase with Row Level Security (RLS) enabled.

**Key Changes (2026-02-03):**
- ✅ Table `profiles` renamed to `people`
- ✅ All FK columns `profile_id` renamed to `person_id`
- ✅ Foreign key constraints updated accordingly

## Core Tables

### `people` (formerly `profiles`)
Manages individuals and groups (creditors, debtors, family members, owners).

```sql
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'debtor', -- 'debtor', 'creditor', 'family', 'owner'
  is_group BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sheet_link TEXT, -- Legacy Google Sheets sync URL
  is_owner BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  google_sheet_url TEXT,
  group_parent_id UUID REFERENCES people(id),
  sheet_full_img TEXT,
  sheet_show_bank_account BOOLEAN DEFAULT true,
  sheet_show_qr_image BOOLEAN DEFAULT true
);
```

### `accounts`
Bank accounts, credit cards, e-wallets, and receivable accounts.

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'bank', 'credit_card', 'e_wallet', 'receivable', 'debt'
  current_balance DECIMAL(15,2) DEFAULT 0,
  credit_limit DECIMAL(15,2), -- For credit cards
  owner_id UUID REFERENCES people(id),
  image_url TEXT,
  card_image_url TEXT, -- For credit/debit card visuals
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Credit card specific
  billing_cycle_day INTEGER, -- Day of month (1-31)
  payment_due_day INTEGER,
  cashback_rate DECIMAL(5,2), -- Percentage (e.g., 1.5 = 1.5%)
  annual_fee DECIMAL(10,2),
  
  -- Metadata
  bank_name TEXT,
  account_number TEXT,
  notes TEXT
);
```

### `transactions`
All financial transactions (income, expense, transfer, debt, repayment).

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'income', 'expense', 'transfer', 'debt', 'repayment'
  amount DECIMAL(15,2) NOT NULL,
  final_price DECIMAL(15,2), -- After cashback/discounts
  cashback_amount DECIMAL(15,2) DEFAULT 0,
  cashback_rate DECIMAL(5,2),
  
  -- Accounts
  account_id UUID REFERENCES accounts(id), -- Source account
  dest_account_id UUID REFERENCES accounts(id), -- Destination (for transfers)
  
  -- People
  person_id UUID REFERENCES people(id), -- Counterparty
  
  -- Shop/Merchant
  shop_id UUID REFERENCES shops(id),
  
  -- Categorization
  category_id UUID REFERENCES categories(id),
  tags TEXT[], -- Array of tags
  
  -- Dates
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Status & Metadata
  status TEXT DEFAULT 'active', -- 'active', 'void', 'pending'
  notes TEXT,
  details TEXT, -- Transaction description
  
  -- Installments
  is_installment BOOLEAN DEFAULT false,
  installment_months INTEGER,
  installment_current INTEGER, -- Current installment number
  parent_transaction_id UUID REFERENCES transactions(id),
  
  -- Linking (for refunds, repayments)
  linked_transaction_id UUID REFERENCES transactions(id),
  
  -- Cashback tracking
  cashback_mode TEXT, -- 'auto', 'voluntary', null
  cashback_cycle_id UUID REFERENCES cashback_cycles(id),
  
  -- Batch import
  batch_id UUID REFERENCES batches(id),
  
  -- User
  user_id UUID REFERENCES auth.users(id)
);
```

### `transaction_lines`
Line items for split transactions (e.g., restaurant bills, group expenses).

```sql
CREATE TABLE transaction_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  person_id UUID REFERENCES people(id), -- Who this line is for
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `shops`
Merchants and service providers.

```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  image_url TEXT,
  category TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `categories`
Transaction categories (Food, Transport, Shopping, etc.).

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  parent_id UUID REFERENCES categories(id),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `cashback_cycles`
Tracks credit card cashback cycles (monthly/quarterly).

```sql
CREATE TABLE cashback_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  cycle_tag TEXT NOT NULL, -- Format: 'YYYY-MM' or 'YYYY-QN'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_amount DECIMAL(15,2), -- Spending target for cashback
  current_amount DECIMAL(15,2) DEFAULT 0,
  cashback_earned DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(account_id, cycle_tag)
);
```

### `batches`
Batch import sessions from bank statements.

```sql
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT, -- 'excel', 'csv', 'manual'
  account_id UUID REFERENCES accounts(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
  total_items INTEGER DEFAULT 0,
  confirmed_items INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);
```

### `batch_items`
Individual transactions in a batch (before confirmation).

```sql
CREATE TABLE batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'duplicate', 'skipped'
  matched_transaction_id UUID REFERENCES transactions(id),
  duplicate_of UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `sheet_webhook_links`
Google Sheets webhook URLs for syncing.

```sql
CREATE TABLE sheet_webhook_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `subscriptions` (Services)
Recurring subscription services (Netflix, Spotify, etc.).

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'VND',
  cycle_interval INTEGER DEFAULT 1, -- Billing cycle in months
  next_billing_date DATE,
  shop_id UUID REFERENCES shops(id),
  default_category_id UUID REFERENCES categories(id),
  note_template TEXT,
  is_active BOOLEAN DEFAULT true,
  max_slots INTEGER, -- Maximum number of members
  last_distribution_date TIMESTAMPTZ,
  next_distribution_date TIMESTAMPTZ,
  distribution_status TEXT, -- 'pending', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `service_members`
Members participating in shared subscriptions.

```sql
CREATE TABLE service_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id), -- FK to people table
  slots INTEGER DEFAULT 1, -- Number of slots occupied
  is_owner BOOLEAN DEFAULT false, -- Whether this person is the payer
  CONSTRAINT service_members_person_id_fkey FOREIGN KEY (person_id) REFERENCES people(id)
);
```

**Note:** After migration (2026-02-03), `profile_id` was renamed to `person_id` for consistency.

## Key Relationships

1. **People ↔ Accounts**: `accounts.owner_id → people.id`
2. **Transactions ↔ Accounts**: `transactions.account_id → accounts.id`
3. **Transactions ↔ People**: `transactions.person_id → people.id` (for debt/repayment)
4. **Transactions ↔ Shops**: `transactions.shop_id → shops.id`
5. **Service Members ↔ People**: `service_members.person_id → people.id` ✨ **(Updated 2026-02-03)**
6. **Service Members ↔ Subscriptions**: `service_members.service_id → subscriptions.id`
7. **Installments**: `transactions.parent_transaction_id → transactions.id`
8. **Refunds/Repayments**: `transactions.linked_transaction_id → transactions.id`

## Business Logic Notes

### Service Distribution (Subscriptions)
- Each service has members with allocated slots
- Owner pays the full amount upfront
- System creates transactions:
  - **1 expense** for owner (from Draft Fund)
  - **N debt** transactions for non-owner members
- Uses FIFO idempotency check via `metadata.service_id + member_id + month_tag`
- Auto-syncs to Google Sheets if configured

### Debt Repayment (FIFO)
- When a person repays debt, the system automatically links to the oldest unpaid debt transaction.
- Uses FIFO (First In, First Out) cascading logic.
- Receivable accounts are auto-selected based on `owner_id`.

### Cashback Tracking
- Only `credit_card` accounts participate in cashback.
- Cashback is calculated as: `amount × cashback_rate / 100`
- `final_price = amount - cashback_amount`

### Installments
- Parent transaction creates child transactions for each month.
- Child transactions link back via `parent_transaction_id`.
- Each child has `installment_current` (1, 2, 3...) and `installment_months` (total).

### Batch Import
- Detects duplicates based on: `amount`, `transaction_date`, `details` (fuzzy match).
- Allows manual mapping of bank names to accounts.

## RLS Policies

All tables have Row Level Security enabled. Users can only access their own data via `user_id` checks.

## Indexes

Key indexes for performance:
- `transactions(transaction_date DESC)`
- `transactions(account_id, transaction_date DESC)`
- `transactions(person_id, status)`
- `cashback_cycles(account_id, cycle_tag)`

---

**Note:** This schema is a living document. Always verify against production using:
```bash
npx supabase db dump --db-url $DATABASE_URL -f database/schema.sql
```
