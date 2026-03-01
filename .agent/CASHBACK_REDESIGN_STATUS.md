# 📊 Cashback Health Redesign - Current Status

**Date:** March 1, 2026  
**Status:** ✅ **PLANNING PHASE COMPLETE**

---

## Summary of Work Completed

### ✅ Phase 1: Root Cause Analysis
- **Branch:** `feat/account-detail-cycle-fix`
- **Findings:** Identified semantic mismatch between ISO cycle tags (2026-02) and statement cycles (27.02-26.03)
- **Root Cause:** Caller didn't pass cycle tag to service → service derived from wrong date → 0 transactions
- **Documentation:** [.agent/ROOT_CAUSE_ANALYSIS.md](.agent/ROOT_CAUSE_ANALYSIS.md)

### ✅ Phase 2: Code Cleanup  
- **Branch:** `feat/account-detail-cycle-fix`
- **Changes:**
  - ✅ Removed broken Cashback Performance section (298 lines deleted)
  - ✅ Replaced with "Cashback Health - Coming Soon" placeholder
  - ✅ Build verified - zero errors
  - ✅ Commit: `f976929`

### ✅ Phase 3: Comprehensive Redesign Planning
- **Branch:** `refactor/cashback-health-redesign`  
- **Deliverable:** [.agent/CASHBACK_HEALTH_REDESIGN_PLAN.md](.agent/CASHBACK_HEALTH_REDESIGN_PLAN.md)
- **Plan Includes:**
  
  | Section | Details |
  |---------|---------|
  | Root Cause | Detailed analysis with data examples |
  | DB Schema | Three-part redesign (accounts, cycles, explicit boundaries) |
  | Service Layer | New CycleTagService + simplified CashbackHealthService |
  | Components | CashbackHealthSection design with code examples |
  | Migration | Step-by-step SQL with backfill queries |
  | Implementation | 4 phases over 6.5 days with parallel work |
  | Testing | Success criteria, risk assessment, verification queries |

---

## Current Git State

```
feat/account-detail-cycle-fix (cleanup work)
  ├─ Commit: f976929 - Remove broken Cashback Performance section
  └─ Status: Ready to merge after approval

refactor/cashback-health-redesign (planning & design)
  ├─ Commit: 6a200a1 - Comprehensive redesign master plan
  └─ Status: Ready for code implementation (Phase 1 onwards)
```

---

## Branches Overview

### `feat/account-detail-cycle-fix`
**Purpose:** Clean up broken code  
**Status:** ✅ Complete  
**Changes:**
- Removed 298 lines of problematic cashback stats code
- Added placeholder "Cashback Health - Coming Soon" UI
- Build verified (zero errors)

**Action Items:**
- [ ] Review code cleanup
- [ ] Merge to main when ready

---

### `refactor/cashback-health-redesign` 
**Purpose:** Design and implement proper solution  
**Status:** ✅ Planning complete  
**Deliverable:** Master plan document (9000+ words, 10 sections)

**Plan Phases:**

1. **Phase 1: DB Schema & Backfill** (1 day)
   - Add `current_cycle_tag` columns to accounts table
   - Add explicit `cycle_start_at`, `cycle_end_at` to cashback_cycles
   - Backfill existing data

2. **Phase 2: Service Layer** (2 days)
   - Create `CycleTagService` with singleton pattern
   - Create `CashbackHealthService` (simplified, no re-aggregation)
   - Add comprehensive tests

3. **Phase 3: UI Components** (2 days)
   - New `CashbackHealthSection` component
   - Update page.tsx to fetch health stats
   - Clean up AccountDetailHeaderV2

4. **Phase 4: Testing & Deployment** (1.5 days)
   - E2E tests across different statement days
   - Staging validation
   - Production deployment

**Timeline:** 6.5 days (can parallelize Phases 1+2)

---

## Key Design Decisions

### ✅ YES - Reuse This Code
- `getCashbackCycleRange()` - already correct
- `formatIsoCycleTag()` - already correct
- `recomputeCashbackCycle()` - working fine
- All DB triggers - no changes needed

### ❌ NO - Don't Reuse Old Code
- `earnedSoFarFromTxns` aggregation - flawed
- Transaction filtering in getAccountSpendingStats - had logic errors
- Complex stat calculations - were trying to patch symptoms

### 🆕 NEW - Build From Scratch
- `CycleTagService` - single source of truth
- `CashbackHealthService` - simpler, clearer
- `CashbackHealthSection` - clean UI component

---

## Comparison: Before vs. After

### ❌ **Before (Broken)**
```typescript
// page.tsx - caller didn't consider account's cycle config
const cashbackStats = await getAccountSpendingStats(id, new Date())
                                                        ↑ Wrong: today's date

// Service would derive tag from today → "2026-03"
// But transactions in DB have "2026-02"
// Result: 0 transactions found → all stats = 0 ❌
```

### ✅ **After (Fixed)**
```typescript
// page.tsx - gets current cycle from account cache
const cycleTag = await getCurrentStatementCycleTag(accountId)

// Service uses that guaranteed correct tag
const stats = await getCashbackHealthStats(accountId, { cycleTag })

// Query with correct tag → finds 18,480,000 in transactions
// Aggregates into health metrics → stats accurate ✅
```

---

## File Structure

```
.agent/
├─ ROOT_CAUSE_ANALYSIS.md                      ← Analysis of cycle tag mismatch
└─ CASHBACK_HEALTH_REDESIGN_PLAN.md            ← Complete 10-section master plan

src/components/accounts/v2/
├─ AccountDetailHeaderV2.tsx                   ← Has placeholder "Coming Soon"
└─ CashbackHealthSection.tsx                   ← (To be created in Phase 3)

src/services/
├─ cashback.service.ts                          ← Existing (no changes)
├─ cycle-tag.service.ts                         ← (To be created in Phase 2)
└─ cashback-health.service.ts                   ← (To be created in Phase 2)

src/app/accounts/[id]/
└─ page.tsx                                     ← Will use new service in Phase 3
```

---

## Success Criteria

After implementation, Cashback Health section should:

✅ Display actual earnings (not 0)  
✅ Show correct cycle period (27.Jan - 26.Feb)  
✅ Calculate budget utilization accurately  
✅ Handle different statement days (15, 25, 27)  
✅ Update when accounts change configs  
✅ Load in < 100ms (cached cycle tag)  
✅ Provide data consistency across all views  

---

## Next Steps

### For User Review
1. [ ] Read [ROOT_CAUSE_ANALYSIS.md](.agent/ROOT_CAUSE_ANALYSIS.md) - understand the problem
2. [ ] Read [CASHBACK_HEALTH_REDESIGN_PLAN.md](.agent/CASHBACK_HEALTH_REDESIGN_PLAN.md) - review solution
3. [ ] Approve plan or request changes
4. [ ] Prioritize within sprint (6.5 days effort)

### For Development
1. [ ] Checkout `refactor/cashback-health-redesign` branch
2. [ ] Start Phase 1: DB schema migration
3. [ ] Follow implementation roadmap with checkboxes
4. [ ] Run verification queries after each phase
5. [ ] Test on dev/staging before production

### For QA
1. [ ] Prepare test matrix (different statement days)
2. [ ] E2E test scenarios in Phase 4
3. [ ] Regression testing across account features
4. [ ] User acceptance testing on staging

---

## Important Notes

### Why This Was Necessary
- **Symptom:** All cashback stats showed 0
- **False Leads:** Changed service layer, switched to admin client, adjusted UI
- **Real Issue:** Semantic confusion at DB level about what cycle tags meant
- **Solution:** Redesign from DB up with explicit cycle boundaries and cached tags

### Code Quality
- ✅ Plan includes SQL migration scripts (tested pattern)
- ✅ Code examples provided (not pseudocode)
- ✅ Risk assessment with mitigations
- ✅ Verification queries to validate each phase
- ✅ Multi-phase rollout minimizes breakage risk

### Timeline Estimate
- Design: ✅ Complete (this document)
- Implementation: ~6.5 days (parallelizable)
- Testing: Included in Phase 4
- **Total:** Ready to start anytime

---

## Contacts & Questions

**Analysis & Planning:** Done ✅  
**Implementation:** TBD (pending approval)  
**Current Status:** Waiting for review and go-ahead

---

**Last Updated:** 2026-03-01  
**Branch:** `refactor/cashback-health-redesign`  
**Commit:** `6a200a1`
