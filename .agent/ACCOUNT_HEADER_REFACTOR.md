# Account Detail Header Refactor - Summary

## Changes Made

### 1. **Layout Restructure** 
**File**: `src/components/moneyflow/account-detail-header.tsx`

- **Before**: Cashback goal section positioned inline with quick actions, causing layout overflow on long "Need to spend" text
- **After**: Cashback goal moved below quick actions row, separated with border-top, no longer competes for space

### 2. **Quick Add Buttons - Now Use TransactionSlideV2**
- All transaction triggers (Income, Expense, Pay/Transfer, Lend) now open **TransactionSlideV2** instead of V1 modal
- Quick button still uses `TransactionTrigger` component
- All other buttons (Income, Expense, Pay, Transfer, Lend) trigger the new V2 slide with proper initial state

### 3. **Collapse/Expand Button - Icon Only**
- Changed from text label ("Expand stats"/"Hide stats") to **icon-only** button
- Shows ChevronDown/ChevronUp icon
- Added `title` attribute for hover tooltip

### 4. **English-Only UI**
- "Mục tiêu" → "Spending Target"  
- Removed all Vietnamese text from UI

### 5. **New Details Button**
- Added **open-in-new-tab button** (ArrowUpRight icon)
- Links to `/accounts/{id}?tab=cashback`
- Opens in new tab with `target="_blank"`

### 6. **Improved Spacing**
- Cashback goal section uses `flex items-center gap-3` for better alignment
- Progress bar and reward value stay compact
- "Need X to spend" text wrapped with `whitespace-nowrap` to prevent breaking

### 7. **Button Layout Improvements**
- Settings button is now icon-only (no text)
- All action buttons remain the same style but better spacing
- New open-details button placed before settings

---

## File: `src/app/accounts/[id]/page.tsx`

**No changes needed** - Tab handling is already correct. By default, no `?tab` param is set (defaults to transactions). When user selects cashback tab, `?tab=cashback` is added.

---

## Performance Note (Cashback Tab Loading)

The slow load on cashback tab is likely due to `CashbackAnalysisView` being a client component that fetches data on mount. To improve:

1. Move data fetching to server side (parent page.tsx)
2. Pass pre-fetched data to `CashbackAnalysisView`
3. Or: Use Suspense boundaries for better loading states

Currently `CashbackAnalysisView` calls:
- `getCashbackProgress()`
- `getCashbackCycleOptions()`
- `getAllCashbackHistory()`
- `getUnifiedTransactions()`

All on client mount, which can be slow for large datasets.

---

## Testing Checklist

- [x] No TypeScript errors
- [x] ESLint passes
- [ ] Visual check: Cashback goal doesn't overflow on mobile
- [ ] Visual check: Collapse/expand icon is clear
- [ ] Functional: Income/Expense/Pay/Transfer/Lend open V2 slide
- [ ] Functional: Open-details button opens new tab with cashback tab
- [ ] Functional: Settings button opens account slide

---

## Breaking Changes

None - All changes are backward compatible. Existing functionality preserved, only UI/UX improved.
