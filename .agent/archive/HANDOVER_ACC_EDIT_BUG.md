# Handover: Account Edit & Cashback Toggle Bug

## 🔴 Current Critical Issue
Despite refactoring the cashback system to use dedicated DB columns (`cb_type`, `cb_base_rate`, etc.), the **Edit Account UI (AccountSlideV2)** fails to correctly reflect the saved state.

**Symptoms:**
1. User toggles "Chính sách Hoàn tiền" (Cashback Policy) -> ON.
2. Sets mode to "Tiered" or "Simple".
3. Enters values (Rate, Rules, etc.).
4. Clicks Save. Toast says "Success".
5. Reloads page or re-opens Edit Slide.
6. **Result:** Toggle is OFF. Values like "Base Rate" appear empty or default.

## 🔍 Debugging Evidence
The database **IS UPDATING CORRECTLY**.
The user provided this JSON dump of the "Vcb Signature" account from the DB:

```json
[
  {
    "idx": 23,
    "id": "40c3998b-7550-414c-be42-fe93ed767a06",
    "name": "Vcb Signature",
    "type": "credit_card",
    "cb_type": "tiered",             <-- DB HAS DATA
    "cb_base_rate": "0",
    "cb_max_budget": "0",
    "cb_is_unlimited": true,
    "cb_rules_json": "[{\"id\": \"m2r4uac9c\", \"name\": \"Bậc 1\", \"rules\": [...]}]",
    "cashback_config": "{\"program\": {...}}", <-- LEGACY CONFIG ALSO EXISTS
    "statement_day": 21,
    "created_at": "2025-11-30..."
  }
]
```

**Conclusion:**
- The Backend (`account.service.ts`, `account-actions.ts`) **works**. It saves to `cb_type` and `cb_rules_json` correctly.
- The Frontend (`AccountSlideV2.tsx`) **fails to read/initialize** the state from these new columns correctly, or is being overwritten by the legacy `cashback_config` parsing logic.

## 🛠️ Changes Implemented (To Be Reviewed)

### 1. Database Schema
Added independent columns to `accounts` table to move away from `jsonb` blob.
- `cb_type`: 'none' | 'simple' | 'tiered'
- `cb_base_rate`: numeric
- `cb_max_budget`: numeric
- `cb_rules_json`: jsonb (for tiered levels)
- `statement_day`: integer (Derived from credit card settings, made independent)
- `due_date`: integer (Derived from credit card settings, made independent)
- `current_balance`: Now updated via Trigger (moved away from on-the-fly calc).

**Migrations created:**
- `supabase/migrations/20260214_cashback_refactor_columns.sql`
- `supabase/migrations/20260214_extract_statement_due_columns.sql`
- `supabase/migrations/20260214_trigger_based_balance_update.sql`

### 2. Service Layer (`src/services/account.service.ts`)
- Updated `getAccountDetails` and `getAccounts` to SELECT these new columns.
- Updated `updateAccountConfig` to WRITE to these columns.

### 3. UI Layer (`src/components/accounts/v2/AccountSlideV2.tsx`)
- Logic added to `loadFromAccount` to prefer `acc.cb_type` over `acc.cashback_config`.
- **Suspected Bug Location:** The logic in `loadFromAccount` specifically around:
  ```typescript
  const rawCbType = acc.cb_type || (acc.cashback_config ? 'simple' : 'none');
  const isActuallyAdvanced = (rawCbType === 'tiered' || ...);
  setIsCashbackEnabled(rawCbType !== 'none');
  ```
  It seems `acc.cb_type` might be `undefined` coming from the component props (`account` prop vs `fresh` fetch).

## ⏭️ Next Steps for Agent
1. **Verify Prop Mapping:** Check `AccountDirectoryV2` or wherever `AccountSlideV2` is invoked. Ensure the `account` object passed prop actually contains the `cb_type` field. If the parent component fetches data using a query that *missed* the new columns, `acc.cb_type` will be undefined on first render.
2. **Check `useEffect` flow:** distinct `loadFromAccount` calls happen: one from props, one from `getAccountDetails` refetch. Console log both to see which one is resetting the state to "OFF".
3. **Fix the Toggle:** Ensure `setIsCashbackEnabled` is robustly set to `true` if `cb_type` is present.

## 🧪 reproduction
1. Open Accounts Page.
2. Edit "Vcb Signature".
3. Toggle Cashback ON. Set "Tiered". Add a Level.
4. Save.
5. Setup is saved to DB (verified).
6. Re-open Edit.
7. **Expectation:** Cashback ON, Tiered Mode.
8. **Actual:** Cashback OFF.
