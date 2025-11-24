"use client"

import { useMemo, useState } from "react"
import { Ban, Loader2, MoreHorizontal, Pencil, RotateCcw, SlidersHorizontal, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, ArrowRight, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Account, Category, Person, Shop, TransactionWithDetails, TransactionWithLineRelations } from "@/types/moneyflow.types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionForm, TransactionFormValues } from "./transaction-form"
import {
  restoreTransaction,
  voidTransaction,
  requestRefund,
  confirmRefund,
} from "@/services/transaction.service"
import { REFUND_PENDING_ACCOUNT_ID } from "@/constants/refunds"
import { generateTag } from "@/lib/tag"
import { cn } from "@/lib/utils"

type ColumnKey =
  | "date"
  | "type"
  | "shop" // Merged Shop/Note
  | "category"
  | "account" // Smart Account
  | "people" // Separated
  | "tag" // Separated
  | "amount"
  | "cashback_percent"
  | "cashback_fixed"
  | "cashback_sum"
  | "task"

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

function buildEditInitialValues(txn: TransactionWithDetails): Partial<TransactionFormValues> {
  const lines = (txn.transaction_lines ?? []).filter(Boolean) as TransactionWithLineRelations[];
  const accountLines = lines.filter(line => line.account_id);
  const creditLine = accountLines.find(line => line.type === "credit");
  const debitLine =
    accountLines.find(line => line.type === "debit" && line.account_id !== creditLine?.account_id) ??
    accountLines.find(line => line.type === "debit");
  const categoryLine = lines.find(line => line.category_id);
  const personLine = lines.find(line => line.person_id);
  const baseAmount =
    typeof txn.original_amount === "number" ? txn.original_amount : txn.amount ?? 0;
  const percentValue =
    typeof txn.cashback_share_percent === "number" ? txn.cashback_share_percent : undefined;

  let derivedType: TransactionFormValues["type"] = txn.type as TransactionFormValues["type"] || "expense";

  if (personLine?.person_id) {
     if (categoryLine?.categories?.name?.toLowerCase().includes('thu nợ')
         || categoryLine?.categories?.name?.toLowerCase().includes('repayment')) {
         derivedType = 'repayment';
     } else {
         derivedType = 'debt';
     }
  } else if (!categoryLine) {
     derivedType = 'transfer';
  } else if (categoryLine.type === 'debit') {
     derivedType = 'expense';
  } else {
     derivedType = 'income';
  }

  let sourceAccountId = creditLine?.account_id ?? debitLine?.account_id ?? undefined;
  if (derivedType === 'income') {
      sourceAccountId = debitLine?.account_id ?? undefined;
  }

  let destinationAccountId =
    derivedType === "transfer" || derivedType === "debt"
      ? debitLine?.account_id ?? undefined
      : undefined;

  if (derivedType === 'repayment') {
      sourceAccountId = debitLine?.account_id ?? undefined;
      destinationAccountId = creditLine?.account_id ?? undefined;
  }

  return {
    occurred_at: txn.occurred_at ? new Date(txn.occurred_at) : new Date(),
    type: derivedType,
    amount: Math.abs(baseAmount ?? 0),
    note: txn.note ?? "",
    tag: txn.tag ?? generateTag(new Date()),
    source_account_id: sourceAccountId,
    category_id: categoryLine?.category_id ?? undefined,
    person_id: personLine?.person_id ?? undefined,
    debt_account_id: destinationAccountId,
    shop_id: txn.shop_id ?? undefined,
    cashback_share_percent:
      percentValue !== undefined && percentValue !== null ? percentValue * 100 : undefined,
    cashback_share_fixed:
      typeof txn.cashback_share_fixed === "number" ? txn.cashback_share_fixed : undefined,
  };
}

interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultWidth: number
  minWidth?: number
}

interface UnifiedTransactionTableProps {
  transactions: TransactionWithDetails[]
  accountType?: Account['type']
  accountId?: string // Specific Account Context
  selectedTxnIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  accounts?: Account[]
  categories?: Category[]
  people?: Person[]
  shops?: Shop[]
}

const defaultColumns: ColumnConfig[] = [
  { key: "date", label: "Date", defaultWidth: 100, minWidth: 90 },
  { key: "type", label: "Type", defaultWidth: 110, minWidth: 90 },
  { key: "shop", label: "Notes", defaultWidth: 220, minWidth: 160 },
  { key: "category", label: "Category", defaultWidth: 150 },
  { key: "people", label: "Person", defaultWidth: 140 },
  { key: "tag", label: "Tag", defaultWidth: 100 },
  { key: "account", label: "Account", defaultWidth: 180 },
  { key: "amount", label: "Amount", defaultWidth: 120 },
  { key: "cashback_percent", label: "% Back", defaultWidth: 80 },
  { key: "cashback_fixed", label: "Fix Back", defaultWidth: 80 },
  { key: "cashback_sum", label: "Sum Back", defaultWidth: 100 },
  { key: "task", label: "", defaultWidth: 48, minWidth: 48 },
]

function parseMetadata(value: TransactionWithDetails['metadata']) {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    } catch {
      return null
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

export function UnifiedTransactionTable({
  transactions,
  accountType,
  accountId,
  selectedTxnIds,
  onSelectionChange,
  accounts = [],
  categories = [],
  people = [],
  shops = [],
}: UnifiedTransactionTableProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'active' | 'void'>('active')
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    // Default to visible for Global view (where accountId is undefined) and Account view
    // User requested to "Unhide" them.
    return {
      date: true,
      type: true,
      shop: true,
      category: true,
      people: true,
      tag: true,
      account: true,
      amount: true,
      cashback_percent: true,
      cashback_fixed: true,
      cashback_sum: false, // Default hidden
      task: true,
    }
  })
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    const map = {} as Record<ColumnKey, number>
    defaultColumns.forEach(col => {
      map[col.key] = col.defaultWidth
    })
    return map
  })

  // State for actions
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null)
  const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TransactionWithDetails['status']>>({})
  const [refundDialogTxn, setRefundDialogTxn] = useState<TransactionWithDetails | null>(null)
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundInstant, setRefundInstant] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundTargetAccountId, setRefundTargetAccountId] = useState<string | null>(null)
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundDialogMode, setRefundDialogMode] = useState<'request' | 'confirm'>('request')

  const editingInitialValues = useMemo(
    () => (editingTxn ? buildEditInitialValues(editingTxn) : null),
    [editingTxn]
  )
  const refundAccountOptions = useMemo(
    () => accounts.filter(acc => acc.id !== REFUND_PENDING_ACCOUNT_ID),
    [accounts]
  )
  const selection = selectedTxnIds ?? internalSelection
  const updateSelection = (next: Set<string>) => {
    if (onSelectionChange) {
      onSelectionChange(next)
      return
    }
    setInternalSelection(next)
  }

  const toggleColumnVisibility = (key: ColumnKey) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateColumnWidth = (key: ColumnKey, value: number) => {
    const min = defaultColumns.find(col => col.key === key)?.minWidth ?? 80
    setColumnWidths(prev => ({ ...prev, [key]: Math.max(min, value) }))
  }

  const resetColumns = () => {
    const map = {} as Record<ColumnKey, number>
    defaultColumns.forEach(col => {
      map[col.key] = col.defaultWidth
    })
    setColumnWidths(map)
    setVisibleColumns({
        date: true,
        type: true,
        shop: true,
        category: true,
        people: true,
        tag: true,
        account: true,
        amount: true,
        cashback_percent: true,
        cashback_fixed: true,
        cashback_sum: false,
        task: true,
    })
  }

  // --- Date Formatting (Updated to DD-MM format) ---
  const formattedDate = (value: string | number | Date) => {
    const d = new Date(value)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    return `${day}-${month}`
  }

  // --- Actions ---
  const closeVoidDialog = () => {
    setConfirmVoidTarget(null)
    setVoidError(null)
    setIsVoiding(false)
  }

  const handleRestore = (txn: TransactionWithDetails) => {
    setIsRestoring(true)
    void restoreTransaction(txn.id)
      .then(ok => {
        if (!ok) {
          setVoidError('Unable to restore transaction. Please try again.')
          return
        }
        setActionMenuOpen(null)
        setVoidError(null)
        setStatusOverrides(prev => ({ ...prev, [txn.id]: 'posted' }))
        router.refresh()
      })
      .catch(err => {
        console.error('Failed to restore transaction:', err)
        setVoidError('Unable to restore transaction. Please try again.')
      })
      .finally(() => setIsRestoring(false))
  }

  const closeRefundDialog = () => {
    setRefundDialogTxn(null)
    setRefundError(null)
    setIsRefunding(false)
    setRefundInstant(false)
    setRefundAmount(0)
    setRefundTargetAccountId(null)
    setRefundDialogMode('request')
  }

  const openRefundDialog = (txn: TransactionWithDetails) => {
    const baseAmount = Math.abs(txn.original_amount ?? txn.amount ?? 0)
    const sourceAccountLine = txn.transaction_lines?.find(
      line => line?.type === "credit" && line.account_id
    ) ?? txn.transaction_lines?.find(line => line?.type === "debit" && line.account_id)
    const defaultAccountId = sourceAccountLine?.account_id ?? refundAccountOptions[0]?.id ?? null

    setRefundAmount(baseAmount)
    setRefundInstant(false)
    setRefundTargetAccountId(defaultAccountId)
    setRefundError(null)
    setRefundDialogMode('request')
    setRefundDialogTxn(txn)
    setActionMenuOpen(null)
  }

  const openConfirmRefundDialog = (txn: TransactionWithDetails) => {
    const pendingLine = txn.transaction_lines?.find(
      line => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
    )
    const amount = Math.abs(pendingLine?.amount ?? 0)
    const defaultAccountId = refundAccountOptions[0]?.id ?? null

    setRefundAmount(amount)
    setRefundInstant(false)
    setRefundTargetAccountId(defaultAccountId)
    setRefundError(null)
    setRefundDialogMode('confirm')
    setRefundDialogTxn(txn)
    setActionMenuOpen(null)
  }

  const handleRefundSubmit = async () => {
    if (!refundDialogTxn) return
    setRefundError(null)
    setIsRefunding(true)
    try {
      if (refundDialogMode === 'confirm') {
        if (!refundTargetAccountId) {
          setRefundError('Please select a target account.')
          return
        }

        const confirmResult = await confirmRefund(refundDialogTxn.id, refundTargetAccountId)
        if (!confirmResult.success) {
          setRefundError(confirmResult.error ?? 'Could not confirm refund.')
          return
        }

        closeRefundDialog()
        router.refresh()
        return
      }

      const amountBase = Math.abs(refundDialogTxn.original_amount ?? refundDialogTxn.amount ?? 0)
      const requestedAmount = Math.max(Number(refundAmount) || 0, 0)
      const amountToUse = Math.min(requestedAmount || amountBase, amountBase)
      if (amountToUse <= 0) {
        setRefundError('Please enter an amount greater than 0.')
        return
      }

      const isPartial = amountToUse < amountBase
      const requestResult = await requestRefund(refundDialogTxn.id, amountToUse, isPartial)
      if (!requestResult.success) {
        setRefundError(requestResult.error ?? 'Unable to create refund request.')
        return
      }

      if (refundInstant) {
        if (!refundTargetAccountId) {
          setRefundError('Please select the receiving account.')
          return
        }

        const confirmResult = await confirmRefund(
          requestResult.refundTransactionId ?? '',
          refundTargetAccountId
        )
        if (!confirmResult.success) {
          setRefundError(confirmResult.error ?? 'Could not confirm refund.')
          return
        }
      }

      closeRefundDialog()
      router.refresh()
    } finally {
      setIsRefunding(false)
    }
  }

  const handleVoidConfirm = () => {
    if (!confirmVoidTarget) return
    setVoidError(null)
    setIsVoiding(true)
    void voidTransaction(confirmVoidTarget.id)
      .then(ok => {
        if (!ok) {
          setVoidError('Unable to void transaction. Please try again.')
          return
        }
        setStatusOverrides(prev => ({ ...prev, [confirmVoidTarget.id]: 'void' }))
        closeVoidDialog()
        router.refresh()
      })
      .catch(err => {
        console.error('Failed to void transaction:', err)
        setVoidError('Unable to void transaction. Please try again.')
      })
      .finally(() => setIsVoiding(false))
  }

  const handleBulkVoid = async () => {
    if (selection.size === 0) return;
    if (!confirm('Are you sure you want to void ' + selection.size + ' transactions?')) return;

    setIsVoiding(true);
    let errorCount = 0;
    for (const id of Array.from(selection)) {
        const ok = await voidTransaction(id);
        if (ok) {
            setStatusOverrides(prev => ({ ...prev, [id]: 'void' }));
        } else {
            errorCount++;
        }
    }
    setIsVoiding(false);
    updateSelection(new Set());
    router.refresh();
    if (errorCount > 0) {
        alert(`Failed to void ${errorCount} transactions.`);
    }
  }

  const handleEditSuccess = () => {
    setEditingTxn(null)
    router.refresh()
  }

  const displayedTransactions = useMemo(() => {
    let list = transactions;
    if (activeTab === 'active') {
        list = transactions.filter(t => (statusOverrides[t.id] ?? t.status) !== 'void');
    } else {
        list = transactions.filter(t => (statusOverrides[t.id] ?? t.status) === 'void');
    }

    if (showSelectedOnly) {
      return list.filter(txn => selection.has(txn.id))
    }
    return list
  }, [transactions, selection, showSelectedOnly, activeTab, statusOverrides])


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      updateSelection(new Set(displayedTransactions.map(txn => txn.id)))
    } else {
      updateSelection(new Set())
    }
  }

  const handleSelectOne = (txnId: string, checked: boolean) => {
    const newSet = new Set(selection)
    if (checked) {
      newSet.add(txnId)
    } else {
      newSet.delete(txnId)
    }
    updateSelection(newSet)
  }

  // --- Summary Calculation ---
  const summary = useMemo(() => {
    const selectedTxns = transactions.filter(txn => selection.has(txn.id))
    const initialSummary = { sumAmount: 0 };
    const incomeSummary = { ...initialSummary };
    const expenseSummary = { ...initialSummary };

    for (const txn of selectedTxns) {
      const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount;
      const targetSummary = txn.type === 'income' ? incomeSummary : expenseSummary;
      targetSummary.sumAmount += Math.abs(originalAmount ?? 0);
    }
    return { incomeSummary, expenseSummary }
  }, [selection, transactions])


  if (transactions.length === 0 && activeTab === 'active') {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>No transactions yet.</p>
        <p className="text-sm mt-2">Add your first transaction to get started.</p>
      </div>
    );
  }

  const isAllSelected = displayedTransactions.length > 0 && selection.size >= displayedTransactions.length
  const displayedColumns = defaultColumns.filter(col => visibleColumns[col.key])

  return (
    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'active' | 'void')}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="void">Void</TabsTrigger>
          </TabsList>
        </Tabs>

        {selection.size > 0 && (
            <button
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-70"
                onClick={handleBulkVoid}
                disabled={isVoiding}
            >
                {isVoiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Void Selected ({selection.size})
            </button>
        )}
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/80">
          <TableRow>
            <TableHead className="border-r" style={{ width: 52 }}>
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={isAllSelected}
                onChange={e => handleSelectAll(e.target.checked)}
              />
            </TableHead>
            {displayedColumns.map(col => {
              if (col.key === "task") {
                return (
                  <TableHead
                    key={col.key}
                    className="text-right border-l bg-slate-100"
                    style={{ width: columnWidths[col.key] }}
                  >
                    <button
                      className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                      onClick={() => setIsCustomizerOpen(prev => !prev)}
                      title="Customize columns"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </TableHead>
                )
              }

              return (
                <TableHead
                  key={col.key}
                  className={`border-r bg-slate-100 font-semibold text-slate-700 ${col.key === "tag" ? "whitespace-nowrap" : ""}`}
                  style={{ width: columnWidths[col.key] }}
                >
                  {col.label}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedTransactions.map(txn => {
            const amountClass =
              txn.type === "income"
                ? "text-emerald-700"
                : txn.type === "expense"
                ? "text-red-500"
                : "text-slate-600"
            const originalAmount = typeof txn.original_amount === "number" ? txn.original_amount : txn.amount
            const amountValue = numberFormatter.format(Math.abs(originalAmount ?? 0))

            const isSelected = selection.has(txn.id)
            const effectiveStatus = statusOverrides[txn.id] ?? txn.status
            const isVoided = effectiveStatus === 'void'
            const isMenuOpen = actionMenuOpen === txn.id
            const txnMetadata = parseMetadata(txn.metadata)
            const refundStatus = typeof txnMetadata?.refund_status === "string" ? txnMetadata.refund_status : null
            const isPendingRefund = refundStatus === 'requested'
            const categoryLabel = txn.category_name ?? ''
            const hasShoppingCategory = categoryLabel.toLowerCase().includes('shopping')
            const canRequestRefund =
              txn.type === 'expense' && (Boolean(txn.shop_id) || hasShoppingCategory)

            // --- Type Logic ---
            let typeBadge = null;
            if (txn.type === 'expense') {
                typeBadge = <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"><ArrowUpRight className="mr-1 h-3 w-3" /> Expense</span>
            } else if (txn.type === 'income') {
                 typeBadge = <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"><ArrowDownLeft className="mr-1 h-3 w-3" /> Income</span>
            } else {
                 // Transfer
                 if (accountId) {
                     // Context View
                     const isOut = txn.amount < 0; // Relative to this account.
                     // But wait, amount logic might differ.
                     // In `mapTransactionRow`, displayAmount is calculated.
                     // Expense is negative. Income positive.
                     // Transfer: If viewing Account A (Source), amount should be negative.
                     // Let's rely on amount sign if accountId matches?
                     // Or check account names?

                     // If type is 'transfer' and we are viewing an account.
                     // If I am the source, it is 'Chuyển đi' (Out).
                     // If I am the dest, it is 'Nhận tiền' (In).
                     // Ideally `txn.amount` reflects the balance change for the context account.
                     // `mapTransactionRow` with accountId param computes amount for that account.
                     if (txn.amount < 0) {
                         typeBadge = <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"><ArrowRight className="mr-1 h-3 w-3" /> Transfer Out</span>
                     } else {
                         typeBadge = <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white"><ArrowLeft className="mr-1 h-3 w-3" /> Transfer In</span>
                     }
                 } else {
                     // Global View
                     typeBadge = <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"><ArrowLeftRight className="mr-1 h-3 w-3" /> Transfer</span>
                 }
            }

            // --- Smart Account Logic ---
            let accountDisplay = null;
            if (accountId) {
                 // Context View: Show Partner
                 // `txn.account_name` is set to "Other Side" in mapTransactionRow when accountId is provided.
                 const partnerName = txn.account_name ?? 'Unknown';
                 const isOut = txn.amount < 0;
                 if (txn.type === 'transfer') {
                    if (isOut) {
                        accountDisplay = <span className="text-slate-700 flex items-center gap-1"><ArrowRight className="h-3 w-3 text-slate-400"/> {partnerName}</span>
                    } else {
                        accountDisplay = <span className="text-slate-700 flex items-center gap-1"><ArrowLeft className="h-3 w-3 text-slate-400"/> {partnerName}</span>
                    }
                 } else {
                    // For Expense/Income in Account Detail, usually we don't show the account itself (it's redundant),
                    // but we might show "Partner" if it's a debt repayment?
                    // Standard Expense: No partner usually (unless Shop?).
                    // Let's just show txn.account_name if it differs from current, or just blank?
                    // But typically the table needs to fill the column.
                    // If Expense, account_name might be the Bank itself?
                    // mapTransactionRow logic:
                    //   If Expense: accountName = creditAccountLine?.accounts?.name
                    //   If viewing that account, accountName IS the account name.
                    // Let's show it anyway, or maybe '-'?
                    // Task says: "If Transfer: Show -> [Partner] or <- [Partner]. Else: Show Account Name"
                    accountDisplay = <span className="text-slate-700">{txn.account_name}</span>
                 }
            } else {
                // Global View
                if (txn.type === 'transfer') {
                    const source = txn.source_account_name ?? '?';
                    const dest = txn.destination_account_name ?? '?';
                    accountDisplay = (
                        <div className="flex items-center gap-1 text-xs text-slate-700 font-medium">
                            <span className="text-slate-500">{source}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-700">{dest}</span>
                        </div>
                    )
                } else if (txn.type === 'income') {
                     // Show Destination (Bank)
                     accountDisplay = <span className="text-slate-700">{txn.destination_account_name ?? txn.account_name}</span>
                } else {
                     // Expense: Show Source (Bank)
                     accountDisplay = <span className="text-slate-700">{txn.source_account_name ?? txn.account_name}</span>
                }
            }


            const taskCell = (
              <div className="relative flex justify-end">
                <button
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-slate-600 shadow-sm transition hover:bg-slate-50"
                  title="Actions"
                  onClick={event => {
                    event.stopPropagation()
                    setActionMenuOpen(prev => (prev === txn.id ? null : txn.id))
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-8 z-20 w-48 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-lg">
                    <button
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
                      onClick={event => {
                        event.stopPropagation()
                        setEditingTxn(txn)
                        setActionMenuOpen(null)
                      }}
                      disabled={isVoided}
                    >
                      <Pencil className="h-4 w-4 text-slate-600" />
                      <span>Edit</span>
                    </button>
                    {canRequestRefund && !isPendingRefund && (
                      <button
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
                        onClick={event => {
                          event.stopPropagation()
                          openRefundDialog(txn)
                        }}
                        disabled={isVoided}
                      >
                        <span>Request Refund</span>
                      </button>
                    )}
                    {isPendingRefund && (
                      <button
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
                        onClick={event => {
                          event.stopPropagation()
                          openConfirmRefundDialog(txn)
                        }}
                        disabled={isVoided}
                      >
                        <span>Confirm Refund</span>
                      </button>
                    )}
                    {isVoided && (
                      <button
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isRestoring}
                        onClick={event => {
                          event.stopPropagation()
                          handleRestore(txn)
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                      </button>
                    )}
                    <button
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isVoiding || isVoided}
                      onClick={event => {
                        event.stopPropagation()
                        setConfirmVoidTarget(txn)
                        setVoidError(null)
                        setActionMenuOpen(null)
                      }}
                    >
                      <Ban className="h-4 w-4" />
                      <span>Void Transaction</span>
                    </button>
                  </div>
                )}
              </div>
            )

            const renderCell = (key: ColumnKey) => {
              switch (key) {
                case "date":
                  return formattedDate(txn.occurred_at)
                case "type":
                   return typeBadge
                case "shop":
                   return (
                    <div className="flex items-center gap-3">
                      {txn.shop_name && (
                        <>
                          {txn.shop_logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={txn.shop_logo_url}
                              alt={txn.shop_name}
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center bg-slate-100 text-[12px] font-semibold text-slate-600 rounded">
                              {txn.shop_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </>
                      )}
                      {!txn.shop_name && txn.shop_logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={txn.shop_logo_url}
                          alt="Shop"
                          className="h-8 w-8 object-contain"
                        />
                      )}
                      {!txn.shop_name && !txn.shop_logo_url && (
                        <span className="flex h-8 w-8 items-center justify-center bg-slate-100 text-lg font-semibold text-slate-600 rounded">
                          🛍️
                        </span>
                      )}
                      {txn.note && (
                        <span className="text-sm text-slate-700 font-medium truncate">
                          {txn.note}
                        </span>
                      )}
                    </div>
                   )
                case "category":
                  return (
                    <span className="font-medium text-slate-700 text-sm">{txn.category_name || "-"}</span>
                  )
                case "account":
                  if (!accountId && txn.source_logo && txn.source_name) {
                      // Global view fallback to enhanced display if logo available
                      return (
                        <div className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={txn.source_logo} alt="Logo" className="h-5 w-5 object-contain rounded-full bg-slate-50" />
                            {accountDisplay}
                        </div>
                      )
                  }
                  return accountDisplay
                case "people": {
                  const personName = (txn as any).person_name ?? txn.person_name ?? null
                  const avatarUrl = (txn as any).person_avatar_url ?? null
                  if (!personName) return <span className="text-slate-400">-</span>
                  return (
                    <div className="flex items-center gap-2">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt={personName} className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                            <span className="flex h-6 w-6 items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-600 border rounded-full">
                                {personName.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <span className="font-medium text-slate-700">{personName}</span>
                    </div>
                  )
                }
                case "tag":
                  return txn.tag ? (
                    <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                        {txn.tag}
                     </span>
                  ) : <span className="text-slate-400">-</span>
                case "amount":
                  return amountValue
                case "cashback_percent":
                  return txn.cashback_share_percent ? `${(txn.cashback_share_percent * 100).toFixed(0)}%` : "-"
                case "cashback_fixed":
                  return txn.cashback_share_fixed ? numberFormatter.format(txn.cashback_share_fixed) : "-"
                case "cashback_sum":
                  return txn.cashback_share_amount ? numberFormatter.format(txn.cashback_share_amount) : "-"
                case "task":
                  return taskCell
                default:
                  return ""
              }
            }

            const voidedTextClass = effectiveStatus === 'void' && activeTab !== 'void' ? "opacity-60 line-through text-gray-400" : ""

            return (
              <TableRow
                key={txn.id}
                data-state={isSelected ? "selected" : undefined}
                className="hover:bg-slate-50/50"
              >
                <TableCell className="border-r">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={isSelected}
                    onChange={e => handleSelectOne(txn.id, e.target.checked)}
                  />
                </TableCell>
                {displayedColumns.map(col => (
                  <TableCell
                    key={`${txn.id}-${col.key}`}
                    className={`border-r text-sm ${col.key === "amount" ? "text-right" : ""} ${
                      col.key === "amount" ? "font-bold" : ""
                    } ${col.key === "amount" ? amountClass : ""} ${
                      col.key === "account" ? "font-bold" : ""
                    } ${col.key === "task" ? "" : voidedTextClass}`}
                    style={{ width: columnWidths[col.key], maxWidth: columnWidths[col.key] }}
                  >
                    {renderCell(col.key)}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
        {selection.size > 0 && (
          <TableFooter>
            {summary.incomeSummary.sumAmount > 0 && (
              <TableRow className="bg-emerald-50">
                <TableCell
                  colSpan={Math.max(1, displayedColumns.length - 2)}
                  className="font-bold text-emerald-700 border-r"
                >
                  Total Income
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-700 border-r">{numberFormatter.format(summary.incomeSummary.sumAmount)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
            {summary.expenseSummary.sumAmount > 0 && (
              <TableRow className="bg-red-50">
                <TableCell
                  colSpan={Math.max(1, displayedColumns.length - 2)}
                  className="font-bold text-red-500 border-r"
                >
                  Total Expense
                </TableCell>
                <TableCell className="text-right font-bold text-red-500 border-r">{numberFormatter.format(summary.expenseSummary.sumAmount)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableFooter>
        )}
      </Table>
      </div>

      {isCustomizerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/10"
            onClick={() => setIsCustomizerOpen(false)}
          />
          <div
            className="absolute right-2 top-12 z-40 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Customize columns</p>
                <p className="text-xs text-slate-500">Show/hide and resize</p>
              </div>
              <button
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={resetColumns}
              >
                Reset
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {defaultColumns.map(col => (
                <div key={col.key} className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key]}
                      onChange={() => toggleColumnVisibility(col.key)}
                      disabled={col.key === "task"}
                    />
                    <span>{col.key === "task" ? "Task (always on)" : col.label}</span>
                  </label>
                  <input
                    type="range"
                    min={col.minWidth ?? 80}
                    max={360}
                    value={columnWidths[col.key]}
                    onChange={e => updateColumnWidth(col.key, Number(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="w-12 text-right text-xs text-slate-500">{columnWidths[col.key]}px</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {editingTxn && editingInitialValues && createPortal(
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-10"
          onClick={() => setEditingTxn(null)}
        >
            <div
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-200"
              onClick={event => event.stopPropagation()}
            >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit Transaction</h3>
              <button
                className="rounded px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                onClick={() => setEditingTxn(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <TransactionForm
              accounts={accounts}
              categories={categories}
              people={people}
              shops={shops}
              transactionId={editingTxn.id}
              initialValues={editingInitialValues}
              mode="edit"
              onSuccess={handleEditSuccess}
            />
          </div>
        </div>,
        document.body
      )}

      {confirmVoidTarget && createPortal(
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
          onClick={closeVoidDialog}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">Void transaction?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This action will mark the transaction as void and adjust the balances accordingly.
            </p>
            {voidError && (
              <p className="mt-2 text-sm text-red-600">{voidError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                onClick={closeVoidDialog}
                disabled={isVoiding}
              >
                Keep
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleVoidConfirm}
                disabled={isVoiding}
              >
                {isVoiding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Void Transaction
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {refundDialogTxn && createPortal(
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
          onClick={closeRefundDialog}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {refundDialogMode === 'confirm' ? 'Confirm Refund' : 'Request Refund'}
              </h3>
              <button
                className="text-slate-500 transition hover:text-slate-700"
                onClick={closeRefundDialog}
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {refundDialogTxn.note ?? 'No note available'}
            </p>
            <div className="space-y-4">
              {refundDialogMode === 'request' ? (
                <div>
                  <label className="text-sm font-semibold text-slate-700">Refund amount (VND)</label>
                  <input
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={event => setRefundAmount(Math.max(Number(event.target.value) || 0, 0))}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              ) : (
                <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Amount to confirm</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {numberFormatter.format(
                      Math.abs(
                        refundDialogTxn.transaction_lines
                          ?.find(line => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit')
                          ?.amount ?? 0
                      )
                    )}
                  </p>
                </div>
              )}
              {refundDialogMode === 'request' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={refundInstant}
                    onChange={event => setRefundInstant(event.target.checked)}
                  />
                  <span>Money already returned?</span>
                </label>
              )}
              {(refundDialogMode === 'confirm' || (refundDialogMode === 'request' && refundInstant)) && (
                <div>
                  <label className="text-sm font-semibold text-slate-700">Receiving account</label>
                  <select
                    value={refundTargetAccountId ?? ''}
                    onChange={event => setRefundTargetAccountId(event.target.value || null)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Choose account</option>
                    {refundAccountOptions.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {refundError && (
                <p className="text-sm text-red-600">{refundError}</p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeRefundDialog}
                disabled={isRefunding}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleRefundSubmit}
                disabled={isRefunding}
              >
                {isRefunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {refundDialogMode === 'confirm'
                  ? 'Confirm Refund'
                  : refundInstant
                    ? 'Confirm & Refund'
                    : 'Create Request'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
