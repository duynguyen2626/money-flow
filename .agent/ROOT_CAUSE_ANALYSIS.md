# 🔴 ROOT CAUSE ANALYSIS: Cashback Stats = 0 Bug

## Problem Statement
- **Symptom:** Cashback stats show `earnedSoFar = 0`, `sharedAmount = 0`, `netProfit = 0` on Account Detail page
- **Database Reality:** Account has transactions with `persisted_cycle_tag: '2026-02'` and cycle has `spent_amount: 18480000`
- **Query Result:** `Transactions found by persisted_cycle_tag: 0` despite these transactions existing
- **Root Cause:** Date mismatch in cycle tag calculation

---

## Root Cause Identified

### **Issue #1: Wrong Date Used for Cycle Tag Derivation**

**Location:** [src/app/accounts/[id]/page.tsx](src/app/accounts/[id]/page.tsx#L66)

```typescript
// ❌ WRONG: Uses TODAY's date
const [allAccounts, categories, people, shops, cashbackStats, transactions] = 
await Promise.all([
  getAccounts(),
  getCategories(),
  getPeople(),
  getShops(),
  getAccountSpendingStats(id, new Date()),  // ← Problem here!
  loadTransactions({ accountId: id, context: 'account', limit: 2000, includeVoided: true }),
])
```

### **Why This Breaks Cycle Tag Matching**

**Scenario:** Today is March 1, 2026. Account has statementDay = 27.

1. **Transaction Created (Feb 26, 2026):**
   - Date: Feb 26
   - Config: { statementDay: 27, cycleType: 'statement_cycle' }
   - Cycle calculation: Jan 27 → Feb 26
   - Cycle tag stored: `formatIsoCycleTag(Feb 26)` → `"2026-02"` ✓
   - persisted_cycle_tag: `"2026-02"` ✓

2. **Stats Query Called (Mar 1, 2026):**
   - Date passed: `new Date()` → Mar 1
   - Config: { statementDay: 27, cycleType: 'statement_cycle' }
   - Cycle calculation: Feb 27 → Mar 26
   - Cycle tag derived: `formatIsoCycleTag(Mar 26)` → `"2026-03"` ✗
   - Query tries to find: `.eq('persisted_cycle_tag', '2026-03')`
   - **Result:** 0 rows (transactions have `'2026-02'`, not `'2026-03'`)

### **Why Account Config IS Available**

The account detail page already fetches account data with cashback config:
```typescript
const account = await getAccountDetails(id)  // Has cashback_config!
```

The config contains:
```json
{
  "cycleType": "statement_cycle",
  "statementDay": 27
}
```

---

## The Fix: Pass Correct Cycle Tag

### **Solution A: Use Account Config to Derive Correct Cycle Tag** (Recommended)

The `getAccountSpendingStats` function **already supports** a `cycleTag` parameter:

```typescript
export async function getAccountSpendingStats(
  accountId: string, 
  date: Date, 
  categoryId?: string, 
  cycleTag?: string  // ← This parameter exists!
): Promise<AccountSpendingStats | null>
```

**Fix:** Derive the correct cycleTag from account config BEFORE calling the function:

```typescript
// Step 1: Parse account config to get cycleType & statementDay
const config = parseCashbackConfig(account.cashback_config);

// Step 2: Calculate the cycle range for TODAY using account's config
const cycleRange = getCashbackCycleRange(
  { cycleType: config.cycleType, statementDay: config.statementDay },
  new Date()  // Use today's date to find CURRENT cycle
);

// Step 3: Format tag from cycle END date
const correctCycleTag = formatIsoCycleTag(cycleRange?.end ?? new Date());

// Step 4: Pass this tag to getAccountSpendingStats
const cashbackStats = await getAccountSpendingStats(id, new Date(), undefined, correctCycleTag);
```

### **Solution B: Change getAccountSpendingStats to Accept Date + Config** (Alternative)

Modify the function signature to accept account config directly, avoiding need for client to derive it:

```typescript
export async function getAccountSpendingStats(
  accountId: string, 
  config: ParsedCashbackConfig,  // ← Pass config instead of date
  categoryId?: string
)

// Inside function:
const cycleRange = getCashbackCycleRange(config, new Date());
const resolvedCycleTag = formatIsoCycleTag(cycleRange?.end ?? new Date());
```

---

## Impact Analysis

### **Why This Causes All Stats = 0**

The flow:
1. Query searches for `persisted_cycle_tag = '2026-03'`
2. No transactions found with that tag (they have `'2026-02'`)
3. `rawTxns.length === 0`
4. Fallback to date range also returns empty (query still filters transactions wrong way initially)
5. Since `txns.length === 0`:
   - `currentSpend = 0` (no transactions)
   - `earnedSoFar = 0` (no transactions)
   - `sharedAmount = 0` (no transactions)
   - `netProfit = 0` (depends on earned)

### **Cascade of Zeros**

The zeros don't come from business logic - they come from **no transactions being found at all**.

---

## Additional Findings

### **Issue #2: Service Role Key IS Available**
- ✅ `.env.local` contains valid `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `getCashbackClient()` successfully creates admin client
- ✅ RLS permissions are NOT the blocker
- This was not the root cause

### **Issue #3: Cycle Tag Storage IS Correct**
- ✅ Transactions correctly store `persisted_cycle_tag: '2026-02'` (ISO format)
- ✅ Cashback cycles table correctly created with matching tag
- ✅ Database schema is consistent
- Issue is purely in the **query initialization logic**

---

## Recommended Fix Implementation

**File:** [src/app/accounts/[id]/page.tsx](src/app/accounts/[id]/page.tsx)

**Change:**
```diff
+ import { getCashbackCycleRange, formatIsoCycleTag, parseCashbackConfig } from '@/lib/cashback'

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams
  
  const account = await getAccountDetails(id)
  
  if (!account) notFound()
  
+ // Derive correct cycle tag from account config (for statement cycle matching)
+ let correctCycleTag: string | undefined = undefined
+ if (account.type === 'credit_card' && account.cashback_config) {
+   const config = parseCashbackConfig(account.cashback_config)
+   const cycleRange = getCashbackCycleRange(
+     { cycleType: config.cycleType, statementDay: config.statementDay },
+     new Date()
+   )
+   if (cycleRange) {
+     correctCycleTag = formatIsoCycleTag(cycleRange.end)
+   }
+ }
  
- const [allAccounts, categories, people, shops, cashbackStats, transactions] = 
- await Promise.all([...
-   getAccountSpendingStats(id, new Date()),
+ const [allAccounts, categories, people, shops, cashbackStats, transactions] = 
+ await Promise.all([...
+   getAccountSpendingStats(id, new Date(), undefined, correctCycleTag),
```

---

## Testing the Fix

**Expected Result After Fix:**
1. Query uses correct `persisted_cycle_tag = '2026-02'`
2. Finds 1 transaction with amount 18,480,000
3. Calculates spending stats correctly
4. Header displays: `earnedSoFar = 1,478,400` (or similar), `sharedAmount`, `netProfit`
5. Cycle badge shows "27.01 - 26.02" or equivalent

**Verification Steps:**
```bash
# 1. Build to check for type errors
pnpm build

# 2. Run development server
pnpm dev

# 3. Navigate to account detail page
# - Should see stats populated
# - Check browser console for logs: should show "Transactions found by persisted_cycle_tag: 1"

# 4. Run linter
pnpm lint
```

---

## Design Refactor Opportunity

**Long-term:**  Consider standardizing cycle tag handling across the codebase:

1. **Option A:** Store cycle tag in `accounts` table as `current_cycle_tag` (cached, updated nightly)
2. **Option B:** Create utility function `getCurrentCycleTagForAccount(accountId)` to centralize this logic
3. **Option C:** Move cycle tag derivation into service layer to prevent client-side errors

**Benefits:**
- Prevents future date-related bugs
- Single source of truth for "current cycle"
- Easier to test

---

## Summary

| Aspect | Finding |
|--------|---------|
| **Root Cause** | `getAccountSpendingStats` called without cycleTag parameter, defaults to deriving from today's date instead of account's statement cycle |
| **Fix Location** | [src/app/accounts/[id]/page.tsx](src/app/accounts/[id]/page.tsx#L66) |
| **Fix Complexity** | Low - 5-10 lines of code |
| **Risk Level** | Very Low - uses existing API correctly, no breaking changes |
| **Database Impact** | None - no migrations needed |
| **Service Role Key** | ✅ Already set correctly in .env.local |
| **RLS Permissions** | ✅ Not the blocker |
| **Timeline** | Can be fixed immediately |
