# Database Migration Strategy: Fresh Start vs. Salvage

**Date**: March 8, 2026  
**Decision**: Fresh branch (`feat/pb-refactor-clean-20260308`) instead of patching existing branch

---

## Problem Statement

The `agent/pb-migration-20260305-stabilize-migration` branch accumulated too many quick fixes:
- 27 TypeScript errors from type drift
- 404/400 errors from schema mismatches
- Multiple partial rewrites with no coherent design
- Unsustainable patch-based approach

**Result**: Each fix created new issues; couldn't maintain forward momentum.

---

## Decision: Fresh Branch from Stable Baseline

### ✅ Why Fresh Start Wins

| Aspect | Fresh Start | Patch Existing |
|--------|------------|-----------------|
| **Code Quality** | Clean slate, no technical debt | Accumulates patches & workarounds |
| **Type Safety** | Zero assumptions, explicit typing | Inheritance of type conflicts |
| **Testing** | Clear before/after per phase | Harder to isolate issues |
| **Onboarding** | Fresh code is easier to understand | Patched code has mysterious fixes |
| **Confidence** | Methodical, proven approach | Uncertain if fixes are correct |
| **Timeline** | 16-22 days planned, phased | Open-ended, reactive |
| **Git History** | Clean, readable commits | Messy revert/fix history |

### Branch Strategy

```
stable baseline: feat/understanding-architecture-mar2026
  ↓
clean refactor: feat/pb-refactor-clean-20260308 (NEW)
  ├─ Phase 1: Category, Shop (3 days)
  ├─ Phase 2: Accounts (3 days)
  ├─ Phase 3: People (2 days)
  ├─ Phase 4: Transactions (7 days)
  ├─ Phase 5: Cashback (3 days)
  └─ Phase 6: Batch (3 days)
  
old branch: agent/pb-migration-20260305-stabilize-migration
  └─ → Close without merge (reference only for ideas)
```

---

## Old Branch Disposition

### Option A: Archive (Recommended)
```bash
# Close PR without merge
# Add label: archived/migration-attempt-1

# Keep for reference:
# - What NOT to do (good learning example)
# - Query fallback pattern (can copy from it)
# - PB 400 sort=-created workaround (documented in new phase)
```

### Option B: Delete (If needed to clean up)
```bash
git branch -D agent/pb-migration-20260305-stabilize-migration  # Local
# GitHub PR can be closed without deletion
```

---

## What We Learned from Old Branch

### Good Ideas to Carry Forward
- ✅ **Fallback query system**: Multi-variant attempts for 400 handling
- ✅ **Field mapping resilience**: `occurred_at || date || created` chain
- ✅ **Logging pattern**: `[source:PB]` / `[source:SB]` distinguishes data flow
- ✅ **Dual-write approach**: SB primary (generates UUID), PB secondary

### Bad Patterns to Avoid
- ❌ **Type drift**: Don't filter modes at callback boundaries; handle at component state
- ❌ **Partial rewrites**: Don't implement half a service; either full or skip
- ❌ **No test checkpoints**: Test after each phase, not at the end
- ❌ **Assumptions about schema**: Always document actual PB schema before writing code
- ❌ **Silence on errors**: Always log which source is being used (for troubleshooting)

---

## New Branch Advantages

### 1. **Clear Baseline**
Based on `feat/understanding-architecture-mar2026` (stable Supabase-only):
- No PB code (fresh start)
- Known working state
- Good foundation

### 2. **Systematic Phases**
Each phase has:
- **Defined scope**: Which services/collections
- **Dependencies**: What must work first
- **Testing plan**: How to verify completeness
- **Definition of done**: Criteria for moving to next phase

### 3. **Infrastructure First**
Phase 0 sets up:
- `fallback-helpers.ts`: Reusable retry logic
- `id-mapper.ts`: UUID conversion
- Service stubs: Skeleton for each phase
- README: Implementation guide

### 4. **Fallback Pattern Established**
All reads use consistent pattern:
```typescript
executeWithFallback(
  () => getPocketBaseData(),
  () => getSupabaseData(),
  'context:for:logging'
)
```

No more ad-hoc error handling.

### 5. **Schema-Aware from Day One**
Before implementing a phase:
1. Get actual PB collection schema
2. Document in `docs/collections/`
3. Plan field mappings
4. Then implement services

Not assume, verify.

---

## Timeline Comparison

### Old Approach (Reactive Patching)
```
Day 1: Write code (assume PB schema)
Day 2: Hit 400 errors (schema wrong)
Day 3: Add fallback (hacky)
Day 4: Find type errors (conflicting imports)
Day 5: Patch types (break other things)
Day 6-∞: Endless patch cycle 😞
```

### New Approach (Planned Phases)
```
Day 1: Document PB schema
Day 2-3: Phase 1 (category, shop) ✅
Day 4-5: Phase 2 (accounts) ✅
Day 6-7: Phase 3 (people) ✅
Day 8-14: Phase 4 (transactions with fallback) ✅
Day 15-17: Phase 5 (cashback) ✅
Day 18-20: Phase 6 (batch operations) ✅
Day 21-22: Integration testing ✅
```

Each phase is complete before moving to next. No backtracking.

---

## How to Proceed

### Immediate (Today)
- [x] Create `feat/pb-refactor-clean-20260308` branch
- [x] Document refactoring plan (`docs/PB_MIGRATION_PLAN.md`)
- [x] Setup infrastructure (Phase 0):
  - [x] `src/services/pocketbase/` directory
  - [x] `fallback-helpers.ts`
  - [x] `id-mapper.ts`
  - [x] Service stubs for each phase
- [ ] **Get PB schema from admin** (export collections as JSON)

### Next (Tomorrow)
- [ ] Document PB schema in `docs/collections/SCHEMA.md`
- [ ] Identify actual field differences from Supabase
- [ ] Create `docs/collections/FK_DEPENDENCIES.md`
- [ ] Start Phase 1 implementation

### Ongoing
- [ ] Each phase:
  1. Implement service
  2. Test thoroughly
  3. Commit with clear message
  4. Move to next phase
- [ ] Maintain console logs for debugging
- [ ] Keep zero TypeScript errors (run `tsc --noEmit` after each change)

---

## Risk Mitigation

### What Could Go Wrong?
1. **PB schema is completely different**: Mitigation: Get schema first before coding
2. **Phase dependency was wrong**: Mitigation: Each phase has test checkpoints
3. **Fallback pattern doesn't work**: Mitigation: Implemented in Phase 0, tested immediately
4. **Type conflicts reappear**: Mitigation: Zero tolerance policy + automated checking

### Rollback Plan
If new approach doesn't work:
- Keep `feat/understanding-architecture-mar2026` as fallback
- Revert to known-working Supabase-only state
- Can investigate issues more carefully from stable baseline

---

## Success Criteria

New branch is successful when:
- ✅ Zero TypeScript errors (tsc --noEmit)
- ✅ Zero 404/400 errors visible in UI
- ✅ All pages load (transactions, accounts, people, etc.)
- ✅ Both PB and SB data consistent (can verify in logs)
- ✅ Fallback works when PB is unavailable
- ✅ Git history is clean and readable
- ✅ Code is maintainable for future developers

---

## References

- **Migration plan**: `docs/PB_MIGRATION_PLAN.md`
- **Phase details**: See sections on Phase 1-6
- **Infrastructure**: `src/services/pocketbase/README.md`
- **Implementation guide**: `src/lib/pocketbase/`
- **Supabase baseline**: `database/SCHEMA.md`

---

**Status**: Phase 0 setup complete. Ready for PB schema documentation and Phase 1.
