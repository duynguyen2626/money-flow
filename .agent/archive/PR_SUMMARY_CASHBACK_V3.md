# Pull Request: Cashback v3.0 - Multi-Tier Policy Resolution & Documentation

## 🎯 Mục Đích (Purpose)
Hoàn thành hệ thống cashback multi-tier (3-tầng) với các sửa lỗi quan trọng, cải thiện UX, và tài liệu toàn diện bằng tiếng Việt.

## ✨ Tính Năng Chính (Features)

### 1. **Fixed Premium Tier Configuration**
- **Before**: `minTotalSpend: 3000000` (3M) → không match "≥15M" trong tier name
- **After**: `minTotalSpend: 15000000` (15M) → match correctly
- **Impact**: Historical cycle 2025-11 (8.9tr spent) now shows 7.5% (Standard) instead of 15% (Premium)
- **File**: Updated via `fix-lady-config.mjs` script

### 2. **3-Tier Policy Resolution Engine**
```
Category Rule (Priority 20)
    ↓ (không match?)
Level Default (Priority 10)
    ↓ (không match level?)
Program Default (Priority 0) → 0.3%
```

**Key Logic**:
- **Min Spend Target Gate**: If set and NOT met, skip all levels and use program default only
- **Fallback to Program Default**: If level matches BUT category rule NOT found → use program default (0.3%), NOT level default
- **File**: `src/services/cashback/policy-resolver.ts` (lines 30-146)

### 3. **Fixed Historical Cycle Accuracy**
- **Before**: Used `currentSpend` (current cycle) to resolve policy for historical transactions
  - Example: 2025-11 transactions resolved using 2026-01 cycle's spend = wrong rates
- **After**: Use `cycle.spent_amount` (that cycle's total)
  - Example: 2025-11 transactions now resolved using 2025-11 cycle's spend = accurate rates
- **File**: `src/services/cashback/cashback.service.ts` (line 630: `cycleSpentForPolicy = cycle.spent_amount`)

### 4. **Fixed Cycle Year Grouping for Statement Cycles**
- **Before**: Cycle "2025-12" (Nov 20 - Dec 19) grouped under year 2026 (end month)
- **After**: Grouped under year 2025 (start month, fiscal year)
- **Logic**: If `statementDay > 15` AND `month === 1`, subtract 1 from year
  - Example: Cycle "2026-01" (Dec 20 - Jan 19) → group as year 2025 ✓
- **File**: `src/components/moneyflow/AccountCycleTransactionsModal.tsx` (lines 50-70)

## 🎨 UI/UX Improvements

### Rewards Column (`account-rewards-cell.tsx`)

**Before**:
- Progress bar: h-4 (nhỏ), không có border
- Text: "Projected X", "CLAIM Y / Z"
- Tooltip: compact, missing Default 0.3% info

**After**:
- Progress bar: h-5 (to hơn), có border slate-200 (gợi ý click)
- Text: "Est. reward X", "Claim Y / Z" (rõ ràng hơn)
- Tooltip: 
  - Split Spent/Target/Cap → Awarded → **Default 0.3%*** → Est. Award → Profit
  - Ghi chú: "*Default uses program base rate when no rule matches"
  - 360px width (rộng hơn, dễ đọc)
- Cycle button: có border, hover effect
- Claim label: text-[11px], font-bold (to hơn)

**Files Modified**:
- `src/components/accounts/v2/cells/account-rewards-cell.tsx` (lines 188-375)

## 🐛 Bug Fixes

### 1. Edit Transaction - Auto-Category Override
**Problem**: User edit transaction từ Education → auto-assign Shopping (debt type) → overwrite loaded category
**Root Cause**: `form.setValue('category_id', ...)` ngoài useEffect (top-level code)
**Fix**: Move guard `if (currentCategoryId) return;` INSIDE useEffect
- **File**: `src/components/transaction/slide-v2/single-mode/basic-info-section.tsx` (lines 55-77)

### 2. Edit Transaction - Hook Mismatch Error
**Problem**: "Rendered fewer hooks than expected"
**Root Cause**: Top-level early return before hooks (violates React Hook Rules)
**Fix**: All guard logic must be inside useEffect/useMemo
- **File**: `src/components/transaction/slide-v2/single-mode/basic-info-section.tsx`

### 3. Rewards Tooltip - Missing Default Rate
**Problem**: User không biết default 0.3% earning khi không match rule
**Fix**: Thêm dòng "Default 0.3%*" với tính toán `currentSpent × programDefaultRate`
- **File**: `src/components/accounts/v2/cells/account-rewards-cell.tsx`

## 📚 Documentation

### New Files Created

**1. `.agent/CASHBACK_GUIDE_VI.md` (Comprehensive Guide - Vietnamese)**
- **Kiến Trúc**: 3-tier model diagram
- **Luồng Dữ Liệu**: Transaction create → Rewards display → Cycle close
- **Cột Rewards**: UI interaction, tooltip content, logic chi tiết, common issues
- **Slide Edit Transaction**: Flow, form loading, category preservation
- **Policy Resolver**: Step-by-step logic, min spend gate, fallback chain, Vpbank Lady examples
- **Cycle Management**: Statement vs calendar, fiscal year detection
- **Code Files Reference**: Core files table, supporting files, config files
- **Learning Path**: Cho agent sau

**2. `.cursorrules` (Updated)**
- Added **Section 6: Cashback Engine (CRITICAL - v3.0)**
  - 3-tier policy resolution rules
  - Min spend target gate logic
  - Policy fallback logic (NOT level_default when category rule not found)
  - Cycle accuracy (use cycle.spent_amount)
  - Cashback metadata structure
  - Account config structure validation
  - Cycle grouping by fiscal year
- Added **Section 7: Edit Transaction Flow (CRITICAL)**
  - Auto-category guard placement (inside useEffect)
  - Form hook rules (no top-level early returns)
  - Category preservation during edit
- Added **Section 8: Documentation & References**
  - Link to CASHBACK_GUIDE_VI.md
  - Link to copilot-instructions.md
  - Link to schema docs

## 📊 Files Modified

### Core Cashback Files
- `src/services/cashback/policy-resolver.ts`: Min spend gate + fallback logic
- `src/services/cashback/cashback.service.ts`: Use cycle.spent_amount for historical accuracy
- `src/components/accounts/v2/cells/account-rewards-cell.tsx`: Better UI, bigger bar, improved tooltip

### Transaction & Form Files
- `src/components/transaction/slide-v2/single-mode/cashback-section.tsx`: Dynamic rate calculation (existing)
- `src/components/transaction/slide-v2/single-mode/basic-info-section.tsx`: Category guard fix
- `src/components/transaction/slide-v2/transaction-slide-v2.tsx`: Load editingId correctly (existing)

### Cycle & Modal Files
- `src/components/moneyflow/AccountCycleTransactionsModal.tsx`: Fiscal year detection in getYear()
- `.cursorrules`: Cashback rules & edit transaction rules
- `.agent/CASHBACK_GUIDE_VI.md`: New comprehensive guide (Vietnamese)

## ✅ QA Checklist

- [x] **Config Fix**: Premium minTotalSpend = 15M ✓
- [x] **Policy Resolver**: 3-tier fallback logic ✓
  - [x] Min spend target gate
  - [x] Program default fallback (not level default)
  - [x] Metadata storage with policySource
- [x] **Historical Cycle**: Use cycle.spent_amount ✓
- [x] **Cycle Grouping**: Fiscal year detection ✓
- [x] **Rewards UI**: Larger bar, border, improved labels ✓
- [x] **Rewards Tooltip**: Default 0.3%* row, better layout ✓
- [x] **Edit Transaction**: Category guard inside useEffect ✓
- [x] **Hook Mismatch**: Removed top-level early returns ✓
- [x] **Build**: ✅ PASS
- [x] **Documentation**: Vietnamese guide + .cursorrules updated ✓

## 🚀 Deployment Checklist

Before deploy to production:
1. Verify config has minTotalSpend = 15M for all tiers
2. Test historical cycle rates (2025-11, 2025-12, etc.)
3. Test edit transaction flow (category not overridden)
4. Test rewards column with multi-tier account
5. Test rewards column with simple config
6. Check transaction slide shows correct cycle spent + rate

## 📖 For Next Agent/Developer

**Read First**: `.agent/CASHBACK_GUIDE_VI.md`
- Comprehensive guide to all cashback mechanics
- Flow diagrams, code examples, learning path included

**Update Rules**: `.cursorrules`
- Sections 6-8 contain critical cashback & edit transaction rules

**Quick Reference**: 
- Policy resolver: `src/services/cashback/policy-resolver.ts`
- Cycle utilities: `src/lib/cycle-utils.ts`
- Config structure: `supabase/sample.sql`

## 🔗 GitHub PR Links

**Branch**: `feature/phase-4-1a-cashback-modal-flow`
**Base**: `main`
**Files Changed**: 16 files
**Commit**: `f235ace` (and all commits on this branch)

---

## 📝 Commit Message (Full)

```
feat(cashback): v3.0 - Multi-tier policy resolution with documentation

FEATURES:
- Fixed Premium tier minTotalSpend: 3M → 15M (config now matches tier name)
- 3-tier policy resolution: category_rule → level_default → program_default (0.3%)
- Min spend target gate: if not met, skip all levels and use program default
- Fixed historical cycle accuracy: use cycle.spent_amount instead of currentSpend
- Fixed cycle year grouping: detect fiscal year for statement cycles (e.g., Jan cycles start in Dec)

UI/UX IMPROVEMENTS:
- Rewards column: larger progress bar (h-5), border for visibility, improved labels
- Rewards tooltip: split spent/target/cap, added Default 0.3%* row, added Est. Award
- Changed 'Projected' → 'Est. reward' for clarity
- Claim label more prominent (text-[11px], font-bold)
- Cycle button has border (hover effect)

BUG FIXES:
- Edit transaction: auto-category guard moved inside useEffect (prevents hook mismatch)
- Basic info section: skip auto-assign if category already set (preserves loaded category on edit)

DOCUMENTATION:
- Created .agent/CASHBACK_GUIDE_VI.md: comprehensive Vietnamese guide
  - 3-tier architecture explanation
  - Luồng dữ liệu (data flow)
  - Rewards column interaction (UI, logic, tương tác)
  - Edit transaction flow (form loading, category preservation)
  - Policy resolver logic (min spend gate, fallback chain)
  - Cycle management (statement vs calendar, fiscal year)
  - Code files reference & learning path
- Updated .cursorrules: added Cashback Engine & Edit Transaction Flow rules

FILES MODIFIED:
- src/services/cashback/policy-resolver.ts: added minSpendTarget gate & fallback logic
- src/services/cashback/cashback.service.ts: use cycle.spent_amount for historical accuracy
- src/components/accounts/v2/cells/account-rewards-cell.tsx: improved UI, larger bar, better tooltip
- src/components/transaction/slide-v2/single-mode/cashback-section.tsx: dynamic rate calc
- src/components/transaction/slide-v2/single-mode/basic-info-section.tsx: category guard fix
- src/components/moneyflow/AccountCycleTransactionsModal.tsx: fiscal year detection
- .cursorrules: rules for cashback v3.0 & edit transaction flow

BUILD: ✅ PASS
LINT: Pre-existing issues only (not from this work)
```

---

**Status**: Ready for merge ✅
**Date**: 23 Jan 2026
**Version**: Money Flow 3 - Cashback v3.0
