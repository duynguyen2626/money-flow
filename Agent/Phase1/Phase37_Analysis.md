# Phase 37 - Comprehensive Implementation Summary

## Status: IN PROGRESS

Đây là một task rất lớn với 10+ yêu cầu spanning across multiple files. Do complexity, tôi đề xuất approach sau:

## PRIORITY 1 - Critical UI Fixes (CAN DO NOW)
### 1.1 Credit Card Balance Bug ⚠️ CRITICAL
**File**: `src/components/moneyflow/account-stats-header.tsx` hoặc nơi hiển thị Current Balance
**Issue**: Current Balance đang bị âm vì thiếu công thức: `Current Balance = Limit - Used Amount`
**Action**: Cần xem code hiện tại để fix

### 1.2 Request Refund Form Defaults
**File**: `src/components/moneyflow/transaction-form.tsx`
**Changes**:
- Line ~220: Set `defaultRefundStatus = 'pending'` instead of 'received'
- Auto-select "Refund" category when in refund mode (already done?)
- Ensure "Pending" tab is default for refunds

## PRIORITY 2 - Table UI Enhancements (MEDIUM COMPLEXITY)
### 2.1 Merge Cashback Columns → "Back Info"
**File**: `src/components/moneyflow/unified-transaction-table.tsx`
**Changes**:
1. Update `ColumnKey` type (lines 29-44): Replace cashback_percent, cashback_fixed, cashback_sum with `back_info` and add `status`
2. Update `defaultColumns` (lines 191-206): Replace 3 cashback columns with 1 back_info column
3. Update `visibleColumns` state (lines 212-228): Remove old cashback keys, add back_info and status
4. Update `resetColumns` function (lines 306-328): Same as above
5. Update `renderCell` switch (lines 963-970): Replace 3 cases with 1 `back_info` case that shows:
   ```tsx
   <div className="flex flex-col text-sm">
     <span className="text-slate-800 font-semibold">
       {percentRaw ? `${(percentRaw * 100).toFixed(2)}%` : ''}
       {percentRaw && fixedRaw ? ' + ' : ''}
       {fixedRaw ? numberFormatter.format(fixedRaw) : ''}
     </span>
     {calculatedSum > 0 && (
       <span className="text-emerald-600 font-bold flex items-center gap-1">
         <Sigma className="h-3 w-3" />
         {numberFormatter.format(calculatedSum)}
       </span>
     )}
   </div>
   ```
6. Add `status` case to renderCell showing badges for Void/Refunded/Partial/Active

### 2.2 Table Borders
**File**: Same file
**Changes**: Replace `border` with `border-2 border-slate-300` throughout table structure

### 2.3 Sort Amount Column
**Already supported** - just need to ensure UI shows sort icon

## PRIORITY 3 - Advanced Features (HIGH COMPLEXITY)
### 3.1 Transaction Type Filters (Income, Expense, Lend, Collect)
**New Component or Enhancement**: Need to create filter buttons similar to existing tag filters

### 3.2 Cancel Order (100%) Action
**File**: `unified-transaction-table.tsx`
**Changes**:
- Add "Cancel Order" button in action menu
- Create confirmation dialog
- Call `requestRefund` with full amount and `refund_status='pending'`

### 3.3 Batch Template Features
**Files**: 
- `src/components/batch/batch-page-client.tsx`
- `src/actions/batch.actions.ts`
**Changes**:
- Replace browser `confirm()` with custom dialog component
- Update batch creation logic to show templates in both Processing and Monthly Clone tabs
- Add transaction creation when "Fund" button is clicked

### 3.4 Sheet API Bank Code
**File**: API route for sending to sheets (need to locate)
**Change**: Add bank code prefix to column F (e.g., "203 - Vietcombank")

## RECOMMENDATION
Given the scope, I suggest:
1. Start with Priority 1 (Critical fixes) - 30 mins
2. Then Priority 2.1 & 2.2 (Table UI) - 1 hour
3. Test and commit
4. Then tackle Priority 3 items one by one

Total estimated time: 3-4 hours of focused work

## CURRENT BLOCKERS
- File `unified-transaction-table.tsx` is 1300+ lines - very easy to break
- Multiple interdependent changes make it risky to do all at once
- Need to test after each major change

## NEXT STEPS
Bạn muốn tôi:
A) Làm từng priority group, test sau mỗi group
B) Tập trung vào top 3-4 items quan trọng nhất
C) Tạo detailed step-by-step plan cho từng item
