# Cashback UI Restoration - Summary

## Changes Made

### 1. **Category Display with Images** ✅
- **Updated `cashback.service.ts`**:
  - Added `icon` and `image_url` fields to the `TransactionLineRow` type
  - Updated the database query to fetch `categories(name, icon, image_url)`
  - Modified `toTransaction()` to return `categoryIcon` and `categoryImageUrl`

- **Updated `cashback.types.ts`**:
  - Added `categoryIcon?: string | null` and `categoryImageUrl?: string | null` to `CashbackTransaction` type

- **Updated `cashback/[id]/page.tsx`**:
  - Mapped `categoryIcon` and `categoryImageUrl` from cashback transaction data to the table

**Result**: Categories now display with their proper icons/images instead of showing "Uncategorized"

---

### 2. **Profit Calculation Formula Display** ✅
- **Updated `unified-transaction-table.tsx`**:
  
  **Initial Back Column**:
  - Shows bank cashback amount in bold green
  - Displays formula as subtext: `[Rate]% * [Amount]`
  
  **People Back Column**:
  - Shows shared amount in bold orange
  - Displays formula as subtext: `[Percent]% + [Fixed]`
  
  **Profit Column**:
  - Shows net profit in green (positive) or red (negative)
  - Displays "Net" as subtext for clarity

- **Updated `cashback/[id]/page.tsx`**:
  - Added `bank_rate`, `cashback_share_percent`, `cashback_share_fixed` to transaction mapping
  - Hidden unnecessary columns: `account`, `cycle`, `tag`, `final_price`, `back_info`

**Result**: Users can now see exactly how cashback is calculated for each transaction

---

### 3. **Fixed Edit Tab Navigation Bug** ✅
- **Updated `buildEditInitialValues()` in `unified-transaction-table.tsx`**:
  - Enhanced type derivation logic to check both `categoryLine?.categories?.name` AND `txn.category_name`
  - This fixes the issue where editing cashback transactions (which have empty `transaction_lines`) would incorrectly open the "Transfer" tab
  - Added fallback to `txn.type` when category information is unavailable
  - Added "refund" to income category detection

**Result**: Editing a cashback/income transaction now correctly opens the "Income" tab instead of "Transfer"

---

### 4. **Copy ID Button** ✅
The Copy ID button was already present in the table:
- In the "Notes" column (when hovering over a note)
- In the "Status" column (for refund-related IDs)
- In the "ID" column (when visible)

No changes needed - the functionality was already there!

---

## Visual Improvements

### Before:
- ❌ Categories showed "Uncategorized" (no images)
- ❌ Cashback columns showed raw numbers without context
- ❌ Edit button opened wrong tab for cashback transactions
- ❌ Cluttered with unnecessary columns

### After:
- ✅ Categories display with proper icons/images
- ✅ Initial Back: `50,000` with subtext `2.0% * 2,500,000`
- ✅ People Back: `25,000` with subtext `1.0% + 0`
- ✅ Profit: `25,000` with subtext `Net`
- ✅ Edit opens correct "Income" tab
- ✅ Clean, focused view showing only relevant cashback data

---

## Files Modified

1. `/src/services/cashback.service.ts` - Enhanced data fetching
2. `/src/types/cashback.types.ts` - Added category fields
3. `/src/app/cashback/[id]/page.tsx` - Updated data mapping and hidden columns
4. `/src/components/moneyflow/unified-transaction-table.tsx` - Enhanced column rendering and edit logic

---

## Testing Checklist

- [ ] Navigate to `/cashback/[id]` page
- [ ] Verify categories show with icons/images
- [ ] Verify "Initial Back" shows amount + formula
- [ ] Verify "People Back" shows amount + formula  
- [ ] Verify "Profit" shows amount + "Net" label
- [ ] Click Edit on a cashback transaction
- [ ] Verify it opens the "Income" tab (not "Transfer")
- [ ] Verify Copy ID buttons work in Notes/Status/ID columns
