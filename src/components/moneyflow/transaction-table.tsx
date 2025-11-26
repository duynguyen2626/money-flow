"use client"

import { useMemo, useState } from "react"
import { Ban, Loader2, MoreHorizontal, Pencil, RotateCcw, SlidersHorizontal, ArrowLeftRight, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { CustomTooltip } from "@/components/ui/custom-tooltip"
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
  confirmRefund,
} from "@/services/transaction.service"
import { REFUND_PENDING_ACCOUNT_ID } from "@/constants/refunds"
import { generateTag } from "@/lib/tag"

type ColumnKey =
  | "date"
  | "type"
  | "shop"
  | "note"
  | "category"
  | "account"
  | "people"
  | "tag"
  | "cycle"
  | "percent"
  | "fixed"
  | "sumBack"
  | "amount"
  | "finalPrice"
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

  // Determine Type
  let derivedType: TransactionFormValues["type"] = txn.type as TransactionFormValues["type"] || "expense";

  if (personLine?.person_id) {
     // If person involved, could be debt lending or repayment.
     // Check for repayment clues.
     if (categoryLine?.categories?.name?.toLowerCase().includes('thu nợ')
         || categoryLine?.categories?.name?.toLowerCase().includes('repayment')) {
         derivedType = 'repayment';
     } else {
         derivedType = 'debt'; // Lending
     }
  } else if (!categoryLine) {
     derivedType = 'transfer';
  } else if (categoryLine.type === 'debit') {
     derivedType = 'expense';
  } else {
     derivedType = 'income';
  }

  // Account Mapping
  // For Repayment: source = Bank (Debit line), dest = Debt (Credit line)
  // For Transfer: source = From (Credit), dest = To (Debit)
  // For Debt Lending: source = From (Credit), dest = Debt (Debit)
  // For Expense: source = From (Credit)
  // For Income: source = To (Debit)

  // Default Source (usually Credit line, unless Income)
  let sourceAccountId = creditLine?.account_id ?? debitLine?.account_id ?? undefined;
  if (derivedType === 'income') {
      sourceAccountId = debitLine?.account_id ?? undefined;
  }

  // Destination for Debt/Transfer
  let destinationAccountId =
    derivedType === "transfer" || derivedType === "debt"
      ? debitLine?.account_id ?? undefined
      : undefined;

  // Special handling for Repayment
  if (derivedType === 'repayment') {
      // Repayment: Debit Bank, Credit Debt.
      // Form expects: Source = Bank, Dest = Debt.
      // debitLine = Bank, creditLine = Debt.
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

interface TransactionTableProps {
  transactions: TransactionWithDetails[]
  accountType?: Account['type']
  selectedTxnIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  accounts?: Account[]
  categories?: Category[]
  people?: Person[]
  shops?: Shop[]
}

const defaultColumns: ColumnConfig[] = [
  { key: "date", label: "Date", defaultWidth: 110, minWidth: 100 },
  { key: "type", label: "Type", defaultWidth: 100, minWidth: 90 },
  { key: "shop", label: "Shop/Note", defaultWidth: 200, minWidth: 160 },
  { key: "category", label: "Category", defaultWidth: 140 },
  { key: "people", label: "People/Tag", defaultWidth: 160 },
  { key: "account", label: "Source/Account", defaultWidth: 150 },
  // { key: "tag", label: "Tag", defaultWidth: 100, minWidth: 90 },
  { key: "cycle", label: "Cycle", defaultWidth: 100 },
  { key: "percent", label: "% Back", defaultWidth: 80 },
  { key: "fixed", label: "Fix Back", defaultWidth: 90 },
  { key: "sumBack", label: "Sum Back", defaultWidth: 110 },
  { key: "amount", label: "Amount", defaultWidth: 120 },
  { key: "finalPrice", label: "Final Price", defaultWidth: 130 },
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

export function TransactionTable({
  transactions,
  accountType,
  selectedTxnIds,
  onSelectionChange,
  accounts = [],
  categories = [],
  people = [],
  shops = [],
}: TransactionTableProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'active' | 'void'>('active')
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    const map: Record<ColumnKey, boolean> = {
      date: true,
      type: true,
      shop: true,
      note: false,
      category: true,
      account: true,
      people: true,
      tag: false,
      cycle: false,
      percent: true,
      fixed: false,
      sumBack: true,
      amount: true,
      finalPrice: false,
      task: true,
    }
    return map
  })
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    const map = {} as Record<ColumnKey, number>
    defaultColumns.forEach(col => {
      map[col.key] = col.defaultWidth
    })
    return map
  })
  const [dateFormat, setDateFormat] = useState<"en-CA" | "DD-MM" | "custom">("en-CA")
  const [customDatePattern, setCustomDatePattern] = useState<string>("YYYY-MM-DD")
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null)
  const [refundingTxn, setRefundingTxn] = useState<TransactionWithDetails | null>(null);
  const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TransactionWithDetails['status']>>({})
  const [isRefunding, setIsRefunding] = useState(false)
  const editingInitialValues = useMemo(
    () => (editingTxn ? buildEditInitialValues(editingTxn) : null),
    [editingTxn]
  )
  const refundingInitialValues = useMemo(
    () => (refundingTxn ? buildEditInitialValues(refundingTxn) : null),
    [refundingTxn]
  );
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
      note: false,
      category: true,
      account: true,
      people: true,
      tag: false,
      cycle: false,
      percent: true,
      fixed: false,
      sumBack: true,
      amount: true,
      finalPrice: false,
      task: true,
    })
    setDateFormat("en-CA")
    setCustomDatePattern("YYYY-MM-DD")
  }

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

  const openConfirmRefundDialog = (txn: TransactionWithDetails) => {
    // This logic might be deprecated or moved. For now, it will open the main form.
    setRefundingTxn(txn);
    setActionMenuOpen(null);
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
    updateSelection(new Set()); // Clear selection
    router.refresh();
    if (errorCount > 0) {
        alert(`Failed to void ${errorCount} transactions.`);
    }
  }

  const handleBulkRestore = async () => {
    if (selection.size === 0) return;
    if (!confirm('Are you sure you want to restore ' + selection.size + ' transactions?')) return;

    setIsRestoring(true);
    let errorCount = 0;
    for (const id of Array.from(selection)) {
        const ok = await restoreTransaction(id);
        if (ok) {
            setStatusOverrides(prev => ({ ...prev, [id]: 'posted' }));
        } else {
            errorCount++;
        }
    }
    setIsRestoring(false);
    updateSelection(new Set()); // Clear selection
    router.refresh();
    if (errorCount > 0) {
        alert(`Failed to restore ${errorCount} transactions.`);
    }
  }

  const handleEditSuccess = () => {
    setEditingTxn(null)
    router.refresh()
  }

  const handleRefundSuccess = () => {
    setRefundingTxn(null);
    router.refresh();
  };

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

  const getCycleLabel = (txn: TransactionWithDetails) => {
    if (txn.persisted_cycle_tag) {
      try {
        const date = new Date(txn.persisted_cycle_tag);
        // Add 1 day to handle timezone issues where it might be the day before
        date.setDate(date.getDate() + 1);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}-${year}`;
      } catch (e) {
        return txn.persisted_cycle_tag; // fallback to raw value
      }
    }
    if (accountType === "credit_card") {
      const rawDate = txn.occurred_at ?? (txn as { created_at?: string }).created_at;
      const parsed = rawDate ? new Date(rawDate) : null;
      if (parsed && !Number.isNaN(parsed.getTime())) {
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        return `${month}-${parsed.getFullYear()}`;
      }
    }
    return txn.tag ?? "-";
  }

  const formattedDate = (value: string | number | Date) => {
    const d = new Date(value)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = String(d.getFullYear())

    const formatWithPattern = (pattern: string) => {
      return pattern
        .replace(/YYYY/g, year)
        .replace(/YY/g, year.slice(-2))
        .replace(/MM/g, month)
        .replace(/M/g, String(d.getMonth() + 1))
        .replace(/DD/g, day)
        .replace(/D/g, String(d.getDate()))
    }

    if (dateFormat === "DD-MM") {
      return `${day}-${month}-${year}`
    }
    if (dateFormat === "custom") {
      return formatWithPattern(customDatePattern || "YYYY-MM-DD")
    }
    return new Date(value).toLocaleDateString("en-CA")
  }

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

  const summary = useMemo(() => {
    const selectedTxns = transactions.filter(txn => selection.has(txn.id))
    const initialSummary = {
      sumBack: 0,
      sumAmount: 0,
      sumFinalPrice: 0,
    };

    const incomeSummary = { ...initialSummary };
    const expenseSummary = { ...initialSummary };

    for (const txn of selectedTxns) {
      const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount;
      const percentValue = typeof txn.cashback_share_percent === 'number' ? txn.cashback_share_percent : null;
      const fixedValue = typeof txn.cashback_share_fixed === 'number' ? txn.cashback_share_fixed : 0;
      const derivedSumBack = Math.abs(originalAmount ?? 0) * (percentValue ?? 0) + fixedValue;
      const cashbackAmount = typeof txn.cashback_share_amount === 'number' && txn.cashback_share_amount > 0 ? txn.cashback_share_amount : derivedSumBack;
      const finalPrice = Math.abs(txn.amount ?? 0);

      const targetSummary = txn.type === 'income' ? incomeSummary : expenseSummary;
      targetSummary.sumBack += cashbackAmount;
      targetSummary.sumAmount += Math.abs(originalAmount);
      targetSummary.sumFinalPrice += finalPrice;
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
    <div className="relative space-y-2">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'active' | 'void')}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="void">Void</TabsTrigger>
          </TabsList>
        </Tabs>

        {selection.size > 0 && (
          activeTab === 'active' ? (
            <button
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-70"
                onClick={handleBulkVoid}
                disabled={isVoiding}
            >
                {isVoiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Void Selected ({selection.size})
            </button>
          ) : (
            <button
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-70"
                onClick={handleBulkRestore}
                disabled={isRestoring}
            >
                {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Restore Selected ({selection.size})
            </button>
          )
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
            const percentValue = typeof txn.cashback_share_percent === "number" ? txn.cashback_share_percent : null
            const percentBack =
              percentValue && percentValue > 0
                ? `${(percentValue * 100).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: percentValue * 100 < 1 ? 1 : 0,
                  })}%`
                : "-"
            const fixedValue = typeof txn.cashback_share_fixed === "number" ? txn.cashback_share_fixed : 0
            const fixBack = fixedValue > 0 ? numberFormatter.format(fixedValue) : "-"
            const derivedSumBack = Math.abs(originalAmount ?? 0) * (percentValue ?? 0) + fixedValue
            const cashbackAmount =
              typeof txn.cashback_share_amount === "number" && txn.cashback_share_amount > 0
                ? txn.cashback_share_amount
                : derivedSumBack
          const sumBack = cashbackAmount > 0 ? numberFormatter.format(cashbackAmount) : "-"
          const finalPrice = Math.abs(txn.amount ?? 0)
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
                          setRefundingTxn(txn);
                          setActionMenuOpen(null);
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

            // Smart Source Logic
            let displayAccountName = txn.account_name ?? "-";

            // If person_id is present, it's likely a debt-related transaction (Lending or Repayment)
            // In this case, we want to show the REAL source (Bank) if possible.
            // But we already did this in Backend Service! `txn.account_name` should be correct now.
            // However, let's keep the frontend fallback just in case or for specific tweaks.
            // The service returns `account_name` based on context.
            // If we are in 'Account Detail' page (accountId passed), `account_name` is the OTHER side.
            // If we are in 'People Detail' or 'Recent Transactions', `account_name` is also computed.

            // The only issue might be if `account_name` is still the Debt Account name when we want Bank.
            // Let's trust the backend service update first.

            const renderCell = (key: ColumnKey) => {
              switch (key) {
                case "date":
                  return formattedDate(txn.occurred_at)
                case "type":
                   if (txn.type === 'income') return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"><ArrowDownLeft className="mr-1 h-3 w-3" /> In</span>
                   if (txn.type === 'expense') {
                        // Check if it's Shopping to show Red? It is Expense so Red.
                        // Task says "Fix logic to show Red for Shopping". Expense is Red.
                        // Maybe they meant if it was showing Green before?
                        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"><ArrowUpRight className="mr-1 h-3 w-3" /> Out</span>
                   }
                   return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"><ArrowLeftRight className="mr-1 h-3 w-3" /> Transfer</span>
                case "shop":
                   // Merged Shop and Note
                   return (
                    <div className="flex flex-col gap-1">
                      {txn.shop_name && (
                        <div className="flex items-center gap-2">
                          {txn.shop_logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={txn.shop_logo_url}
                              alt={txn.shop_name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                              {txn.shop_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="font-medium truncate">{txn.shop_name}</span>
                        </div>
                      )}
                      {txn.note && (
                        <CustomTooltip content={<div className="max-w-xs break-words">{txn.note}</div>}>
                          <span className="text-xs text-slate-500 truncate max-w-[200px]">{txn.note}</span>
                        </CustomTooltip>
                      )}
                    </div>
                   )
                case "note":
                  return txn.note
                case "category":
                  return txn.category_name || "-"
                case "account":
                  return displayAccountName
                case "people": {
                   // Merged People and Tag
                  const personName = (txn as any).person_name ?? txn.person_name ?? null
                  const tag = txn.tag
                  return (
                    <div className="flex flex-col gap-1">
                        {personName && (
                            <div className="flex items-center gap-1">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                                    {personName.charAt(0).toUpperCase()}
                                </span>
                                <span className="font-medium text-slate-700">{personName}</span>
                            </div>
                        )}
                        {tag && (
                             <span className="inline-flex w-fit items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {tag}
                             </span>
                        )}
                    </div>
                  )
                }
                case "tag":
                  return txn.tag ?? "-"
                case "cycle":
                  return accountType === "credit_card" || txn.persisted_cycle_tag
                    ? getCycleLabel(txn)
                    : "-"
                case "percent":
                  return percentBack
                case "fixed":
                  return fixBack
                case "sumBack":
                  return sumBack
                case "amount":
                  return amountValue
                case "finalPrice":
                  return numberFormatter.format(finalPrice)
                case "task":
                  return taskCell
                default:
                  return ""
              }
            }

            // If in Void tab, we don't strike through.
            // If in Active tab, we shouldn't see voided items anyway.
            // So voidedTextClass applies only if we display voided items mixed (which we don't anymore, mostly).
            // But if statusOverrides says void, we show it.
            const voidedTextClass = effectiveStatus === 'void' && activeTab !== 'void' ? "opacity-60 line-through text-gray-400" : ""

            return (
              <TableRow
                key={txn.id}
                data-state={isSelected ? "selected" : undefined}
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
                    className={`border-r text-sm ${col.key === "amount" || col.key === "finalPrice" || col.key === "percent" || col.key === "fixed" || col.key === "sumBack" ? "text-right" : ""} ${
                      col.key === "amount" || col.key === "finalPrice" ? "font-semibold" : ""
                    } ${col.key === "amount" || col.key === "finalPrice" ? amountClass : ""} ${col.key === "task" ? "" : voidedTextClass}`}
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
                  className="font-semibold text-emerald-700 border-r"
                >
                  Total Income
                </TableCell>
                <TableCell className="text-right font-semibold text-emerald-700 border-r">{numberFormatter.format(summary.incomeSummary.sumBack)}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-700 border-r">{numberFormatter.format(summary.incomeSummary.sumAmount)}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-700">{numberFormatter.format(summary.incomeSummary.sumFinalPrice)}</TableCell>
              </TableRow>
            )}
            {summary.expenseSummary.sumAmount > 0 && (
              <TableRow className="bg-red-50">
                <TableCell
                  colSpan={Math.max(1, displayedColumns.length - 2)}
                  className="font-semibold text-red-500 border-r"
                >
                  Total Expense
                </TableCell>
                <TableCell className="text-right font-semibold text-red-500 border-r">{numberFormatter.format(summary.expenseSummary.sumBack)}</TableCell>
                <TableCell className="text-right font-semibold text-red-500 border-r">{numberFormatter.format(summary.expenseSummary.sumAmount)}</TableCell>
                <TableCell className="text-right font-semibold text-red-500">{numberFormatter.format(summary.expenseSummary.sumFinalPrice)}</TableCell>
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
                <p className="text-xs text-slate-500">Show/hide, resize, and change date format</p>
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

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Date format</p>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="date-format"
                    value="en-CA"
                    checked={dateFormat === "en-CA"}
                    onChange={() => setDateFormat("en-CA")}
                  />
                  YYYY-MM-DD
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="date-format"
                    value="DD-MM"
                    checked={dateFormat === "DD-MM"}
                    onChange={() => setDateFormat("DD-MM")}
                  />
                  DD-MM-YYYY
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="date-format"
                    value="custom"
                    checked={dateFormat === "custom"}
                    onChange={() => setDateFormat("custom")}
                  />
                  Custom
                </label>
              </div>
              {dateFormat === "custom" && (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={customDatePattern}
                    onChange={e => setCustomDatePattern(e.target.value)}
                    placeholder="e.g. DD/MM/YYYY or D-M-YY"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-[11px] text-slate-500">Use D, M, Y tokens (e.g. DD/MM/YYYY).</p>
                </div>
              )}
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

    {refundingTxn && refundingInitialValues && createPortal(
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-10"
          onClick={() => setRefundingTxn(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-200"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Request Refund</h3>
              <button
                className="rounded px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                onClick={() => setRefundingTxn(null)}
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
              initialValues={refundingInitialValues}
              mode="refund"
              onSuccess={handleRefundSuccess}
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
    </div>
  )
}
