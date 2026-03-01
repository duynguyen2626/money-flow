# 📋 Cashback Health Redesign - Master Plan

**Status:** Planning Phase (Code Phase TBD)  
**Branch:** `refactor/cashback-health-redesign`  
**Last Updated:** March 1, 2026  
**Owner:** Nam Dev

---

## Executive Summary

The Cashback Performance section was removed due to **fundamental design flaws** at the DB and code level. This document outlines a comprehensive redesign strategy that will:

1. **Eliminate semantic confusion** between cycle tags and statement cycles
2. **Simplify data flow** from transactions → cashback → analytics
3. **Ensure consistency** across all three tables (transactions, cashback_entries, cashback_cycles)
4. **Build "Cashback Health"** from scratch (no legacy code reuse)

**Timeline:** Analysis Phase (this doc) → Code Design → DB Migration → Implementation

---

## Part 1: Root Cause Analysis (Why It Failed)

### The Core Problem: Semantic Mismatch

**Current System:**
```
persistent_cycle_tag = "2026-02" (ISO date)
↓
But statement_cycle with statementDay=27 means:
  → Starts: 27 JAN 2026 
  → Ends: 26 FEB 2026
↓
User perspective: "27.02 - 26.03" (in Vietnamese date notation)
↓
Code perspective: "ISO 2026-02" (purely based on end date's month)
↓
CONFUSION 💥
```

### Why This Created Chaos

1. **In transactions table:**
   - Transaction on Feb 26 stored as `persisted_cycle_tag: '2026-02'` ✓ Correct
   
2. **In cashback_cycles table:**
   - Created cycle with `cycle_tag: '2026-02'` ✓ Matches

3. **In page.tsx on Mar 1:**
   - Called `getAccountSpendingStats(id, new Date())` without cycleTag
   - Function derived tag from Mar 1 (today) → `'2026-03'` ✗ Wrong!
   - Query: `WHERE persisted_cycle_tag = '2026-03'` → 0 rows
   - Result: All stats = 0

4. **Cascading Zeros:**
   ```
   No transactions found
   ↓ earnedSoFar = 0
   ↓ sharedAmount = 0  
   ↓ netProfit = 0
   ↓ budgetUtilization = 0%
   ```

### Why Previous Fixes Failed

| Attempt | Issue |
|---------|-------|
| **Attempt 1:** Change service layer logic | Didn't address semantic confusion |
| **Attempt 2:** Adjust UI alignment | Only cosmetic, data still 0 |
| **Attempt 3:** Use admin client for queries | RLS wasn't the blocker, tag derivation was |
| **Root cause:** Caller (page.tsx) didn't pass correct cycle tag to service |

---

## Part 2: Database Schema Analysis

### Current Tables

#### `transactions` table

| Column | Type | Purpose | Issue |
|--------|------|---------|-------|
| `id` | UUID | Primary key | ✓ Fine |
| `occurred_at` | TIMESTAMP | When spent | ✓ Fine |
| `amount` | DECIMAL | Amount spent | ✓ Fine |
| `account_id` | UUID | FK to account | ✓ Fine |
| `persisted_cycle_tag` | TEXT | ISO format "YYYY-MM" | ❌ **Semantic conflict** |
| `tag` | TEXT | Legacy tag (legacy \`JAN26\`) | ⚠️ Redundant after ISO conversion |

**Issues:**
- `persisted_cycle_tag` uses ISO date but semantic meaning is statement cycle
- Column name suggests "persisted" but it's actually computed/derived
- No way to look up cycle info from transaction directly

#### `cashback_cycles` table

| Column | Type | Purpose | Issue |
|--------|------|---------|-------|
| `id` | UUID | Primary key | ✓ Fine |
| `account_id` | UUID | FK to account | ✓ Fine |
| `cycle_tag` | TEXT | ISO format "YYYY-MM" | ⚠️ Same semantic issue |
| `spent_amount` | DECIMAL | Aggregated spend | ✓ Fine |
| `real_awarded` | DECIMAL | Real cashback paid | ✓ Fine |
| `virtual_profit` | DECIMAL | Projected cashback | ✓ Fine |
| `max_budget` | DECIMAL | Cycle budget cap | ✓ Fine |

**Issues:**
- `cycle_tag` field semantics unclear (is it the end month? start month?)
- No cycle PERIOD columns (start_date, end_date) for explicit clarity
- Would benefit from denormalization of cycle dates for faster queries

#### `cashback_entries` table

| Column | Type | Purpose | Issue |
|--------|------|---------|-------|
| `id` | UUID | Primary key | ✓ Fine |
| `cycle_id` | UUID | FK to cycle | ✓ Fine |
| `transaction_id` | UUID | FK to transaction | ✓ Fine |
| `account_id` | UUID | FK to account | ✓ Fine |
| `amount` | DECIMAL | Cashback amount | ✓ Fine |
| `mode` | ENUM('real','virtual','voluntary') | Type of cashback | ✓ Fine |
| `metadata` | JSONB | Policy source details | ✓ Fine |

**Issues:**
- None structurally; table design is sound
- The issue is UPSTREAM (cycle tag matching)

---

## Part 3: Data Flow Architecture (Current vs. Proposed)

### Current Data Flow (Problematic)

```
Transaction Created
├─ Determine cycle_tag from date + account config
├─ Store in persisted_cycle_tag (ISO "YYYY-MM")
└─ Update DB

Later: Query Spending Stats
├─ Receive date from caller (e.g., new Date())
├─ Derive cycle_tag from that date again ← PROBLEM: Different date = Different cycle!
├─ Query: WHERE persisted_cycle_tag = derived_tag
└─ Result: Possible mismatch (0 rows)
```

### Proposed Data Flow (Solution)

```
Account Configuration (Setup Phase)
├─ Store: cycleType, statementDay, maxBudget, etc.
└─ Cache: current_cycle_tag (updated nightly or on demand)

Transaction Created
├─ Read account's cashback_config
├─ Calculate cycle range using account's statementDay
├─ Derive cycle_tag from END date of that range
├─ Store in persisted_cycle_tag
└─ Atomically ensure cashback_cycle exists

Query Spending Stats
├─ Read account's current_cycle_tag from cache (or derive fresh)
├─ Query: WHERE persisted_cycle_tag = current_cycle_tag  ← GUARANTEED MATCH
├─ Aggregate earnings, shared, profit
└─ Return stats
```

**Key Differences:**
- ✅ Single source of truth for "current cycle"
- ✅ Query doesn't re-derive; uses cached value
- ✅ No possibility of date mismatch

---

## Part 4: Detailed Design Specification

### Phase 4.1: Database Schema Changes

#### Add: `current_cycle_tag` Column to `accounts` Table

```sql
ALTER TABLE accounts ADD COLUMN current_cycle_tag TEXT;
ALTER TABLE accounts ADD COLUMN current_cycle_start_at TIMESTAMP;  
ALTER TABLE accounts ADD COLUMN current_cycle_end_at TIMESTAMP;
```

**Purpose:**
- Cache the current cycle tag for fast lookup
- Store cycle boundaries explicitly (no more guessing)
- Updated when:
  - Account config changes
  - New cycle starts (scheduled job)
  - Manual refresh

**Example:**
```json
{
  "current_cycle_tag": "2026-02",
  "current_cycle_start_at": "2026-01-27T00:00:00Z",
  "current_cycle_end_at": "2026-02-26T23:59:59Z"
}
```

#### Rename + Clarify: `persisted_cycle_tag` → `statement_cycle_tag`

```sql
ALTER TABLE transactions RENAME persisted_cycle_tag TO statement_cycle_tag;
```

**Why:**
- Name reflects semantic meaning: "statement cycle" not just "date"
- Clearer for developers: `statement_cycle_tag` vs `persisted_cycle_tag`
- Single word "statement" indicates it's tied to account's statement period

#### Add Explicit Cycle Boundaries to `cashback_cycles`

```sql
ALTER TABLE cashback_cycles ADD COLUMN cycle_start_at TIMESTAMP;
ALTER TABLE cashback_cycles ADD COLUMN cycle_end_at TIMESTAMP;
```

**Purpose:**
- Denormalize for explicit cycle boundaries
- Enables queries like: `WHERE occurred_at BETWEEN cycle_start_at AND cycle_end_at`
- Audit trail: know exact cycle period without reverse-deriving from tag

---

### Phase 4.2: Service Layer Architecture

#### New Utility: `CycleTagService`

```typescript
// src/services/cycle-tag.service.ts

/**
 * Deterministic cycle tag derivation with explicit boundaries
 */
export function deriveStatementCycleTag(
  date: Date,
  config: { statementDay: number; cycleType: 'statement_cycle' | 'calendar_month' }
): {
  tag: string,        // e.g., "2026-02"
  startDate: Date,    // 2026-01-27
  endDate: Date,      // 2026-02-26
} {
  const range = getCashbackCycleRange(config, date);
  return {
    tag: formatIsoCycleTag(range.end),
    startDate: range.start,
    endDate: range.end,
  };
}

/**
 * Get current cycle for account (from cache or compute)
 */
export async function getCurrentStatementCycleTag(
  accountId: string,
  options?: { forceRefresh: boolean }
): Promise<string | null> {
  const supabase = createClient();
  
  // Try cache first
  if (!options?.forceRefresh) {
    const { data: account } = await supabase
      .from('accounts')
      .select('current_cycle_tag, cashback_config')
      .eq('id', accountId)
      .single();
    
    if (account?.current_cycle_tag) {
      return account.current_cycle_tag;
    }
  }
  
  // Cache miss or forced refresh: compute fresh
  const { data: account } = await supabase
    .from('accounts')
    .select('cashback_config')
    .eq('id', accountId)
    .single();
  
  if (!account?.cashback_config) return null;
  
  const config = parseCashbackConfig(account.cashback_config);
  const { tag, startDate, endDate } = deriveStatementCycleTag(new Date(), config);
  
  // Update cache
  await supabase
    .from('accounts')
    .update({
      current_cycle_tag: tag,
      current_cycle_start_at: startDate.toISOString(),
      current_cycle_end_at: endDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId);
  
  return tag;
}
```

#### Simplified Spending Stats Service

```typescript
// src/services/cashback-health.service.ts (NEW - replaces old logic)

export async function getCashbackHealthStats(
  accountId: string,
  options?: { cycleTag?: string }
): Promise<CashbackHealthStats | null> {
  // Step 1: Get account config and current cycle
  const { data: account } = await supabase
    .from('accounts')
    .select('cashback_config, current_cycle_tag')
    .eq('id', accountId)
    .single();
  
  if (!account) return null;
  
  // Step 2: Resolve cycle tag (explicit parameter > cached > compute)
  let resolvedCycleTag = options?.cycleTag;
  if (!resolvedCycleTag) {
    resolvedCycleTag = account.current_cycle_tag;
    if (!resolvedCycleTag) {
      resolvedCycleTag = await getCurrentStatementCycleTag(accountId);
    }
  }
  
  if (!resolvedCycleTag) return null;
  
  // Step 3: Fetch cycle metadata
  const { data: cycle } = await supabase
    .from('cashback_cycles')
    .select('*')
    .eq('account_id', accountId)
    .eq('cycle_tag', resolvedCycleTag)
    .single();
  
  // Step 4: Calculate health metrics (ONLY from cycle table)
  // NO transaction re-aggregation - trust recomputeCashbackCycle()
  {
    const spent = cycle?.spent_amount || 0;
    const earned = cycle?.real_awarded || 0;
    const projected = cycle?.virtual_profit || 0;
    const hasBudget = cycle?.max_budget || null;
    const isBudgetExhausted = cycle?.is_exhausted || false;
    
    return {
      cycle: {
        tag: resolvedCycleTag,
        startDate: cycle?.cycle_start_at,
        endDate: cycle?.cycle_end_at,
        spent,
        earned,
        projected,
        budgetRemaining: hasBudget ? Math.max(0, hasBudget - earned) : null,
        isExhausted: isBudgetExhausted,
      }
    };
  }
}
```

---

### Phase 4.3: Component Layer (Cashback Health UI)

#### New Component: `CashbackHealthSection` 

```typescript
// src/components/accounts/v2/CashbackHealthSection.tsx

export function CashbackHealthSection({
  accountId,
  isCreditCard,
  isLoading,
  stats,
}: CashbackHealthSectionProps) {
  return (
    <div className="flex flex-[5] min-w-[420px]">
      <HeaderSection
        label="Cashback Health"
        borderColor="border-emerald-100"
        className="w-full bg-emerald-50/10 !h-[120px] mb-2"
      >
        {isLoading ? (
          <LoadingSpinner label="Analyzing cycle..." />
        ) : stats ? (
          <div className="w-full h-full flex flex-col justify-between p-3">
            {/* Cycle Period */}
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Cycle: {formatCyclePeriod(stats.cycle.startDate, stats.cycle.endDate)}
            </div>
            
            {/* Health Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 flex-1">
              <MetricCard
                label="Spent"
                value={formatCurrency(stats.cycle.spent)}
                color="blue"
              />
              <MetricCard
                label="Earned"
                value={formatCurrency(stats.cycle.earned)}
                color="emerald"
              />
              <MetricCard
                label="Budget Used"
                value={
                  stats.cycle.budgetRemaining !== null
                    ? `${Math.round((stats.cycle.earned / stats.cycle.budgetRemaining) * 100)}%`
                    : 'N/A'
                }
                color={stats.cycle.isExhausted ? 'red' : 'orange'}
              />
            </div>
          </div>
        ) : (
          <NoDataPlaceholder message="No cashback data for this cycle" />
        )}
      </HeaderSection>
    </div>
  );
}
```

---

## Part 5: Migration Strategy

### Step 1: Database Migration (Non-Breaking)

```sql
-- 1. Add new columns
ALTER TABLE accounts 
  ADD COLUMN current_cycle_tag TEXT DEFAULT NULL,
  ADD COLUMN current_cycle_start_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN current_cycle_end_at TIMESTAMP DEFAULT NULL;

ALTER TABLE cashback_cycles
  ADD COLUMN cycle_start_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN cycle_end_at TIMESTAMP DEFAULT NULL;

-- 2. Backfill current_cycle_tag for all active credit card accounts
UPDATE accounts ac
SET 
  current_cycle_tag = cycles.cycle_tag,
  current_cycle_start_at = cycles.cycle_start_at,
  current_cycle_end_at = cycles.cycle_end_at
FROM cashback_cycles cycles
WHERE ac.id = cycles.account_id
  AND ac.type = 'credit_card'
  AND cycles.cycle_tag = (
    SELECT cycle_tag FROM cashback_cycles 
    WHERE account_id = ac.id 
    ORDER BY cycle_tag DESC 
    LIMIT 1
  );

-- 3. Backfill cycle boundaries from derived range
UPDATE cashback_cycles
SET 
  cycle_start_at = (
    SELECT (getCashbackCycleRange(parseCashbackConfig(ac.cashback_config), 
      (cycles.cycle_tag || '-01')::date)).start
    FROM accounts ac 
    WHERE ac.id = cashback_cycles.account_id
  ),
  cycle_end_at = (
    SELECT (getCashbackCycleRange(parseCashbackConfig(ac.cashback_config), 
      (cycles.cycle_tag || '-01')::date)).end
    FROM accounts ac 
    WHERE ac.id = cashback_cycles.account_id
  )
WHERE cycle_start_at IS NULL;

-- 4. (Optional) Rename column in a later phase after code is fully migrated
-- ALTER TABLE transactions RENAME COLUMN persisted_cycle_tag TO statement_cycle_tag;
```

### Step 2: Code Migration (Parallel with DB)

1. **Add cycle-tag.service.ts** with new utility functions
2. **Add cashback-health.service.ts** with simplified logic
3. **Update page.tsx** to use new service (no more cycleTag derivation in caller)
4. **Create CashbackHealthSection component**
5. **Remove old earnedSoFar aggregation logic**
6. **Run integration tests**
7. **Deploy** with both old and new code active (feature flag optional)

### Step 3: Verification Queries

```sql
-- Check: All credit card accounts have current_cycle_tag set
SELECT COUNT(*) as missing_cycle_tags
FROM accounts
WHERE type = 'credit_card' AND current_cycle_tag IS NULL;
-- Expected: 0

-- Check: Cycle boundaries match derivation
SELECT id, cycle_tag, cycle_start_at, cycle_end_at
FROM cashback_cycles
WHERE cycle_start_at IS NULL OR cycle_end_at IS NULL;
-- Expected: 0 rows

-- Check: Sample transaction's cycle tag matches its cycle's tag
SELECT t.id, t.statement_cycle_tag, cc.cycle_tag
FROM transactions t
JOIN cashback_cycles cc ON t.account_id = cc.account_id AND t.statement_cycle_tag = cc.cycle_tag
LIMIT 5;
-- Expected: All rows have t.statement_cycle_tag = cc.cycle_tag
```

---

## Part 6: Implementation Roadmap

### Phase 1: DB Schema & Backfill (1 day)
- [ ] Add new columns to accounts & cashback_cycles
- [ ] Backfill data
- [ ] Verify with migration queries
- [ ] Deploy migration (non-breaking)

### Phase 2: Service Layer (2 days)
- [ ] Create cycle-tag.service.ts with utilities
- [ ] Create cashback-health.service.ts
- [ ] Add unit tests for cycle derivation
- [ ] Test with real account IDs

### Phase 3: Component & Integration (2 days)
- [ ] Create CashbackHealthSection component
- [ ] Update page.tsx to fetch health stats
- [ ] Remove old earnedSoFar code from AccountDetailHeaderV2.tsx
- [ ] Test UI on dev server
- [ ] Visual design review

### Phase 4: Testing & Deployment (1.5 days)
- [ ] E2E tests: Create transaction → Stats appear
- [ ] Verify cycle period displays correctly
- [ ] Test across different statement days (25, 27, 15)
- [ ] Deploy to staging
- [ ] Final QA
- [ ] Deploy to production

**Total Timeline:** 6.5 days (parallelizable)

---

## Part 7: Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| **Zero Stats Fixed** | Earnings > 0 when account has spending |
| **Cycle Consistency** | Tag in transaction = Tag in cycle = Tag in cache |
| **No Regressions** | All other account features work unchanged |
| **Performance** | Stats query < 100ms (cached cycle lookup) |
| **Clarity** | Developers understand cycle tag = statement period |
| **Data Integrity** | No orphaned transactions or cycles |

---

## Part 8: Known Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Backfill data loss** | Could corrupt cycle boundaries | Run backfill on dev first, verify output before prod |
| **Cycle tag mismatch post-migration** | Stats still broken | Validation query checks before deploying |
| **Breaking change to API** | Dependent services fail | No API change - only internal service refactor |
| **Performance regression** | Page load slow | Cache design prevents N+1 queries |
| **Rollback complexity** | Hard to revert if needed | Keep old code path as fallback during transition |

---

## Part 9: Code Reuse Policy

❌ **DO NOT reuse:**
- `earnedSoFarFromTxns` aggregation logic
- Manual transaction filtering in getAccountSpendingStats
- Complex nested stat calculations from old code

✅ **DO reuse:**
- `getCashbackCycleRange()` from lib/cashback.ts
- `formatIsoCycleTag()` from lib/cashback.ts  
- `recomputeCashbackCycle()` from cashback.service.ts (cycle recomputation already correct)
- All database trigger logic (unchanged)

**Rationale:** Old code had design flaws at the CALLER level, not service level. Services work correctly - the problem was how they were called.

---

## Appendix A: Sample Data After Redesign

### Before (Broken)

```json
{
  "transaction": {
    "id": "txn-1",
    "amount": 18480000,
    "occurred_at": "2026-02-26",
    "persisted_cycle_tag": "2026-02"  ← ✓ Correct
  },
  "cycle": {
    "id": "cycle-1",
    "cycle_tag": "2026-02",  ← ✓ Matches
    "spent_amount": 18480000
  },
  "query_date": "2026-03-01",
  "derived_tag_from_query_date": "2026-03",  ← ✗ Wrong!
  "result": "0 transactions found"  ← 💥 Broken
}
```

### After (Fixed)

```json
{
  "account": {
    "current_cycle_tag": "2026-02",  ← ✓ Cached
    "current_cycle_start_at": "2026-01-27",
    "current_cycle_end_at": "2026-02-26"
  },
  "transaction": {
    "id": "txn-1",
    "amount": 18480000,
    "occurred_at": "2026-02-26",
    "statement_cycle_tag": "2026-02"  ← ✓ Renamed for clarity
  },
  "cycle": {
    "id": "cycle-1",
    "cycle_tag": "2026-02",
    "cycle_start_at": "2026-01-27",  ← ✓ Explicit
    "cycle_end_at": "2026-02-26",  ← ✓ Explicit
    "spent_amount": 18480000
  },
  "query": "WHERE statement_cycle_tag = account.current_cycle_tag",
  "result": "18 transactions found, spent 18,480,000"  ← ✅ Works!
}
```

---

## Appendix B: Communication for Stakeholders

**For Users:**
> Your Cashback Health is being redesigned to show accurate spending stats and cycle information. The section will display how much you've earned and your budget status once it's live.

**For Developers:**
> The cycle tag system is being standardized for clarity. Use `CycleTagService.getCurrentStatementCycleTag()` instead of deriving tags in components. Column `persisted_cycle_tag` will be renamed to `statement_cycle_tag` for semantic clarity.

**For QA:**
> Test matrix:
> - Account with statementDay = 27 (current: 27 Jan - 26 Feb cycle)
> - Account with statementDay = 15 (cross-month cycle)
> - Transaction spent on cycle start date
> - Transaction spent on cycle end date
> - Multiple transactions in same cycle

---

## Sign-Off

**Plan Approved By:** [PENDING USER REVIEW]  
**Phase 2 Start Date:** [TBD - after approval]  
**Expected Completion:** [TBD - based on timeline]

---

**Next Step:** Review this plan → Approve/Request Changes → Proceed to Phase 1
