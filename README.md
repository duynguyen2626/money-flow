# Debugging Status & Handover Report

**Date:** 2026-01-11
**Objective:** Fix UI regressions in Transaction Table (Images, Cycle Badges, Layout)

## 🚨 Critical Failures (Persistent)
The following issues remain unresolved despite code changes, suggesting we are editing a file (`UnifiedTransactionTable.tsx`) that is **not actually being rendered** or is being overridden by an older component.

1.  **Account Images are still Square:**
    - **Expected:** `object-contain`, `w-auto`, max width constraints (Rectangular).
    - **Actual:** User reports images appear as 1:1 squares (cropped).
    - **Code Fix Applied:** Added `h-10 w-auto max-w-[80px] object-contain` to `UnifiedTransactionTable.tsx` (both Source and Target branches).
    - **Hypothesis:** The page might be rendering `TransactionCard` (V1) or an older table component instead of `UnifiedTransactionTable`.

2.  **Cycle Dates are Raw Tags:**
    - **Expected:** "01-01 to 31-01" (Date Range).
    - **Actual:** "2026-01" (Raw Tag).
    - **Code Fix Applied:** Added logic to regex-parse "YYYY-MM" tags and fallback to month start/end dates. Added `debtTag` support.
    - **Hypothesis:** The transformer function (`RenderEntity`) that contains this logic is not being called.

3.  **Missing "+ Paid" Badges:**
    - **Expected:** "+X Paid" badge on bulk transactions.
    - **Actual:** Badge not appearing in Notes column.
    - **Hypothesis:** Threshold logic matches, but again, wrong component rendering.

## 🔍 Codebase Conflict Analysis (V1 vs V2)

We detected two distinct Transaction components. This is the likely root cause of the "Fix Loop".

### V2 Code (Target for Fixes)
- **File:** `src/components/moneyflow/unified-transaction-table.tsx`
- **Component:** `UnifiedTransactionTable`
- **Features:** Comprehensive rendering, "Smart Context", new Badge logic.
- **Used By:** `SimpleTransactionTable.tsx` -> `MemberDetailView.tsx`.

### V1 Code (Suspected Ghost)
- **File:** `src/components/moneyflow/transaction-table.tsx`
- **Component:** `TransactionTable`
- **Features:** Uses `TransactionCard`, `Checkbox`, older layout.
- **Hypothesis:** If `MemberDetailView.tsx` or the parent page is somehow falling back to `TransactionTable` or if `SimpleTransactionTable` is not actually deploying the changes (caching?), the user sees V1.

**Also Detected:**
- `src/components/moneyflow/v2/TransactionCard.tsx` - Used by V1 `TransactionTable`.

## 🛠 Next Steps for Debugging Agent
1.  **Trace the Import Chain:** Verify exactly which component `src/app/people/[id]/details/page.tsx` is effectively rendering.
    - Check `member-detail-view.tsx` imports.
2.  **Force Fail Test:** Add a visible border (e.g., `border-4 border-red-500`) to `UnifiedTransactionTable.tsx`. If it doesn't show up, you are editing the wrong file.
3.  **Check Build/Cache:** Ensure Next.js Turbopack isn't serving stale cache.
4.  **Consolidate:** Consider deleting `transaction-table.tsx` (V1) if it's truly obsolete to prevent future confusion.
