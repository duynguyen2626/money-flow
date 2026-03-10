# PocketBase Migration Progress - March 2026

## 🔴 Critical Update - 2026-03-10 (Transactions Remigration Required)

### Implementation update (done)
- Added new script: `scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs`
- Added runbook: `TRANSACTION_REMIGRATE_GUIDE.md`
- Updated schema blueprint: `scripts/pocketbase/schema.json` (transactions fields)

### Why old sync path is blocked
- `node scripts/pocketbase/migrate.mjs --sync-schema` currently fails at `accounts` collection update (400 validation), so global schema sync cannot finish.
- Direct transactions patch can also fail when field type changes are required (`validation_field_type_change`).

### New execution path (authoritative)
1. Recreate transactions collection + remigrate in one pass:
  - `node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --recreate-collection --reset --apply`
2. Validation-only pass after recreate:
  - `node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --reset --limit=100`

### Script guarantees
- Canonical identity: `metadata.source_id` (SB UUID)
- Reset mode supported (`--reset`)
- Optional cycle remigrate (default on, disable with `--skip-cycles`)
- Strict relation guard default on (disable with `--no-strict-relations`)
- Integrity summary: created/updated/skipped/unresolved/formula-mismatch

### What happened
- Backfill script completed with `Total processed: 307`, `Updated: 0`, `Errors: 307`.
- All errors are `PB transaction not found` for Supabase transaction UUID inputs.

### Root cause (confirmed)
- Current backfill relies on deterministic UUID → PB id hashing for `transactions`.
- Existing `transactions` records in PocketBase were not created from that deterministic id path (or were recreated with PB auto ids), so hash lookup cannot find records.
- Result: zero updates; old metadata fallback can hide this partially, but migration state is inconsistent.

### Decision
- Stop patching old backfill.
- Execute full **transactions collection reset + schema remap + clean remigration**.
- Keep `accounts`, `people`, `shops`, `categories` collections intact; only rebuild `transactions` path.

### Execution Plan (authoritative)
1. **Freeze writes**
  - Stop UI writes/import jobs while migration runs.
2. **Export backup**
  - Export current PB `transactions` + related cashback collections for rollback.
3. **Drop & recreate PB transactions collection**
  - Recreate field map with required columns:
    - Core: `date`, `occurred_at`, `amount`, `final_price`, `type`, `status`, `note`
    - Relations: `account_id`, `to_account_id`, `category_id`, `shop_id`, `person_id`, `parent_transaction_id`
    - Cycle/Cashback: `persisted_cycle_tag`, `debt_cycle_tag`, `cashback_share_percent`, `cashback_share_fixed`, `cashback_mode`, `cashback_amount`
    - Metadata: `metadata` (must include `source_id` = Supabase UUID)
4. **Re-migrate transactions from Supabase with deterministic strategy**
  - Upsert by `metadata.source_id` first, not by hashed id lookup.
  - Resolve all relation IDs (`account_id`, `person_id`, etc.) to current PB IDs before insert.
  - Recompute/store `final_price` from source values without changing cashback formula semantics.
5. **Post-migration integrity checks**
  - Row count parity: SB transactions vs PB transactions.
  - Sample verify account details pages (`/accounts/[id]`) and people details pages (`/people/[id]`).
  - Validate cashback stats and annual fee progress unchanged vs pre-reset baseline.
6. **Enable writes and monitor**
  - Re-enable normal app writes after checks pass.

### Guardrails for new script
- Do not derive transaction identity from PB id hashing.
- Transaction identity key = `metadata.source_id`.
- Relation mapping must fail-fast with explicit error logs per missing relation.
- Emit summary metrics: inserted, updated, skipped, unresolved-relations, formula-mismatch.
- Include `--dry-run`, `--limit`, `--only-id` options for controlled rollout.

### Task B status
- **Task B (clear-all dropdown bug)** is intentionally paused until transactions remigration stabilizes.
- Resume only after account/people detail flows pass validation.

## Executive Summary
**Branch:** `feat/pb-refactor-clean-20260308`  
**Status:** Phase 1 Complete - Accounts & Transactions Migrated  
**Next Phase:** Complete CRUD migration for People, Categories, Shops, Batch

---

## ✅ Completed Migrations

### 1. **Accounts System** (100% Complete)
**Route:** `/accounts` and `/accounts/[id]`  
**Data Source:** PocketBase Primary, Supabase Fallback

#### Migrated Components:
- ✅ `src/app/accounts/page.tsx` - Account directory listing
- ✅ `src/app/accounts/[id]/page.tsx` - Account detail view
- ✅ `src/components/accounts/v2/AccountDirectoryV2.tsx` - Grid/table view
- ✅ `src/components/accounts/v2/AccountDetailViewV2.tsx` - Detail UI
- ✅ `src/components/accounts/v2/AccountGridView.tsx` - Card grid
- ✅ `src/components/accounts/v2/AccountTableV2.tsx` - Table view

#### Service Layer:
- ✅ `src/services/pocketbase/account-details.service.ts` - Core PocketBase service
  - `getPocketBaseAccounts()` - List all accounts
  - `getPocketBaseAccountDetails(id)` - Single account with stats
  - `getPocketBaseAccountSpendingStatsSnapshot()` - Cashback stats
  - `loadPocketBaseTransactionsForAccount()` - Transaction history
  - `getPocketBaseAccountCycleOptions()` - Cycle dropdown data
  - `resolvePocketBaseAccountRecord()` - **Multi-strategy ID resolution**

#### ID Resolution Strategy (Critical):
```typescript
// Handles both Supabase UUID and PocketBase IDs
async function resolvePocketBaseAccountRecord(id: string): Promise<PocketBaseRecord | null> {
  // Try 1: Direct PocketBase ID lookup
  try { return await pocketbaseGetById('accounts', id) } catch {}
  
  // Try 2: Hash Supabase UUID → PocketBase ID
  const hashedId = toPocketBaseId(id, 'accounts')
  try { return await pocketbaseGetById('accounts', hashedId) } catch {}
  
  // Try 3: Filter by slug field (slug = original Supabase UUID)
  try {
    const records = await pocketbaseList('accounts', { filter: `slug='${id}'` })
    return records.items[0] || null
  } catch {}
  
  return null
}
```

#### Mapping Functions:
- `mapAccount(record)` - Returns `id: record.slug || record.id` (prefers source ID)
- `mapCategory(record)` - Returns `id: record.slug || record.id`
- `mapPerson(record)` - Returns `id: record.slug || record.id`
- `mapShop(record)` - Returns `id: record.slug || record.id`
- `mapTransaction(record, accountId)` - Preserves source IDs in relationships

#### Features Verified:
- ✅ Account listing with balances
- ✅ Credit card utilization calculation
- ✅ Cashback stats display
- ✅ Transaction history loading
- ✅ Cycle filtering
- ✅ Account relationships (parent/child)
- ✅ Annual fee waiver tracking
- ✅ **Old Supabase UUID URLs work** (via ID resolver)

---

### 2. **Sidebar Search** (100% Complete)
**Route:** N/A - Navigation Component  
**Data Source:** PocketBase for Accounts, Supabase for People/Shops/Categories (hybrid)

#### Migrated Components:
- ✅ `src/components/navigation/sidebar-search.tsx` - Client component
- ✅ `src/app/api/sidebar/search/route.ts` - Lightweight API endpoint

#### Implementation:
```typescript
// API returns minimal data: {id, name, image_url}
const response = await fetch('/api/sidebar/search')
const { accounts, people, shops, categories } = await response.json()

// Accounts from PocketBase, others from Supabase (until slug schema confirmed)
const [accounts, peopleRes, shopsRes, categoriesRes] = await Promise.all([
  getPocketBaseAccounts(),
  supabase.from('people').select('id,name,image_url'),
  supabase.from('shops').select('id,name,image_url'),
  supabase.from('categories').select('id,name,image_url'),
])
```

---

### 3. **Dev Port Management** (100% Complete)
**Script:** `scripts/dev-port.mjs`

#### Feature:
- Auto-selects available port (priority: 3001 → 3002 → 3003 → 3004 → 3005 → 3000)
- Auto-kills existing Next.js processes before start
- Prevents lock file conflicts

```javascript
const PREFERRED_PORTS = [3001, 3002, 3003, 3004, 3005, 3000] // 3000 is last resort
```

---

### 4. **Dependency Fixes** (100% Complete)
**Fixed Issues:**
- ✅ recharts locked to `3.5.1` (prevents broken 3.6.0 upgrade)
- ✅ react-remove-scroll-bar postinstall repair script
- ✅ Vercel build errors fixed (getCategoriesWithSource → getCategories)

---

## 🚧 Partial Migrations (Hybrid Mode)

### 1. **Categories & Shops** (UI Migrated, CRUD Pending)
**Route:** `/categories`  
**Status:** Read from Supabase, UI uses new system

#### Current State:
- ✅ UI components ready for PocketBase
- ✅ `getPocketBaseCategories()` and `getPocketBaseShops()` available
- ⚠️ CRUD operations still use Supabase service layer
- ⚠️ Need to migrate:
  - `src/services/category.service.ts` CRUD → PocketBase
  - `src/services/shop.service.ts` CRUD → PocketBase
  - Server actions in `src/actions/category-actions.ts`
  - Server actions in `src/actions/shop-actions.ts`

---

## ❌ Not Yet Migrated (Supabase Only)

### 1. **People** (/people)
**Route:** `/people` and `/people/[id]`  
**Status:** 100% Supabase

#### Migration Needed:
- [ ] Create PocketBase service layer for people
- [ ] Migrate `src/services/people.service.ts`
- [ ] Update `src/app/people/page.tsx`
- [ ] Update `src/app/people/[id]/page.tsx`
- [ ] Server actions in `src/actions/people-actions.ts`

#### PocketBase Collection Schema:
```javascript
{
  id: string,           // PocketBase record ID
  slug: string,         // Original Supabase UUID
  name: string,
  image_url: string | null,
  is_owner: boolean,
  is_archived: boolean,
  is_group: boolean,
  group_parent_id: string | null,
  sheet_link: string | null,
  google_sheet_url: string | null,
}
```

---

### 2. **Batch Import** (/batch)
**Route:** `/batch`, `/batch/detail/[id]`, `/batch/mbb`, `/batch/vib`  
**Status:** 100% Supabase

#### Migration Needed:
- [ ] Batch master records
- [ ] Batch items/rows
- [ ] Pending items
- [ ] Import flows
- [ ] MBB/VIB parser integrations

#### Files to Migrate:
- `src/services/batch.service.ts`
- `src/actions/batch-actions.ts`
- `src/app/batch/**`

---

### 3. **Installments** (/installments)
**Route:** `/installments` and `/installments/[id]`  
**Status:** 100% Supabase

#### Migration Needed:
- [ ] Installment plan management
- [ ] Installment line items
- [ ] Parent-child transaction relationships

#### Files to Migrate:
- Transaction service already handles installments
- UI components need PocketBase service calls

---

### 4. **Debt** (/debt)
**Route:** `/debt`  
**Status:** Derived from transactions (already PocketBase-ready)

#### Notes:
- Debt is calculated from transactions, not a separate table
- Service layer: `src/services/debt.service.ts`
- Should work once transactions fully migrated

---

### 5. **Cashback** (/cashback)
**Route:** `/cashback`  
**Status:** Partial (reads from PocketBase cashback_cycles and cashback_entries)

#### Current Implementation:
- Cashback stats come from `getPocketBaseAccountSpendingStatsSnapshot()`
- Cycle data from `getPocketBaseAccountCycleOptions()`
- Policy resolution uses account config from PocketBase

#### Remaining Work:
- [ ] Verify all cashback UI components use PocketBase data
- [ ] Test policy resolution edge cases
- [ ] Validate min spend tracking

---

## 🔑 Critical PocketBase Details

### Collection Names & Fields

#### `accounts`
```javascript
{
  id: string,                    // PB auto-generated
  slug: string,                  // Original Supabase UUID
  name: string,
  type: 'bank' | 'credit_card' | 'ewallet' | 'cash' | 'savings' | 'investment' | 'debt' | 'system',
  currency: string,
  current_balance: number,
  credit_limit: number,
  owner_id: string,
  parent_account_id: string | null,
  secured_by_account_id: string | null,
  is_active: boolean,
  image_url: string | null,
  account_number: string | null,
  
  // Cashback fields
  cashback_config: object | null,
  cashback_config_version: number,
  cb_type: 'none' | 'tiered' | 'flat',
  cb_base_rate: number,
  cb_max_budget: number | null,
  cb_is_unlimited: boolean,
  cb_rules_json: object | null,
  cb_min_spend: number | null,
  cb_cycle_type: 'calendar_month' | 'statement_cycle',
  statement_day: number | null,
  due_date: number | null,
  
  // Holder info
  holder_type: 'me' | 'family' | 'other',
  holder_person_id: string | null,
  
  // Fee tracking
  annual_fee: number | null,
  annual_fee_waiver_target: number | null,
  
  // Stats (computed)
  total_in: number,
  total_out: number,
}
```

#### `transactions`
```javascript
{
  id: string,
  occurred_at: string (ISO 8601),
  date: string,
  note: string | null,
  amount: number,
  final_price: number,
  type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment',
  status: 'posted' | 'pending' | 'void',
  
  account_id: string,             // PB ID
  target_account_id: string | null,
  to_account_id: string | null,
  category_id: string | null,
  shop_id: string | null,
  person_id: string | null,
  parent_transaction_id: string | null,
  
  persisted_cycle_tag: string | null,
  metadata: {
    source_id: string,            // Original Supabase UUID
    ...other_fields
  },
  
  // Expand support
  expand: {
    account_id?: object,
    target_account_id?: object,
    category_id?: object,
    shop_id?: object,
    person_id?: object,
  }
}
```

#### `cashback_cycles`
```javascript
{
  id: string,
  account_id: string,             // PB account ID
  cycle_tag: string,              // e.g., "2025-12"
  spent_amount: number,
  real_awarded: number,
  virtual_profit: number,
  net_profit: number,
  shared_amount: number,
  max_budget: number | null,
  min_spend_target: number | null,
}
```

#### `cashback_entries`
```javascript
{
  id: string,
  transaction_id: string,
  account_id: string,
  base_amount: number,
  final_price: number,
  cashback_amount: number,
  rate: number,
  policy_source: string,
  created_at: string,
  metadata: object,
}
```

### API Endpoints

**Base URL:** `https://api-db.reiwarden.io.vn`  
**Auth:** Email/Password stored in env vars

#### List Records
```http
GET /api/collections/{collection}/records
Query params:
  - page: number
  - perPage: number (max 200)
  - filter: string (PocketBase filter syntax)
  - sort: string (e.g., '-created_at')
  - expand: string (comma-separated relations)
  - fields: string (comma-separated field names)
```

#### Get Single Record
```http
GET /api/collections/{collection}/records/{id}
Query params:
  - expand: string
  - fields: string
```

#### Create Record
```http
POST /api/collections/{collection}/records
Body: JSON object with fields
```

#### Update Record
```http
PATCH /api/collections/{collection}/records/{id}
Body: Partial JSON object
```

#### Delete Record
```http
DELETE /api/collections/{collection}/records/{id}
```

### Service Layer Pattern

```typescript
// 1. Import PocketBase helpers
import { pocketbaseList, pocketbaseGetById, pocketbaseRequest } from '@/services/pocketbase/server'
import { toPocketBaseId } from '@/lib/pocketbase/utils'

// 2. List with pagination
async function listAllRecords(collection: string, params = {}) {
  let page = 1, totalPages = 1, allItems = []
  while (page <= totalPages) {
    const response = await pocketbaseList(collection, { page, perPage: 200, ...params })
    allItems.push(...response.items)
    totalPages = response.totalPages
    page++
  }
  return allItems
}

// 3. Map PocketBase record to app type
function mapRecord(record: PocketBaseRecord): AppType {
  return {
    id: record.slug || record.id,  // Prefer source ID
    name: record.name,
    // ...other fields
  }
}

// 4. Resolve ID (Supabase UUID → PocketBase ID)
async function resolveRecord(id: string) {
  try { return await pocketbaseGetById('collection', id) } catch {}
  const hashedId = toPocketBaseId(id, 'collection')
  try { return await pocketbaseGetById('collection', hashedId) } catch {}
  const results = await pocketbaseList('collection', { filter: `slug='${id}'` })
  return results.items[0] || null
}
```

---

## 🎯 Next Steps for Migration

### Priority 1: Complete People Migration
1. Create `src/services/pocketbase/people.service.ts`
   - `getPocketBasePeople()`
   - `getPocketBasePersonDetails(id)`
   - `createPocketBasePerson(data)`
   - `updatePocketBasePerson(id, data)`
   - `deletePocketBasePerson(id)`
   - `resolvePersonRecord(id)` - ID resolution

2. Update server actions `src/actions/people-actions.ts`
   - Wrap PocketBase service calls
   - Add fallback to Supabase on errors
   - Use `executeWithFallback()` helper

3. Update UI pages
   - `src/app/people/page.tsx`
   - `src/app/people/[id]/page.tsx`

### Priority 2: Complete Categories & Shops CRUD
1. Extend `src/services/pocketbase/account-details.service.ts`
   - Add `updatePocketBaseCategory(id, data)`
   - Add `deletePocketBaseCategory(id)`
   - Add `updatePocketBaseShop(id, data)`
   - Add `deletePocketBaseShop(id)`

2. Update server actions
   - `src/actions/category-actions.ts`
   - `src/actions/shop-actions.ts`

3. Test bulk operations
   - Archive/unarchive
   - Bulk delete with target reassignment

### Priority 3: Batch Import System
1. Create `src/services/pocketbase/batch.service.ts`
2. Migrate batch master and batch items
3. Update parser integrations (MBB, VIB)
4. Test deduplication logic

### Priority 4: Complete Installments
1. Extend transaction service for installment CRUD
2. Update installment UI to use PocketBase data
3. Test parent-child relationship integrity

---

## 🔧 Development Environment

### Required Environment Variables
```bash
# Supabase (fallback)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# PocketBase (primary)
POCKETBASE_URL=https://api-db.reiwarden.io.vn
POCKETBASE_DB_EMAIL=your-email
POCKETBASE_DB_PASSWORD=your-password
```

### Key Commands
```bash
pnpm dev          # Start dev server (auto port selection)
pnpm build        # Production build test
pnpm lint         # ESLint validation
```

### Port Selection
- Prefers: 3001 → 3002 → 3003 → 3004 → 3005
- Last resort: 3000
- Auto-kills existing processes

---

## 📝 Important Notes for Next Agent

### ID Resolution is Critical
**Problem:** URLs contain Supabase UUIDs, but PocketBase uses different IDs  
**Solution:** Always use `resolvePocketBaseRecord()` pattern for any ID-based lookups

### Slug Field Strategy
- PocketBase `slug` field stores original Supabase UUID
- App displays `id: record.slug || record.id` to preserve URLs
- Backfill script ran successfully for accounts (91/91)
- People/shops/categories slug fields may not exist in actual PB schema (verify first)

### Fallback Pattern
```typescript
import { executeWithFallback } from '@/lib/pocketbase/fallback-helpers'

const accounts = await executeWithFallback(
  () => getPocketBaseAccounts(),
  () => getSupabaseAccounts(),
  'accounts'
)
```

### Network Errors are Recoverable
- `fetch failed`, `UND_ERR_SOCKET` errors trigger fallback
- PocketBase 400/404 also trigger fallback
- See `isPocketBase400Or404()` in `fallback-helpers.ts`

---

## 📊 Migration Checklist

### Completed ✅
- [x] Accounts list page
- [x] Account detail page
- [x] Account ID resolution (Supabase UUID → PocketBase)
- [x] Sidebar search optimization
- [x] Dev port auto-selection
- [x] Recharts dependency fix
- [x] Vercel build errors fixed
- [x] Login page UX (email trim, password visibility)

### In Progress 🚧
- [ ] Categories CRUD migration
- [ ] Shops CRUD migration

### Pending ❌
- [ ] People pages migration
- [ ] Batch import system migration
- [ ] Installments UI migration
- [ ] Debt page verification

### Testing Required 🧪
- [ ] All account CRUD operations
- [ ] Transaction history loading
- [ ] Cashback calculations
- [ ] Cycle filtering
- [ ] Category/shop CRUD after migration
- [ ] People CRUD after migration

---

## 🚀 Deployment Notes

### Vercel Environment Variables
Ensure all PocketBase variables are set in Vercel dashboard:
- `POCKETBASE_URL`
- `POCKETBASE_DB_EMAIL`
- `POCKETBASE_DB_PASSWORD`

### Build Validation
- [x] `pnpm build` passes locally
- [x] No TypeScript errors
- [x] No import errors
- [ ] Vercel deployment tested

---

## 📚 Related Documentation
- `.agent/handover/POCKETBASE_API_REFERENCE.md` - API details
- `.agent/handover/POCKETBASE_COLLECTIONS_SCHEMA.md` - Full collection schemas
- `.github/copilot-instructions.md` - Project standards
- `src/services/pocketbase/account-details.service.ts` - Reference implementation
- `src/lib/pocketbase/fallback-helpers.ts` - Fallback patterns

---

**Last Updated:** March 10, 2026  
**Maintainer:** Agent Session 2026-03-10  
**Next Review:** After People/Categories/Shops migration
