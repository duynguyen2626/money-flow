# PocketBase Migration Refactoring Plan
**Date**: March 8, 2026  
**Status**: Clean branch `feat/pb-refactor-clean-20260308` from stable baseline  
**Goal**: Systematic, phased migration from Supabase → PocketBase with proper fallback pattern

## 🎯 Strategy Overview

### Why We're Starting Fresh
Current `agent/pb-migration` branch has too many quick patches/workarounds:
- ❌ 27 TypeScript errors (type safety broken)
- ❌ 404 errors from schema mismatches
- ❌ No unified fallback pattern
- ❌ Multiple partial rewrites without coherent design

### New Approach
**"Understand First, Code Once"**
1. **Document** actual PB collections structure (from admin)
2. **Plan** FK dependencies (what depends on what)
3. **Implement systematically** with unified fallback pattern
4. **Test thoroughly** before moving to next phase
5. **Use consistent patterns** across all services

---

## 📊 Database Architecture Analysis

### Supabase Schema (Current State - Stable Baseline)

**Core Tables & Dependencies**:
```
people (standalone)
  ↓
accounts (FK: owner_id → people.id)
  ↓
├─ categories (standalone, has FK references BUT not critical)
├─ shops (standalone, has FK references BUT not critical)
└─ transactions (FKs: account_id, dest_account_id → accounts.id)
                        category_id → categories.id
                        shop_id → shops.id
                        person_id → people.id

Leaf tables:
  - cashback_entries (FK: transaction_id)
  - cashback_cycles (FK: account_id)
  - transaction_lines (FK: transaction_id)
  - split_bill_rows (FK: transaction_id, person_id)
```

### PocketBase Collections (Target State)
**Assumption**: PB has equivalent collections with possible schema differences:
- Collections follow 1:1 with Supabase tables (accounts, transactions, etc.)
- JSON columns may be used for metadata (e.g., `accounts.cashback_config` as JSON)
- Relations use foreign keys similar to Supabase
- Some fields might be renamed or reorganized

---

## 🔄 Refactoring Phases

### Phase 1: Foundation Tables (No Dependencies)
**Duration**: 1-2 days  
**Risk Level**: LOW  
**Tables**: `categories`, `shops`, `people`

**Why Start Here?**
- No internal dependencies
- Safe to test fallback pattern without affecting data flow
- Can validate PB-first, SB-fallback pattern early

**Files to Modify**:
- `src/services/category.service.ts` → Add PB read (try PB → catch → fallback SB)
- `src/services/shop.service.ts` → Add PB read
- `src/services/people.service.ts` → Add PB read

**Pattern Template**:
```typescript
// category.service.ts
export async function getCategories() {
  try {
    console.log('[source:PB] Reading categories')
    return await getPocketBaseCategories() // New helper
  } catch (err) {
    console.warn('[source:PB] Failed, fallback to SB:', err)
    console.log('[source:SB] Reading categories')
    const supabase = createClient()
    return await supabase.from('categories').select('*')
  }
}

// src/services/pocketbase/category.service.ts (NEW)
export async function getPocketBaseCategories() {
  const records = await pocketbaseList('categories', {})
  return records.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type, // enum: 'income' | 'expense' | 'transfer'
    // ... map other fields
  }))
}
```

**Testing After Phase 1**:
- ✅ Categories load correctly
- ✅ Fallback works when PB is slow/down
- ✅ No TypeScript errors
- ✅ Type inference works properly

---

### Phase 2: Foundational Accounts (FK Source)
**Duration**: 2-3 days  
**Risk Level**: MEDIUM (will break dependent queries if schema wrong)  
**Tables**: `accounts`, `cashback_cycles`

**Why Phase 2?**
- `accounts` is referenced by nearly everything
- Once working, can use it to validate other collections
- But independent of transactions itself

**Files to Modify**:
- `src/services/account.service.ts` → Add PB read + FK handling
- Create `src/services/pocketbase/account.service.ts` → PB account helpers
- Update `src/services/people.service.ts` → Now PB-first for owner FK validation

**Key Challenges**:
- **JSON Columns**: PB may store `cashback_config` as JSON object
  ```typescript
  // Supabase: separate tables
  SELECT a.*, cc.* FROM accounts a 
  LEFT JOIN cashback_cycles cc ON a.id = cc.account_id
  
  // PocketBase: might be:
  SELECT * FROM accounts (with cashback_config: {cycles: [...], program: {...}})
  ```

- **Account Cycles**: May need to split or restructure
  - PB might have `cashback_cycles` as separate collection
  - Or embedded in `accounts.cashback_config.cycles` array

**Action**:
1. Get Supabase schema via curl to understand exact structure
2. Ask admin for PB collection export
3. Map Supabase `JOIN` queries → PB nested/expand queries

**Testing After Phase 2**:
- ✅ Accounts load with all metadata
- ✅ Owner relationships resolve correctly
- ✅ Cashback cycles accessible
- ✅ Dashboard loads account summary (no transactions yet)

---

### Phase 3: People & Relationships (Complex FK)
**Duration**: 1-2 days  
**Risk Level**: MEDIUM (affects debt calculations)  
**Tables**: `people` (with relationships through transactions/debts)

**Why Phase 3?**
- Depends on accounts working
- Debt calculations aggregate from transactions (Phase 4)
- But people data itself is independent

**Files to Modify**:
- `src/services/people.service.ts` → PB read, but keep SB debt aggregation method
- Create `src/services/pocketbase/people.service.ts`

**Key Complexity**:
- People might have group relationships (`group_parent_id` FK)
- Sheet links and metadata
- Aggregating debt requires transaction queries (defer to Phase 4)

**Pattern**:
```typescript
// people.service.ts
export async function getPeople(options?: { includeArchived?: boolean }) {
  try {
    console.log('[source:PB] Reading people')
    const pbPeople = await getPocketBasePeople()
    return pbPeople
  } catch (err) {
    console.warn('[source:PB] Failed, fallback to SB:', err)
    console.log('[source:SB] Reading people')
    // For now, don't aggregate debt - return basic people
    // Will add debt aggregation in Phase 4
  }
}

// For debt aggregation (keep Supabase-based until Phase 4):
export async function getPeopleWithDebt(accountId: string) {
  const people = await getPeople()
  const debts = await calculatePersonDebts(accountId) // Still uses SB tx queries
  return people.map(p => ({
    ...p,
    debt: debts[p.id] || 0
  }))
}
```

**Testing After Phase 3**:
- ✅ People list loads
- ✅ Group relationships show
- ✅ Archived filter works
- ✅ Debt still calculates (via SB transactions)

---

### Phase 4: Transactions Core (Most Complex - FK Hub)
**Duration**: 3-5 days  
**Risk Level**: HIGH (touches everything, most prone to 404/data loss)  
**Tables**: `transactions`, `transaction_lines`, `split_bill_rows`

**Why Phase 4?**
- Acts as FK hub (references: accounts, categories, shops, people)
- Most complex query patterns (filters, sorting, pagination)
- Once working, enables all other features
- **MUST** have solid fallback for resilience

**Critical Sub-Phases**:

#### 4a: Read-Only Transaction Queries (1-2 days)
Implement resilient query fallback for reads FIRST.

**Files to Create**:
- `src/services/pocketbase/transaction.service.ts` → Unified transaction readers
- `src/services/pocketbase/transaction-fallback.ts` → Multi-variant query attempts

**Implement Fallback System** (critical!):
```typescript
// transaction-fallback.ts
function buildTransactionQueryAttempts(params: {
  accountId?: string
  filter?: string
  sort?: string
  expand?: string[]
}) {
  const attempts = []
  
  // Attempt 1: Full query with all expands
  attempts.push({
    ...params,
    expand: ['account_id', 'dest_account_id', 'category_id', 'shop_id', 'person_id']
  })
  
  // Attempt 2: Minimal expands (safer)
  attempts.push({
    ...params,
    expand: ['account_id', 'category_id']
  })
  
  // Attempt 3: No expands
  attempts.push({
    ...params,
    expand: undefined
  })
  
  // Attempt 4: Try alternate sort
  if (params.sort?.includes('-created')) {
    attempts.push({
      ...params,
      sort: params.sort.replace('-created', '-date')
    })
  }
  
  // Return deduplicated attempts
  return [... new Set(attempts)]
}

export async function listTransactionsWithFallback(params) {
  const attempts = buildTransactionQueryAttempts(params)
  
  for (const attempt of attempts) {
    try {
      return await pocketbaseList('transactions', attempt)
    } catch (error) {
      if (!is404Or400(error)) throw error // Rethrow non-recoverable errors
      console.warn(`Query attempt failed (${attempt.sort}), trying next...`)
    }
  }
  
  // All PB attempts failed, fallback to Supabase
  console.warn('[source:fallback] All PB attempts failed, using Supabase')
  const supabase = createClient()
  return await supabase.from('transactions').select('*').eq('account_id', params.accountId)
}
```

**Files to Test in Phase 4a**:
- `/transactions` page (transaction list)
- `/accounts/[id]` page (account detail transactions)
- `/people/[id]` page (person detail transactions)

**Testing After 4a**:
- ✅ Remove `-created` sort, use `-date` instead
- ✅ Try with minimal expands
- ✅ Fallback kicks in gracefully
- ✅ No 404/400 errors visible to user

#### 4b: Write Paths (1-2 days after 4a)
After reads are stable, add PB writes.

**Files**:
- Update `src/services/transaction.service.ts` → Dual-write (PB primary, SB secondary)
- Update `src/actions/transaction-actions.ts` → Server action mutations

**Pattern**:
```typescript
export async function createTransaction(input: CreateTransactionInput) {
  // Primary: Write to SB (generates UUID)
  const result = await supabase.from('transactions').insert([
    { ...input, source_id: crypto.randomUUID() }
  ]).select().single()
  
  // Secondary: Async write to PB (fire-and-forget)
  createPocketBaseTransaction(result.id, input)
    .catch(err => console.error('[source:PB] Secondary write failed:', err))
  
  return result
}
```

**Testing After 4b**:
- ✅ Create transaction works
- ✅ Update transaction works
- ✅ Void/delete works
- ✅ Both PB and SB stay in sync
- ✅ SB write succeeds even if PB fails

#### 4c: Refund Chain & Installments (1 day)
After basic CRUD works, handle edge cases.

**Key Rules**:
- Refund chain: Parent → Void → Refund (strict ordering)
- Installments: Don't double-count parent + children
- Splits: Handle split_bill_rows correctly

**Testing After 4c**:
- ✅ Void parent fails if children exist
- ✅ Delete children first, then void parent
- ✅ Refunds calculate correctly
- ✅ Split transactions show correct balances

---

### Phase 5: Cashback & Analytics (Feature Enrichment)
**Duration**: 2-3 days  
**Risk Level**: LOW (on top of stable transaction layer)  
**Tables**: `cashback_entries`, `cashback_cycles`, transaction metadata

**Why Phase 5?**
- Only meaningful once transactions work
- Enhances reporting but doesn't affect core data

**Files**:
- `src/services/cashback.service.ts` → PB-first cashback policy resolution
- `src/services/cashback-analytics.service.ts` → PB transaction aggregation

**Key Complexity**:
- 3-tier cashback policy matching (category rule → level default → program default)
- Cycle reconciliation (statement day vs calendar month)
- Metadata storage (`policySource`, `rate`, `ruleId`, etc.)

**Testing After Phase 5**:
- ✅ Cashback policies resolve correctly
- ✅ Metrics show correct estimated vs earned
- ✅ Category-based rules match properly
- ✅ Cycle boundaries handle transitions

---

### Phase 6: Integration & Batch Operations (Operational Features)
**Duration**: 2-3 days  
**Risk Level**: MEDIUM (bulk operations can affect multiple records)  
**Tables**: All (batch upsert, import/export)

**Why Phase 6?**
- Only after all core services work
- Batch operations are critical for data imports

**Files**:
- `src/services/batch.service.ts` → Bulk import with PB dual-write
- `src/services/split-bill.service.ts` → Split bill operations

**Testing After Phase 6**:
- ✅ Batch import deduplicates correctly
- ✅ Both PB and SB get synced
- ✅ Split bill calculations correct
- ✅ No duplicate transactions from retry

---

## 📋 Implementation Checklist

### Pre-Phase Setup (Do First)
- [ ] Create `src/services/pocketbase/` folder structure
- [ ] Create fallback utilities:
  - `src/lib/pocketbase/server.ts` (PB client)
  - `src/lib/pocketbase/fallback-helpers.ts` (retry logic)
- [ ] Create `docs/collections/SCHEMA.md` (schema reference)
- [ ] Create `docs/collections/FK_DEPENDENCIES.md` (relationship map)
- [ ] Add `console.log('[source:PB]')` and `[source:SB]` logging throughout

### Phase 1 Checklist
- [ ] Create `getPocketBaseCategories()`
- [ ] Create `getPocketBaseShops()`
- [ ] Create `getPocketBasePeople()`
- [ ] Add PB-first try/catch pattern to each service
- [ ] Test all 3 services work with fallback
- [ ] No TypeScript errors

### Phase 2 Checklist
- [ ] Create `getPocketBaseAccounts()` with FK expansion
- [ ] Handle JSON config fields (if applicable)
- [ ] Create `getPocketBaseAccountDetail()` (with cycles)
- [ ] Test account summary loads
- [ ] No TypeScript errors

### Phase 3 Checklist
- [ ] Update `getPeople()` to use PB
- [ ] Keep debt aggregation on SB (for now)
- [ ] Test people list loads
- [ ] Group relationships resolve
- [ ] No TypeScript errors

### Phase 4a Checklist (Reads)
- [ ] Create transaction query fallback system
- [ ] Test `/transactions` page loads
- [ ] Test `/accounts/[id]` transactions load
- [ ] Test `/people/[id]` transactions load
- [ ] No 400/404 errors
- [ ] Fallback logs when attempted
- [ ] No TypeScript errors

### Phase 4b Checklist (Writes)
- [ ] Add PB dual-write to `createTransaction()`
- [ ] Add PB dual-write to `updateTransaction()`
- [ ] Add PB dual-write to `voidTransaction()`
- [ ] Test create works
- [ ] Test update works
- [ ] Test void works
- [ ] Both PB and SB updated

### Phase 4c Checklist (Edge Cases)
- [ ] Void parent fails with children
- [ ] Delete children works
- [ ] Refund chain works
- [ ] Installments don't double-count
- [ ] Splits calculate correctly

### Phase 5 Checklist
- [ ] Cashback policies resolve
- [ ] Cycle reconciliation works
- [ ] Metrics calculate correctly
- [ ] Header card shows right values

### Phase 6 Checklist
- [ ] Batch import deduplicates
- [ ] Both DBs in sync
- [ ] Split bill operations work
- [ ] No data loss on retry

---

## 🛠️ Key Utilities to Build

### 1. Fallback Query System
```typescript
// src/lib/pocketbase/fallback-helpers.ts
export function isPocketBase400Or404(error: unknown): boolean {
  return (error as any)?.status === 400 || (error as any)?.status === 404
}

export async function executeWithFallback<T>(
  pbQuery: () => Promise<T>,
  sbQuery: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    console.log(`[source:PB] ${context}`)
    return await pbQuery()
  } catch (error) {
    if (isPocketBase400Or404(error)) {
      console.warn(`[source:PB] ${context} failed, fallback to SB`, error)
      console.log(`[source:SB] ${context}`)
      return await sbQuery()
    }
    throw error
  }
}
```

### 2. ID Mapping Utility
```typescript
// src/lib/pocketbase/id-mapper.ts
export function toPocketBaseId(supabaseUuid: string): string {
  // If PB IDs are different format, implement mapping here
  // For now, assume they're the same
  return supabaseUuid
}

export async function fromPocketBaseId(pbId: string, supabaseTable: string): Promise<string> {
  // Reverse lookup via metadata.source_id if needed
  return pbId
}
```

### 3. Model Mappers
```typescript
// src/lib/pocketbase/mappers.ts
export function mapPBTransaction(record: any): Transaction {
  return {
    id: record.id,
    type: record.type,
    amount: record.amount,
    accountId: record.account_id,
    destAccountId: record.dest_account_id || record.to_account_id,
    categoryId: record.category_id,
    personId: record.person_id,
    // ... map other fields
  }
}
```

---

## 📝 Documentation Needed

### docs/collections/SCHEMA.md
```markdown
# PocketBase Collections Schema

## accounts
- id (text, pk)
- name (text)
- type (text enum)
- current_balance (number)
- credit_limit (number)
- owner_id (text, fk→people)
- cashback_config (json)
- is_archived (bool)
- created (datetime)

## transactions
- id (text, pk)
- type (text enum)
- amount (number)
- account_id (text, fk→accounts)
- dest_account_id (text, fk→accounts)
- ...
```

### docs/collections/FK_DEPENDENCIES.md
```markdown
# Foreign Key Dependencies

accounts → people (owner_id)
transactions → accounts (account_id, dest_account_id)
transactions → categories (category_id)
transactions → shops (shop_id)
transactions → people (person_id)
...
```

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't** write directly to PB in Phase 1-3 (read-only first)
2. **Don't** use `select('*')` - explicitly list columns
3. **Don't** assume field names match Supabase (might be renamed)
4. **Don't** skip fallback testing (test with PB down)
5. **Don't** merge phases (finish each thoroughly before next)
6. **Don't** remove Supabase code until PB is 100% working
7. **Don't** ignore console logs (they show data flow)

---

## ✅ Definition of Done (Per Phase)

Each phase is "done" when:
- [ ] All code compiles with zero TypeScript errors
- [ ] All services have logging placeholders ([source:PB] / [source:SB])
- [ ] Fallback works (tested with PB unavailable)
- [ ] Related UI pages load without errors
- [ ] No type casting with `any`
- [ ] PR reviewed and approved
- [ ] Commit message explains what + why

---

## 📅 Timeline Estimate

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Setup | 0.5 day | Mar 8 | Mar 8 PM |
| Phase 1 | 1-2 days | Mar 8 PM | Mar 10 AM |
| Phase 2 | 2-3 days | Mar 10 AM | Mar 12 PM |
| Phase 3 | 1-2 days | Mar 12 PM | Mar 13 PM |
| Phase 4 | 5-7 days | Mar 13 PM | Mar 19 |
| Phase 5 | 2-3 days | Mar 19 | Mar 22 |
| Phase 6 | 2-3 days | Mar 22 | Mar 25 |
| **Total** | **~16-22 days** | Mar 8 | Mar 25 |

---

## 🚀 Next Steps (Right Now)

1. **Update managed_todo_list** with this phase plan
2. **Create folder structure**: `src/services/pocketbase/`
3. **Get PB schema** from admin (export collections as JSON)
4. **Create** `docs/collections/` reference documents
5. **Start Phase 1** with category.service.ts refactor
