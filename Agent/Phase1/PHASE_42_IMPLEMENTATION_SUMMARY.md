# Phase 42: Cashback Reboot & Refund UI Polish - Implementation Summary

## Completed: 2025-11-29

### Overview
Successfully implemented Phase 42 which includes:
1. ✅ UI polish for transaction table status badges
2. ✅ Tiered cashback engine with profit tracking
3. ✅ Enhanced cashback dashboard with detailed profit breakdown
4. ✅ **[New]** Cashback Dashboard now links to detailed page instead of popup
5. ✅ **[New]** Refund Tracker unified with main transaction table UI
6. ✅ **[New]** "Voluntary Cashback" toggle for Lending transactions
7. ✅ **[New]** Transaction Form Redesign (Icons, Colored Tabs, Wider Modal)
8. ✅ **[New]** Copy IDs in Transaction Table (Note & Status columns)
9. ✅ **[New]** Cashback Detail Page uses Unified Transaction Table (Full Width)
10. ✅ **[New]** Detailed Cashback Columns (Initial Back, People Back, Profit)

---

## 1. Transaction Table UI Improvements

### Changes Made:
- **File**: `src/components/moneyflow/unified-transaction-table.tsx`
- **Line 820**: Removed line-through styling from `pending` and `waiting_refund` statuses
- Only `void` transactions now get the opacity and line-through treatment
- Status badges (lines 1078-1087) already properly display:
  - 🟢 Active (Posted) - Green
  - 🟡 Pending - Yellow
  - 🟠 Waiting Refund - Amber
  - 🟣 Refunded - Purple
  - ⚫ Void - Gray
- **Copy IDs**: Added copy icons to:
  - **Note Column**: Copies Transaction ID
  - **Status Column**: Copies Refund/Linked ID (if available)
- **New Columns**: Added `initial_back`, `people_back`, `profit` columns.
  - **Profit**: Displays in Green (profit) or Red (loss).
  - **Hidden by Default**: These columns are hidden in the main transaction view but enabled in the Cashback Detail view.

### Result:
Transactions with pending or waiting_refund status now display clearly with their status badges instead of being struck through. Debugging is easier with copyable IDs. Detailed cashback metrics are available where needed.

---

## 2. Tiered Cashback Engine

### New Types & Structures:

#### `src/lib/cashback.ts`
Added support for tiered cashback configurations:

```typescript
export type CashbackTier = {
  minSpend: number // Minimum spend to qualify for this tier
  categories: Record<string, { rate: number; maxAmount?: number }>
  defaultRate?: number // Default rate for categories not specified
}

export type ParsedCashbackConfig = {
  // ... existing fields
  hasTiers?: boolean
  tiers?: CashbackTier[]
}
```

#### Parser Updates:
- Updated `parseConfigCandidate()` to parse tiered configurations from database
- Handles both snake_case and camelCase property names
- Validates tier structures and category mappings

### Cashback Calculation Logic:

#### `src/services/cashback.service.ts`
Completely rewrote the transaction mapping logic:

1. **Calculate Total Spend First**: Required for tier determination
2. **Map Transactions with Context**: Each transaction is mapped with:
   - The full config (including tiers)
   - Total spend in cycle (for tier qualification)
3. **Tiered Rate Application**:
   - Finds the highest qualifying tier based on total spend
   - Matches transaction category to tier category rules
   - Applies category-specific rate or tier default rate
   - Falls back to base rate if no tier applies

#### Example: VPBank Lady Card Logic
```javascript
// If total spend >= 15M, qualify for Tier 1
// Tier 1 categories:
//   - Insurance: 10% cashback
//   - Supermarket: 5% cashback
//   - Default: 2% cashback
```

### Profit Tracking:

#### `src/types/cashback.types.ts`
Extended `CashbackTransaction`:

```typescript
export type CashbackTransaction = {
  // ... existing fields
  bankBack: number    // What the bank gives back
  peopleBack: number  // What was shared with others
  profit: number      // bankBack - peopleBack
  shopName?: string   // Shop Name
  shopLogoUrl?: string | null // Shop Logo
  categoryName?: string // Category Name
}
```

#### Calculation Flow:
1. **Bank Back**: Calculated using tiered rates or base rate
2. **People Back**: Extracted from transaction metadata (cashback_share_amount)
3. **Profit**: `bankBack - peopleBack`

---

## 3. Enhanced Cashback Dashboard

### Transaction Details View:

#### `src/app/cashback/[id]/page.tsx`
- Replaced custom table with `UnifiedTransactionTable`.
- **Layout**: Full width (`w-full`) to utilize screen space.
- **Columns**: Hides `back_info` and shows `initial_back`, `people_back`, `profit` separately.
- **Category**: Displays actual category name instead of "Uncategorized".
- Fixed Next.js 15 `params` await issue.

#### `src/components/moneyflow/cashback-dashboard.tsx`
- Replaced popup dialog with direct link to `/cashback/[id]` for better UX.

---

## 4. Refund Tracker UI Polish

#### `src/app/refunds/page.tsx`
- Replaced `RecentTransactions` with `UnifiedTransactionTable`.
- Now shares the same consistent design as the main transaction list.
- Features:
  - **Back Info** column (merged % and fixed back)
  - **Status** column (Active, Pending, Void, etc.)
  - No ugly strikethrough for pending items.

---

## 5. Transaction Form Redesign

#### `src/components/moneyflow/transaction-form.tsx`
- **Layout**: 1-column stack layout with wider Modal (`max-w-xl`).
- **Tabs**: Added icons and color coding for Transaction Types:
  - 🟥 **Expense** (Red)
  - 🟩 **Income** (Green)
  - 🟦 **Transfer** (Blue)
  - 🟧 **Lending** (Orange)
  - 🟪 **Repay** (Lime)
- **Icons**: Added icons to all input labels (Wallet, Tag, Calendar, etc.).
- **Voluntary Cashback**:
  - Replaced checkbox with a **Switch** component.
  - Moved below **Amount** field.
  - Logic fixed to ensure visibility when enabled.
- **Cashback Inputs**: Moved to appear immediately after Voluntary Cashback switch.
- **Repayment**: Cashback inputs are now explicitly hidden for Repayment type.
- **Field Order**: Moved **People** dropdown up (before Category).

#### `src/services/transaction.service.ts`
- Updated `createTransaction` to handle `is_voluntary` flag.
- Persists `is_voluntary: true` in transaction line metadata.
- Updated `requestRefund` to copy cashback info to refund metadata.

---

## 6. Database Configuration Example

To use tiered cashback, set the account's `cashback_config` like this:

```json
{
  "rate": 0.02,
  "max_amt": 1000000,
  "cycle_type": "statement_cycle",
  "statement_day": 15,
  "min_spend": 5000000,
  "has_tiers": true,
  "tiers": [
    {
      "minSpend": 15000000,
      "categories": {
        "insurance": { "rate": 0.10, "maxAmount": 500000 },
        "supermarket": { "rate": 0.05 },
        "shopping": { "rate": 0.03 }
      },
      "defaultRate": 0.02
    },
    {
      "minSpend": 5000000,
      "categories": {
        "insurance": { "rate": 0.05 },
        "supermarket": { "rate": 0.03 }
      },
      "defaultRate": 0.015
    }
  ]
}
```

### How It Works:
1. If total spend >= 15M: Use Tier 1 rates
2. Else if total spend >= 5M: Use Tier 2 rates
3. Else: Use base rate (0.02)

Category matching is case-insensitive and uses substring matching:
- Transaction with category "Bảo hiểm" matches "insurance"
- Transaction with category "Siêu thị" matches "supermarket"

---

## 7. Real-World Example: iPhone Purchase

### Scenario:
- Bought iPhone for Lâm: 30,000,000₫
- Bank cashback (2%): 600,000₫
- Shared with Lâm (50%): 300,000₫
- **Your Profit**: 300,000₫

### Before Phase 42:
- Could only see total earned: 600,000₫
- No visibility into what was shared
- No profit calculation

### After Phase 42:
```
Cashback Dashboard:
├─ Total Earned (Bank): 600,000₫
├─ Shared (People): 300,000₫
└─ Net Profit: 300,000₫ ✨

Transaction Detail:
┌────────────────────────────────────┐
│ iPhone 15 Pro Max - 30,000,000₫    │
│ Bank Back: 600,000₫                │
│ People Back: 300,000₫              │
│ Profit: 300,000₫                   │
└────────────────────────────────────┘
```

---

## 8. Testing Checklist

- [x] Build passes without errors
- [x] TypeScript types are correct
- [x] Test with standard cashback (single rate)
- [x] Test with tiered cashback (VPBank Lady)
- [x] Verify profit calculations
- [x] Check transaction table status badges
- [x] Verify cashback dashboard displays correctly
- [x] Verify Refund Tracker UI
- [x] Verify Voluntary Cashback toggle
- [x] Verify Transaction Form Redesign
- [x] Verify Cashback Detail Page (Unified Table, Full Width, Split Columns)

---

## 9. Files Modified

1. `src/components/moneyflow/unified-transaction-table.tsx` - Status badge fix, Copy IDs, Profit/Back columns
2. `src/lib/cashback.ts` - Tiered config types and parser
3. `src/types/cashback.types.ts` - Profit tracking fields, Shop/Category info
4. `src/services/cashback.service.ts` - Tiered calculation engine, Shop/Category fetch
5. `src/components/moneyflow/cashback-details.tsx` - Profit breakdown UI
6. `src/app/cashback/[id]/page.tsx` - Unified Table implementation (Full Width)
7. `src/components/moneyflow/cashback-dashboard.tsx` - Link to detail page
8. `src/app/refunds/page.tsx` - Unified UI
9. `src/components/moneyflow/transaction-form.tsx` - Redesign & Voluntary cashback toggle
10. `src/services/transaction.service.ts` - Voluntary cashback logic & Refund metadata
11. `src/components/moneyflow/add-transaction-dialog.tsx` - Wider modal
12. `src/types/moneyflow.types.ts` - Extended TransactionWithDetails
13. `src/components/moneyflow/filterable-transactions.tsx` - Hide cashback columns by default

---

## Notes

- The tiered cashback engine is fully backward compatible
- Accounts without `has_tiers: true` will use the standard rate
- Category matching is flexible (substring, case-insensitive)
- All profit calculations are done server-side for accuracy
