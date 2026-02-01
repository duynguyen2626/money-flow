# Pull Request: Account Details UI Refinements and Bug Fixes

## 📋 Summary
This PR addresses critical UI bugs and refines the Account Details transaction flow for better UX in Money Flow 3.

---

## 🐛 Bug Fixes

### 1. People Details URL Parameter Bug
**Issue**: Selecting "All History" in the People Details page incorrectly appended `tag=all` to the URL, causing a page rendering error.

**Solution**: Modified `TransactionControlBar.tsx` to **remove** the `tag` parameter entirely when `year === null` (All History), instead of setting it to `all`.

**Files Changed**:
- `src/components/people/v2/TransactionControlBar.tsx`

---

### 2. Account Edit Form Data Loading
**Issue**: Fields like "Account Number" and "Bank Receiver Name" were not populating when editing an account in `AccountSlideV2`, even after saving.

**Root Cause**: Race condition where the parent component might pass a stale `account` prop after `router.refresh()`.

**Solution**: Implemented a "Fresh Fetch" strategy:
- Form initializes instantly from the `account` prop (for speed)
- Simultaneously triggers a background call to `getAccountDetails(id)` to fetch the latest data from the database
- If DB data differs from the prop, the form state is automatically updated

**Files Changed**:
- `src/components/accounts/v2/AccountSlideV2.tsx`

---

### 3. TypeScript Errors in Single Flow Mode
**Issue**: `contextBadge` could not be assigned `null` due to type mismatch.

**Solution**: Changed type from `Element` to `React.ReactElement | null` to allow null assignment in Single Flow mode.

**Files Changed**:
- `src/components/moneyflow/unified-transaction-table.tsx`

---

## ✨ UI Refinements

### Single Flow Mode for Account Details
**Problem**: 
- "FROM Msb Online" displayed for Cashback (redundant self-reference)
- "TO Unknown" displayed for simple expenses (confusing)
- Duplicate directional icons (Type Badge + Context Badge showing same arrow)

**Solution**: Implemented "Single Flow" mode for simple Income/Expense transactions:

#### Logic
- **Single Flow Detection**:
  - **Expense**: Triggered when `targetName === 'Unknown'` (no specific person/account target)
  - **Income**: Triggered when `sourceId === contextId` (self-source) or `displayName === 'Unknown'`

#### UI Changes
1. **Removed Redundant Badges**: For Single Flow transactions, the "Context Badge" (FROM/TO pill) is completely removed to avoid duplication with the Type Badge
2. **Entity Display Priority**:
   - Shop Name + Logo (if available)
   - Category Name + Image/Icon (using `category_image_url` or `category_icon`)
   - Generic fallback ("Expense" / "Income")
3. **Result**:
   - Before: `[Income Icon] FROM [Msb Online Icon] Msb Online`
   - After: `[Income Icon] [Cashback Icon] Cashback`
   - Before: `[Expense Icon] TO Unknown`
   - After: `[Expense Icon] [Coffee Icon] Coffee`

#### Preserved Behavior
Multi-party transactions (Transfer, Debt, Loan) still display detailed flow badges (FROM/TO) with both entities.

**Files Changed**:
- `src/components/moneyflow/unified-transaction-table.tsx` (Scenario 2 & 3 logic)

---

## 📚 Documentation Updates

### New Documentation
1. **`ONBOARDING.md`**: Master onboarding guide for new agents/developers
   - Project overview and tech stack
   - Essential reading list (rules, architecture, context)
   - Project structure and key concepts
   - Development workflow and quality gates
   - Common tasks and troubleshooting

2. **`PROMPT_PHASE_12.md`**: Phase 12 start prompt for new agents
   - Pre-work checklist
   - Phase 12 objectives (S1: Category Badges, S2: Auto-Transactions)
   - Step-by-step getting started guide
   - Testing workflow and commit guidelines
   - Completion checklist

3. **`HANDOVER_PHASE_12.md`**: Handover from Phase 11 to Phase 12
   - Summary of Phase 11 work
   - Phase 12 priorities (critical bugs)
   - Phase 13 future plan

4. **`PHASE_12_PLAN.md`**: Detailed implementation plan for Phase 12
   - Investigation steps for each bug
   - Potential root causes and solutions
   - Files to review and modify
   - Verification plan

5. **`PHASE_13_PLAN.md`**: Future enhancements plan
   - People page refactor
   - Batch page enhancements
   - Recent navigation feature

### Updated Documentation
1. **`.agent/rules/ui_rules.md`**: Added rules for:
   - No monospace fonts for UI text (only code blocks)
   - No cropping/rounding images in documentation

### Cleanup
- Moved 36 outdated documentation files to `.agent/archive/`:
  - Old phase handovers (9, 10, 11)
  - Deprecated transaction table docs
  - Old cashback and GS sync documentation
  - Completed project checklists

---

## 🧪 Testing

### Manual Testing
- ✅ Dev server running successfully (`npm run dev`)
- ✅ TypeScript errors resolved
- ✅ Manual testing on Account Details page confirms:
  - Single Flow mode works correctly
  - Category/Shop icons display properly
  - No redundant badges
  - Layout is not broken
- ✅ People Details "All History" filter works without URL errors
- ✅ Account Edit Form loads data correctly

### Known Limitations
- `npm run build` fails due to iCloud Drive EPERM issue (known limitation)
- Relying on dev server and TypeScript IDE checks for verification

---

## 📁 Files Changed

### Source Code (3 files)
- `src/components/accounts/v2/AccountSlideV2.tsx` - Fresh fetch logic
- `src/components/moneyflow/unified-transaction-table.tsx` - Single Flow mode
- `src/components/people/v2/TransactionControlBar.tsx` - URL parameter fix

### Documentation (5 new, 1 updated, 36 archived)
- `.agent/ONBOARDING.md` (new)
- `.agent/PROMPT_PHASE_12.md` (new)
- `.agent/HANDOVER_PHASE_12.md` (new)
- `.agent/PHASE_12_PLAN.md` (new)
- `.agent/PHASE_13_PLAN.md` (new)
- `.agent/rules/ui_rules.md` (updated)
- `.agent/archive/*` (36 files moved)

---

## 📝 Commits

1. **`362d701`** - fix: refine Account Details UI flow and fix data loading bugs
2. **`82e12f2`** - docs: add Phase 12 & 13 plans and update UI rules
3. **`f5fc712`** - chore: cleanup outdated docs and fix TypeScript errors

---

## 🎯 Next Steps

After this PR is merged:
1. Start Phase 12 work (critical bug fixes)
2. Follow the guide in `.agent/PROMPT_PHASE_12.md`
3. Fix S1: Category badges on Account Name column
4. Fix S2: Auto-transaction creation on Services page

---

## 📸 Screenshots

### Before: Redundant "FROM Msb Online" for Cashback
```
[Income Icon] FROM [Msb Online Icon] Msb Online
```

### After: Clean "Single Flow" Display
```
[Income Icon] [Cashback Icon] Cashback
```

### Before: Confusing "TO Unknown" for Expense
```
[Expense Icon] TO Unknown
```

### After: Clear Category Display
```
[Expense Icon] [Coffee Icon] Coffee
```

---

## ✅ Checklist

- [x] Code follows project coding standards (`.agent/rules/rules.md`)
- [x] UI follows UI standards (`.agent/rules/ui_rules.md`)
- [x] TypeScript errors resolved
- [x] Manual testing completed
- [x] Documentation updated
- [x] Commit messages are descriptive
- [x] No regressions in other features

---

**Branch**: `fix/transaction-ui-refinements`  
**Base**: `main`  
**Reviewers**: @rei6868  
**Labels**: `bug`, `enhancement`, `documentation`
