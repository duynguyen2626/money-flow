# Cashback Health Redesign - Phase Progress & Future Plan

**Current Status:** Phase 2 COMPLETE ✅  
**Date:** March 1, 2026  
**Branch:** `refactor/cashback-health-redesign`  
**Commits:** 2 (Phase 1 migration + Phase 2 service updates)

---

## Current Work Summary (Phase 1-2)

### Root Cause Identified
**Problem:** Cashback stats showing 0 despite 18.4M VND in transactions
**Root Cause:** Semantic confusion between `tag` (debt cycle) vs `persisted_cycle_tag` (statement cycle)

### Solution Implemented

#### Phase 1: Database Migration ✅ DONE
```sql
ALTER TABLE transactions ADD COLUMN debt_cycle_tag TEXT;
ALTER TABLE transactions ADD COLUMN statement_cycle_tag TEXT;
UPDATE transactions SET debt_cycle_tag = tag;
UPDATE transactions SET statement_cycle_tag = persisted_cycle_tag;
CREATE INDEX idx_transactions_debt_cycle;
CREATE INDEX idx_transactions_statement_cycle;
```

**Status:** Migration executed & tested
- ✅ Columns added
- ✅ Data backfilled (18.4M VND transaction verified)
- ✅ Indexes created
- ✅ All 8 test cases passed

#### Phase 2: TypeScript Service Layer ✅ DONE
Updated 7 service files with fallback pattern:

```typescript
// Pattern used everywhere
const value = transaction.new_column ?? transaction.old_column;

// On write: backfill both
await update({ new_column: value, old_column: value })
```

**Services Updated:**
- ✅ `cashback.service.ts` (5 updates - statement_cycle_tag)
- ✅ `debt-calculation.ts` (12 updates - debt_cycle_tag)
- ✅ `people.service.ts` (6 updates - cycle fallback)
- ✅ `account.service.ts` (2 updates - statement_cycle_tag)
- ✅ `sheet.service.ts` (3 updates - cycle sync)
- ✅ `dashboard.service.ts` (1 update - cycle aggregation)
- ✅ `bot-transaction.service.ts` (2 updates - backfill)

**Quality:**
- ✅ Build passes (`pnpm build`)
- ✅ No TypeScript errors
- ✅ 100% backwards compatible
- ✅ No breaking changes

---

## Remaining Phases (NOT STARTED)

### Phase 3: Component & Action Updates 🔴 TODO
**Goal:** Fix the "0 cashback" bug by updating React components

**Scope:**
1. **Server Actions** (`src/actions/`)
   - `transaction-actions.ts` - Backfill new columns on create/update
   - `account-actions.ts` - Query with statement_cycle_tag
   - `batch-actions.ts` - Handle cycle tags in batch import

2. **React Components** (`src/components/`)
   - Account detail header - Display correct cashback stats
   - Transaction table - Show cycle information
   - Debt pages - Use debt_cycle_tag
   - Cashback cards - Use statement_cycle_tag

3. **API Routes** (`src/app/api/`)
   - `/api/cashback/*` - Query statement_cycle_tag
   - `/api/debt/*` - Query debt_cycle_tag
   - `/api/transactions/*` - Backfill both columns

**Key Fix:** Account detail page currently gets `cycleTag` wrong:
```typescript
// WRONG (Phase 0):
const cycleTag = getAccountDetailsHeader(id, new Date());  // Derives from today

// RIGHT (Phase 3):
const cycleTag = account.current_cycle_tag;  // Use cached value
```

**Estimated Work:** 3-4 hours

### Phase 4: Cleanup 🔴 TODO
**Goal:** Remove old columns after code migration complete

**Scope:**
1. Drop old columns:
   ```sql
   ALTER TABLE transactions DROP COLUMN tag;
   ALTER TABLE transactions DROP COLUMN persisted_cycle_tag;
   ```

2. Remove fallback code:
   ```typescript
   // Before
   const tag = debt_cycle_tag ?? tag ?? 'UNTAGGED';
   
   // After
   const tag = debt_cycle_tag ?? 'UNTAGGED';
   ```

3. Update type definitions to mark old columns as never

**Safety:** Only after Phase 3 fully deployed and tested

---

## Problem Statement (Why This Matters)

### The Bug
Cashback performance showed 0 despite having transactions:
```
Spent Amount: 18,480,000 VND ✓ (in database)
Real Awarded: 0 ❌ (should show value)
Virtual Profit: 0 ❌ (should show value)
```

### The Root Cause
```
Transaction (2026-02-26):
  tag: "2026-02" (debt cycle for Lâm)
  persisted_cycle_tag: "2026-02" (statement cycle for Vib card)

Page loads (2026-03-01):
  Derives cycleTag from new Date() → "2026-03" (WRONG!)
  Queries: WHERE persisted_cycle_tag = "2026-03"
  Result: 0 rows (transaction is "2026-02")
  Shows: 0 cashback (WRONG!)
```

### The Solution
Separate the concepts:
- **`debt_cycle_tag`:** User-assigned period for debt tracking
- **`statement_cycle_tag`:** Auto-calculated card statement period
- **Query correctly:** Use cached account.current_cycle_tag

---

## Architecture Changes (Post-Phase 2)

### Before (Broken)
```
Transaction
├─ tag (CONFUSED: debt? statement? calendar?)
└─ persisted_cycle_tag (CONFUSED: same thing?)

Account Detail Page
└─ Derives cycleTag from today's date (WRONG!)
   └─ Queries wrong period
   └─ Gets 0 results
   └─ Shows 0 cashback
```

### After (Fixed)
```
Transaction
├─ debt_cycle_tag (Clear: user-assigned debt period)
└─ statement_cycle_tag (Clear: bank statement period)

Account Detail Page
└─ Uses account.current_statement_cycle_tag (Right!)
   └─ Queries correct period
   └─ Gets all transactions
   └─ Shows correct cashback
```

---

## Database State

### Current Schema (Phase 2)
```sql
transactions (
  id UUID,
  ...
  -- OLD columns (deprecated in Phase 2)
  tag TEXT,
  persisted_cycle_tag TEXT,
  
  -- NEW columns (added in Phase 1, used in Phase 2)
  debt_cycle_tag TEXT,
  statement_cycle_tag TEXT,
  ...
)

indexes:
  - idx_transactions_debt_cycle (debt_cycle_tag, person_id)
  - idx_transactions_statement_cycle (statement_cycle_tag, account_id)
```

### Test Data
- Transaction ID: `1a65b36d-8be4-49f7-a4af-9178fcd1885d`
- Date: 2026-02-26
- Amount: -18,480,000 VND (debt to Lâm)
- debt_cycle_tag: "2026-02" ✅
- statement_cycle_tag: "2026-02" ✅
- Status: Both columns backfilled correctly

---

## Code Quality Metrics

| Metric | Status |
|--------|--------|
| Build | ✅ PASSING |
| Type Check | ✅ PASSING |
| Migration Tests | ✅ 8/8 PASSED |
| Service Tests | ✅ ALL UPDATED |
| Breaking Changes | ✅ NONE |
| Backwards Compat | ✅ 100% |

---

## What's Working Right Now

✅ **Can Deploy Immediately:**
- Phase 1 + Phase 2 are fully backwards compatible
- Old code works with new columns
- New code works with old columns
- No breaking changes

✅ **No Data Loss:**
- All 18.4M transaction backfilled
- Old columns still intact
- Dual-column system working

✅ **Ready for Phase 3:**
- Service layer ready
- Database ready
- Testing framework ready

---

## What Still Needs Work

❌ **Phase 3 (Component Level):**
- Fix account detail page to query correct cycle
- Update cashback cards to show correct stats
- Update debt pages to use debt_cycle_tag
- Update API routes to use new columns

❌ **Phase 4 (Cleanup):**
- Drop old columns
- Remove fallback code
- Archive migration

---

## Decision Point

### Option A: Continue Phase 3 Now
**Pros:**
- Complete the fix immediately
- Get cashback stats working
- Clean up old columns

**Cons:**
- More work needed
- Requires testing

**Estimated:** 4-5 hours total (Phase 3 + 4)

### Option B: Handover & Switch to Self-Host
**Pros:**
- Avoid Supabase pooler issues forever
- Better performance (Pocketbase)
- Full control of infrastructure
- Lower costs

**Cons:**
- Migration effort upfront
- Database replication needed

**Estimated:** 3-4 hours (migration + setup)

### Option C: Hybrid
1. Deploy Phase 1+2 (already done)
2. Switch to self-host while Phase 3 is paused
3. Complete Phase 3 on self-hosted DB

**Recommended** if want to avoid Supabase issues

---

## Handover for Next Agent

### What's Complete
- ✅ Root cause identified & documented
- ✅ Database migration complete
- ✅ Service layer refactored
- ✅ Build & tests passing
- ✅ Fallback pattern implemented everywhere

### What's Needed
- ⏳ Component updates (Phase 3)
- ⏳ Cleanup (Phase 4)
- 🔀 **OR** Complete self-host migration instead

### Key Files to Know
Critical files for next phase:

**Phase 3 Focus:**
- `src/app/accounts/[id]/page.tsx` - Fix main bug
- `src/components/accounts/v2/AccountDetailHeaderV2.tsx` - Show stats
- `src/actions/account-actions.ts` - Query new columns
- `src/actions/transaction-actions.ts` - Backfill new columns

**Database Focus:**
- `supabase/migrations/20260301_rename_cycle_columns.sql` - Migration (DONE)
- Full_schema_from_migrations.sql - Reference

**Self-Host Migration:** (see SELF_HOST_MIGRATION_PROPOSAL.md)
- Switch from Supabase to Pocketbase
- Migrate DB dump
- Update connection strings

---

## Repository State

```
Branch: refactor/cashback-health-redesign
Commits: 2
  - Commit 1: Phase 1 DB migration
  - Commit 2: Phase 2 service layer updates

Unmerged Changes: 
  - Phase 1 + Phase 2 only
  - Ready to merge anytime

Conflicts: None
Build Status: ✅ PASSING
```

---

## Quick Start for Next Agent

```bash
# Current state
git checkout refactor/cashback-health-redesign
git log --oneline | head -2  # See Phase 1 + Phase 2 commits

# Review what's done
cat .agent/PHASE1_TEST_CASES.md      # Phase 1 tests
cat .agent/PHASE2_COMPLETE.md        # Phase 2 summary

# Option A: Continue Phase 3
# Update src/app/accounts/[id]/page.tsx to use correct cycleTag
# See .agent/PHASE2_TYPESCRIPT_UPDATES.md for pattern

# Option B: Start self-host migration
# See SELF_HOST_MIGRATION_PROPOSAL.md for detailed plan
```

---

## Success Criteria for Next Phase

**Phase 3 Success:**
- [ ] Cashback stats show correct values (not 0)
- [ ] Account detail page queries correct cycle
- [ ] All components use new columns
- [ ] Tests pass

**Phase 4 Success:**
- [ ] Old columns dropped
- [ ] Fallback code removed
- [ ] Database clean

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Phase 3 missed edge case | Medium | Run Phase 3 test cases thoroughly |
| Data loss on cleanup | Low | Keep backups during Phase 4 |
| Supabase pooler issues return | High | Switch to self-host (see proposal) |
| Performance degradation | Medium | Monitor after Phase 3 |

---

## Notes for Next Session

1. **Phase 1+2 are stable** - Database and services are working correctly
2. **The bug is fixable** - Just need to query correct cycle in components
3. **Self-host is better** - Would eliminate connection pooler issues forever
4. **Priority Choose:** Either finish Phase 3, or switch infrastructure

**Recommendation:** Finish Phase 3 quickly (fix the bug), then consider self-host migration to eliminate future issues.
