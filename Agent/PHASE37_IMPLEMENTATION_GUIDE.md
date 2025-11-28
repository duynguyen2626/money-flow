# Phase 37 - Complete Implementation Guide

## Overview
This guide provides exact, line-by-line instructions for implementing all Phase 37 requirements. Follow each section carefully.

---

## ✅ COMPLETED
### 1. Bank Mapping Count Bug
**Status**: Already fixed in previous session
**File**: `src/services/bank.service.ts`
**Change**: Added service role key support to bypass RLS

### 2. Credit Card Balance Display Enhancement
**Status**: Completed
**File**: `src/components/moneyflow/account-card.tsx`
**Change**: Updated to show both "Dư nợ" and "Khả dụng"

### 3. Refund Form Defaults
**Status**: Completed
**File**: `src/components/moneyflow/transaction-form.tsx`
**Change**: Verified defaults to "Pending"

### 4. Unified Transaction Table - Back Info Column
**Status**: Completed
**File**: `src/components/moneyflow/unified-transaction-table.tsx`
**Change**: Implemented Back Info column, Status column, and darker borders

### 5. Cancel Order (100%) Button
**Status**: Completed
**File**: `src/components/moneyflow/unified-transaction-table.tsx`
**Change**: Added Cancel Order button and confirmation dialog

---

## 🔧 TO IMPLEMENT
(None - All tasks completed)

### 2. Credit Card Balance Display Enhancement

**File**: `src/components/moneyflow/account-card.tsx`

**Location**: Lines 237-248 (inside the credit card balance display section)

**Current Code**:
```tsx
<div className="text-right flex-1">
  {isCreditCard ? (
    <div className="flex flex-col items-end gap-1">
      {creditLimit > 0 && (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 shadow-lg">
          <CreditCard className="h-4 w-4 text-white" />
          <p className="text-xl font-bold leading-tight tracking-tight text-white whitespace-nowrap">
            {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(availableBalance)}
          </p>
        </div>
      )}
    </div>
```

**Replace With**:
```tsx
<div className="text-right flex-1">
  {isCreditCard ? (
    <div className="flex flex-col items-end gap-1">
      {/* Dư nợ (Current Debt) */}
      {debtAmount > 0 && (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2 py-1 shadow-md">
          <Wallet className="h-3 w-3 text-white" />
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-semibold text-white/80 leading-none">Dư nợ</span>
            <p className="text-sm font-bold leading-tight text-white whitespace-nowrap">
              {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(debtAmount)}
            </p>
          </div>
        </div>
      )}
      {/* Khả dụng (Available) */}
      {creditLimit > 0 && (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1 shadow-md">
          <CreditCard className="h-3 w-3 text-white" />
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-semibold text-white/80 leading-none">Khả dụng</span>
            <p className="text-sm font-bold leading-tight text-white whitespace-nowrap">
              {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(availableBalance)}
            </p>
          </div>
        </div>
      )}
    </div>
```

**Explanation**: 
- Shows both "Dư nợ" (current debt) and "Khả dụng" (available credit)
- Formula is already correct: `availableBalance = creditLimit + current_balance`
- When current_balance is -3M and limit is 10M, available = 7M ✓

---

### 3. Refund Form Defaults

**File**: `src/components/moneyflow/transaction-form.tsx`

#### 3a. Find the refund status initialization (around line 150-200)

**Search for**: `const [refundStatus, setRefundStatus] = useState`

**Current**:
```tsx
const [refundStatus, setRefundStatus] = useState<'pending' | 'received'>(
  initialValues?.refund_status === 'pending' ? 'pending' : 'received'
)
```

**Replace with**:
```tsx
const [refundStatus, setRefundStatus] = useState<'pending' | 'received'>(
  initialValues?.refund_status === 'received' ? 'received' : 'pending'
)
```

**Explanation**: Default to 'pending' instead of 'received'

#### 3b. Auto-select Refund category

**Search for**: `const categoryOptions = useMemo`

**Find this section** (around line 580-610):
```tsx
if (isRefundMode && refundCategoryId) {
  const refundCat =
    categories.find(cat => cat.id === refundCategoryId) ??
    categories.find(cat => (cat.name ?? '').toLowerCase().includes('refund')) ??
    null
```

**Ensure it looks like this** (should already be correct):
```tsx
if (isRefundMode && refundCategoryId) {
  const refundCat =
    categories.find(cat => cat.id === refundCategoryId) ??
    categories.find(cat => (cat.name ?? '').toLowerCase().includes('refund')) ??
    categories.find(cat => (cat.name ?? '').toLowerCase().includes('pending')) ??
    null
  return [
    {
      value: refundCategoryId,
      label: refundCat?.name ?? 'Refund',
      description: refundCat?.type === 'income' ? 'Income' : 'Expense',
      searchValue: refundCat?.name ?? 'Refund',
      icon: refundCat?.icon ? (
        <span className="text-lg">{refundCat.icon}</span>
      ) : undefined,
    },
  ]
}
```

**If not present, add**: Search for "pending" category as fallback

---

### 4. Unified Transaction Table - Back Info Column

**File**: `src/components/moneyflow/unified-transaction-table.tsx`

This is the most complex change. Follow carefully:

#### 4a. Update imports (Line 4)

**Current**:
```tsx
import { Ban, Loader2, MoreHorizontal, Pencil, RotateCcw, SlidersHorizontal, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, ArrowRight, ArrowLeft, Copy, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
```

**Add Trash2 and Sigma**:
```tsx
import { Ban, Loader2, MoreHorizontal, Pencil, RotateCcw, SlidersHorizontal, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, ArrowRight, ArrowLeft, Copy, ArrowUp, ArrowDown, ArrowUpDown, Trash2, Sigma } from "lucide-react"
```

#### 4b. Update ColumnKey type (Lines 29-44)

**Current**:
```tsx
type ColumnKey =
  | "date"
  | "type"
  | "shop"
  | "category"
  | "people"
  | "tag"
  | "cycle"
  | "account"
  | "amount"
  | "cashback_percent"
  | "cashback_fixed"
  | "cashback_sum"
  | "final_price"
  | "id"
  | "task"
```

**Replace with**:
```tsx
type ColumnKey =
  | "date"
  | "type"
  | "shop"
  | "category"
  | "people"
  | "tag"
  | "cycle"
  | "account"
  | "amount"
  | "back_info"
  | "final_price"
  | "status"
  | "id"
  | "task"
```

#### 4c. Update defaultColumns array (Lines 191-206)

**Current**:
```tsx
const defaultColumns: ColumnConfig[] = [
  { key: "date", label: "Date", defaultWidth: 60, minWidth: 50 },
  { key: "type", label: "Type", defaultWidth: 110, minWidth: 90 },
  { key: "shop", label: "Notes", defaultWidth: 220, minWidth: 160 },
  { key: "category", label: "Category", defaultWidth: 150 },
  ...(!hidePeopleColumn ? [{ key: "people", label: "Person", defaultWidth: 140 } as ColumnConfig] : []),
  { key: "account", label: "Account", defaultWidth: 180 },
  { key: "cycle", label: "Cycle", defaultWidth: 100 },
  { key: "amount", label: "Amount", defaultWidth: 120 },
  { key: "cashback_percent", label: "% Back", defaultWidth: 70 },
  { key: "cashback_fixed", label: "Fix Back", defaultWidth: 80 },
  { key: "cashback_sum", label: "Sum Back", defaultWidth: 100 },
  { key: "final_price", label: "Final Price", defaultWidth: 120 },
  { key: "tag", label: accountType === 'credit_card' ? "Cycle" : "Tag", defaultWidth: 80 },
  { key: "id", label: "ID", defaultWidth: 100 },
  { key: "task", label: "", defaultWidth: 48, minWidth: 48 },
]
```

**Replace with**:
```tsx
const defaultColumns: ColumnConfig[] = [
  { key: "date", label: "Date", defaultWidth: 70, minWidth: 60 },
  { key: "type", label: "Type", defaultWidth: 110, minWidth: 90 },
  { key: "shop", label: "Notes", defaultWidth: 220, minWidth: 160 },
  { key: "category", label: "Category", defaultWidth: 150 },
  ...(!hidePeopleColumn ? [{ key: "people", label: "Person", defaultWidth: 140 } as ColumnConfig] : []),
  { key: "account", label: "Account", defaultWidth: 180 },
  { key: "cycle", label: "Cycle", defaultWidth: 100 },
  { key: "amount", label: "Amount", defaultWidth: 120 },
  { key: "back_info", label: "Back Info", defaultWidth: 140 },
  { key: "final_price", label: "Final Price", defaultWidth: 120 },
  { key: "tag", label: accountType === 'credit_card' ? "Cycle" : "Tag", defaultWidth: 120 },
  { key: "status", label: "Status", defaultWidth: 110 },
  { key: "id", label: "ID", defaultWidth: 100 },
  { key: "task", label: "", defaultWidth: 48, minWidth: 48 },
]
```

#### 4d. Update visibleColumns state (Lines 212-228)

**Current**:
```tsx
const initial: Record<ColumnKey, boolean> = {
  date: true,
  type: true,
  shop: true,
  category: true,
  people: !hidePeopleColumn,
  tag: true,
  cycle: true,
  account: true,
  amount: true,
  cashback_percent: true,
  cashback_fixed: true,
  cashback_sum: false,
  final_price: true,
  id: false,
  task: true,
}
```

**Replace with**:
```tsx
const initial: Record<ColumnKey, boolean> = {
  date: true,
  type: true,
  shop: true,
  category: true,
  people: !hidePeopleColumn,
  tag: true,
  cycle: true,
  account: true,
  amount: true,
  back_info: true,
  final_price: true,
  status: true,
  id: false,
  task: true,
}
```

#### 4e. Update resetColumns function (Lines 306-328)

**Find**:
```tsx
setVisibleColumns({
  date: true,
  type: true,
  shop: true,
  category: true,
  people: !hidePeopleColumn,
  tag: true,
  cycle: true,
  account: true,
  amount: true,
  cashback_percent: true,
  cashback_fixed: true,
  cashback_sum: false,
  final_price: true,
  id: false,
  task: true,
})
```

**Replace with**:
```tsx
setVisibleColumns({
  date: true,
  type: true,
  shop: true,
  category: true,
  people: !hidePeopleColumn,
  tag: true,
  cycle: true,
  account: true,
  amount: true,
  back_info: true,
  final_price: true,
  status: true,
  id: false,
  task: true,
})
```

#### 4f. Update renderCell switch statement (Lines 963-970)

**Find these three cases**:
```tsx
case "cashback_percent":
  return typeof percentRaw === 'number' ? <span className="text-slate-600">{(percentRaw * 100).toFixed(2)}%</span> : <span className="text-slate-300">-</span>
case "cashback_fixed":
  return typeof fixedRaw === 'number' ? <span className="text-slate-600">{numberFormatter.format(fixedRaw)}</span> : <span className="text-slate-300">-</span>
case "cashback_sum":
  return calculatedSum > 0 ? <span className="text-slate-600 font-medium">{numberFormatter.format(calculatedSum)}</span> : <span className="text-slate-300">-</span>
```

**Replace with ONE case**:
```tsx
case "back_info":
  if (!percentRaw && !fixedRaw) return <span className="text-slate-300">-</span>
  return (
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
  )
```

#### 4g. Add status case (after final_price case, around line 972)

**Add this NEW case**:
```tsx
case "status":
  if (isVoided) return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">Void</span>
  if (refundStatus === 'full' || isFullyRefunded) return <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">Refunded</span>
  if (refundStatus === 'partial' || isPartialRefund) return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">Partial Refund</span>
  return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span>
```

#### 4h. Make table borders darker (Lines 578-610)

**Find**:
```tsx
<div className="rounded-md border bg-white shadow-sm overflow-hidden">
  <Table>
    <TableHeader className="bg-slate-50/80">
      <TableRow>
        <TableHead className="border-r whitespace-nowrap" style={{ width: 52 }}>
```

**Replace `border` with `border-2 border-slate-300`**:
```tsx
<div className="rounded-md border-2 border-slate-300 bg-white shadow-sm overflow-hidden">
  <Table>
    <TableHeader className="bg-slate-50/80">
      <TableRow>
        <TableHead className="border-r-2 border-slate-300 whitespace-nowrap" style={{ width: 52 }}>
```

**Continue replacing all `border-r` with `border-r-2 border-slate-300` in**:
- Line ~595: `className="text-right border-l bg-slate-100"`
- Line ~610: `className="border-r bg-slate-100"`
- All TableCell borders in the body

---

### 5. Cancel Order (100%) Button

**File**: `src/components/moneyflow/unified-transaction-table.tsx`

#### 5a. Add state for cancel confirmation (around line 270)

**Find**:
```tsx
const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
```

**Add after it**:
```tsx
const [confirmCancelTarget, setConfirmCancelTarget] = useState<TransactionWithDetails | null>(null)
```

#### 5b. Add Cancel Order button in action menu (around line 750)

**Find the section with "Partial Refund" button**:
```tsx
<button
  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
  onClick={event => {
    event.stopPropagation();
    openRefundForm(txn, 'request');
  }}
>
  <RotateCcw className="h-4 w-4 text-slate-600" />
  <span>Partial Refund</span>
</button>
```

**Add AFTER it**:
```tsx
<button
  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-red-600 hover:bg-red-50"
  onClick={event => {
    event.stopPropagation();
    setConfirmCancelTarget(txn);
    setActionMenuOpen(null);
  }}
>
  <Trash2 className="h-4 w-4" />
  <span>Cancel Order (100%)</span>
</button>
```

#### 5c. Add confirmation dialog (after confirmVoidTarget dialog, around line 1200)

**Add this NEW dialog**:
```tsx
{confirmCancelTarget && createPortal(
  <div
    className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
    onClick={() => setConfirmCancelTarget(null)}
  >
    <div
      className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
      onClick={event => event.stopPropagation()}
    >
      <h3 className="text-lg font-semibold text-slate-900">Cancel Order (Full Refund)?</h3>
      <p className="mt-2 text-sm text-slate-600">
        This will request a full refund of {numberFormatter.format(Math.abs(confirmCancelTarget.original_amount ?? confirmCancelTarget.amount ?? 0))} and mark the order as cancelled.
      </p>
      <p className="mt-2 text-xs text-amber-600">
        Money will stay in "Pending" account until you confirm receipt.
      </p>
      {voidError && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {voidError}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button
          className="flex-1 rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          onClick={() => setConfirmCancelTarget(null)}
          disabled={isVoiding}
        >
          Cancel
        </button>
        <button
          className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          onClick={handleCancelOrderConfirm}
          disabled={isVoiding}
        >
          {isVoiding ? 'Processing...' : 'Confirm Cancel'}
        </button>
      </div>
    </div>
  </div>,
  document.body
)}
```

#### 5d. Add handler function (around line 400)

**Add this function**:
```tsx
const handleCancelOrderConfirm = () => {
  if (!confirmCancelTarget) return
  setVoidError(null)
  setIsVoiding(true)

  import("@/services/transaction.service").then(({ requestRefund }) => {
    const originalAmount = typeof confirmCancelTarget.original_amount === "number" 
      ? confirmCancelTarget.original_amount 
      : confirmCancelTarget.amount
    const amountToRefund = Math.abs(originalAmount ?? 0)
    
    requestRefund(
      confirmCancelTarget.id, 
      amountToRefund, 
      false, // isPending = false means it goes to Pending account
      { note: "Cancel Order (Full Refund)" }
    ).then(res => {
      if (res.success) {
        router.refresh()
        setConfirmCancelTarget(null)
      } else {
        setVoidError(res.error || 'Failed to cancel order')
      }
    }).catch(err => {
      console.error(err)
      setVoidError('Failed to cancel order')
    }).finally(() => {
      setIsVoiding(false)
    })
  })
}
```

---

## Testing Checklist

After implementing all changes:

- [ ] Credit card shows both "Dư nợ" and "Khả dụng"
- [ ] Refund form defaults to "Pending" tab
- [ ] Back Info column shows rate + fixed on line 1, Σ sum on line 2
- [ ] Table borders are darker (border-2)
- [ ] Status column shows correct badges
- [ ] Cancel Order button appears in action menu
- [ ] Cancel Order creates refund with pending status
- [ ] No TypeScript errors
- [ ] `npm run build` succeeds

---

## Notes

- **DO NOT** edit multiple sections at once
- **TEST** after each major change
- **COMMIT** after each successful change
- If you encounter errors, revert and try again
- The unified-transaction-table.tsx file is 1300+ lines - be very careful

---

## Estimated Time
- Credit Card Balance: 10 minutes
- Refund Form Defaults: 15 minutes
- Back Info Column: 45 minutes
- Cancel Order Button: 30 minutes
- **Total**: ~2 hours

Good luck! 🚀
