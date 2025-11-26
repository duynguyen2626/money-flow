"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Ban, Loader2, MoreHorizontal, Pencil, RotateCcw, SlidersHorizontal, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, ArrowRight, ArrowLeft, Copy, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { CustomTooltip, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/custom-tooltip'
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
} from "@/services/transaction.service"
import { REFUND_PENDING_ACCOUNT_ID } from "@/constants/refunds"
import { generateTag } from "@/lib/tag"
import { cn } from "@/lib/utils"
import { parseCashbackConfig, getCashbackCycleRange, ParsedCashbackConfig } from '@/lib/cashback'

type ColumnKey =
  | "date"
  | "type"
  | "shop" // Merged Shop/Note
  | "category"
  | "people" // Separated
  | "tag" // Separated
  | "cycle"
  | "account" // Smart Account
  | "amount"
  | "cashback_percent"
  | "cashback_fixed"
  | "cashback_sum"
  | "final_price"
  | "id"
  | "task"

type SortKey = 'date' | 'amount'
type SortDir = 'asc' | 'desc'

type BulkActionState = {
  selectionCount: number
  currentTab: 'active' | 'void'
  onVoidSelected: () => Promise<void> | void
  onRestoreSelected: () => Promise<void> | void
  isVoiding: boolean
  isRestoring: boolean
}

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

  let derivedType: TransactionFormValues["type"] = (txn.type as any) === 'repayment' ? 'repayment' : txn.type as TransactionFormValues["type"] || "expense";


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
  activeTab?: 'active' | 'void'
  hidePeopleColumn?: boolean
  onBulkActionStateChange?: (state: BulkActionState) => void
  sortState?: { key: SortKey; dir: SortDir }
  onSortChange?: (state: { key: SortKey; dir: SortDir }) => void
}


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
  activeTab,
  hidePeopleColumn,
  onBulkActionStateChange,
  sortState: externalSortState,
  onSortChange,
}: UnifiedTransactionTableProps) {
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
    { key: "tag", label: "Tag", defaultWidth: 80 },
    { key: "id", label: "ID", defaultWidth: 100 },
    { key: "task", label: "", defaultWidth: 48, minWidth: 48 },
  ]
  const router = useRouter()
  // Internal state removed for activeTab, now using prop with fallback
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    return {
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
      cashback_sum: false, // Default hidden as per user request
      final_price: true,
      id: false,
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

  useEffect(() => {
    setVisibleColumns(prev => ({ ...prev, people: !hidePeopleColumn }))
  }, [hidePeopleColumn])

  // State for actions
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null)
  const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TransactionWithDetails['status']>>({})
  const [refundFormTxn, setRefundFormTxn] = useState<TransactionWithDetails | null>(null)
  const [refundFormStage, setRefundFormStage] = useState<'request' | 'confirm'>('request')
  const [internalSortState, setInternalSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: 'date', dir: 'desc' })
  const [bulkDialog, setBulkDialog] = useState<{ mode: 'void' | 'restore'; open: boolean } | null>(null)

  const sortState = externalSortState ?? internalSortState
  const setSortState = onSortChange ?? setInternalSortState

  const editingInitialValues = useMemo(
    () => (editingTxn ? buildEditInitialValues(editingTxn) : null),
    [editingTxn]
  )
  const refundAccountOptions = useMemo(
    () => accounts.filter(acc => acc.id !== REFUND_PENDING_ACCOUNT_ID),
    [accounts]
  )
  const selection = selectedTxnIds ?? internalSelection
  const updateSelection = useCallback((next: Set<string>) => {
    if (onSelectionChange) {
      onSelectionChange(next)
      return
    }
    setInternalSelection(next)
  }, [onSelectionChange])

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

  const openRefundForm = (txn: TransactionWithDetails, stage: 'request' | 'confirm') => {
    setRefundFormStage(stage)
    setRefundFormTxn(txn)
    setActionMenuOpen(null)
  }

  const handleRefundFormSuccess = useCallback(() => {
    setRefundFormTxn(null)
    router.refresh()
  }, [router])

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

  const handleBulkVoid = useCallback(async () => {
    if (selection.size === 0) return;
    setBulkDialog({ mode: 'void', open: true })
  }, [selection.size])

  const handleBulkRestore = useCallback(async () => {
    if (selection.size === 0) return;
    setBulkDialog({ mode: 'restore', open: true })
  }, [selection.size])

  const currentTab = activeTab ?? 'active';

  useEffect(() => {
    if (!onBulkActionStateChange) return
    onBulkActionStateChange({
      selectionCount: selection.size,
      currentTab,
      onVoidSelected: handleBulkVoid,
      onRestoreSelected: handleBulkRestore,
      isVoiding,
      isRestoring,
    })
  }, [
    currentTab,
    handleBulkRestore,
    handleBulkVoid,
    isRestoring,
    isVoiding,
    onBulkActionStateChange,
    selection.size,
  ])

  const handleEditSuccess = () => {
    setEditingTxn(null)
    router.refresh()
  }

  const executeBulk = async (mode: 'void' | 'restore') => {
    if (selection.size === 0) return
    if (mode === 'void') {
      setIsVoiding(true)
      let errorCount = 0
      for (const id of Array.from(selection)) {
        const ok = await voidTransaction(id)
        if (ok) {
          setStatusOverrides(prev => ({ ...prev, [id]: 'void' }))
        } else {
          errorCount++
        }
      }
      setIsVoiding(false)
      updateSelection(new Set())
      router.refresh()
      if (errorCount > 0) {
        alert(`Failed to void ${errorCount} transactions.`)
      }
    } else {
      setIsRestoring(true)
      let errorCount = 0
      for (const id of Array.from(selection)) {
        const ok = await restoreTransaction(id)
        if (ok) {
          setStatusOverrides(prev => ({ ...prev, [id]: 'posted' }))
        } else {
          errorCount++
        }
      }
      setIsRestoring(false)
      updateSelection(new Set())
      router.refresh()
      if (errorCount > 0) {
        alert(`Failed to restore ${errorCount} transactions.`)
      }
    }
    setBulkDialog(null)
  }

  const displayedTransactions = useMemo(() => {
    let list = transactions;
    if (currentTab === 'active') {
      list = transactions.filter(t => (statusOverrides[t.id] ?? t.status) !== 'void');
    } else {
      list = transactions.filter(t => (statusOverrides[t.id] ?? t.status) === 'void');
    }

    if (showSelectedOnly) {
      return list.filter(txn => selection.has(txn.id))
    }
    const sorted = [...list].sort((a, b) => {
      if (sortState.key === 'date') {
        const aDate = new Date(a.occurred_at ?? a.created_at ?? '').getTime()
        const bDate = new Date(b.occurred_at ?? b.created_at ?? '').getTime()
        return sortState.dir === 'asc' ? aDate - bDate : bDate - aDate
      }
      const aAmt = typeof a.original_amount === 'number' ? a.original_amount : a.amount
      const bAmt = typeof b.original_amount === 'number' ? b.original_amount : b.amount
      return sortState.dir === 'asc' ? aAmt - bAmt : bAmt - aAmt
    })
    return sorted
  }, [transactions, selection, showSelectedOnly, currentTab, statusOverrides, sortState])


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
    <div className="relative space-y-3">
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="border-r whitespace-nowrap" style={{ width: 52 }}>
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
                      className="text-right border-l bg-slate-100 whitespace-nowrap"
                      style={{ width: columnWidths[col.key] }}
                    >
                      <button
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                        onClick={() => setIsCustomizerOpen(prev => !prev)}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                    </TableHead>
                  )
                }

                return (
                  <TableHead
                    key={col.key}
                    className="border-r bg-slate-100 font-semibold text-slate-700 whitespace-nowrap"
                    style={{ width: columnWidths[col.key] }}
                  >
                    {col.key === 'date' || col.key === 'amount' ? (
                      <button
                        className="flex items-center gap-1 group"
                        onClick={() => {
                          const nextDir =
                            sortState.key === col.key ? (sortState.dir === 'asc' ? 'desc' : 'asc') : 'desc'
                          setSortState({ key: col.key as SortKey, dir: nextDir })
                        }}
                      >
                        {col.label}
                        {sortState.key === col.key ? (
                          sortState.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-blue-600" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTransactions.map(txn => {
              const isRepayment = txn.type === 'repayment';
              const visualType = (txn as any).displayType ?? txn.type;
              const displayDirection = (txn as any).display_type as string | undefined;
              const amountClass =
                visualType === "income" || isRepayment
                  ? "text-emerald-700"
                  : visualType === "expense"
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
                (visualType === 'expense' || txn.type === 'expense') && (Boolean(txn.shop_id) || hasShoppingCategory)

              // --- Type Logic ---
              let typeBadge = null;
              if (txn.type === 'repayment') {
                typeBadge = <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white"><ArrowLeft className="mr-1 h-3 w-3" /> TF In</span>;
              } else if (visualType === 'expense') {
                typeBadge = <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"><ArrowUpRight className="mr-1 h-3 w-3" /> {displayDirection === 'OUT' ? 'Out' : 'Out'}</span>
              } else if (visualType === 'income') {
                typeBadge = <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"><ArrowDownLeft className="mr-1 h-3 w-3" /> {displayDirection === 'IN' ? 'In' : 'In'}</span>
              } else {
                // Transfer
                if (accountId) {
                  if (txn.amount >= 0) {
                    typeBadge = <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white"><ArrowLeft className="mr-1 h-3 w-3" /> TF In</span>
                  } else {
                    typeBadge = <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"><ArrowRight className="mr-1 h-3 w-3" /> TF Out</span>
                  }
                } else {
                  typeBadge = <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"><ArrowLeftRight className="mr-1 h-3 w-3" /> Transfer</span>
                }
              }

              const taskCell = (
                <div className="relative flex justify-end">
                  <button
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-slate-600 shadow-sm transition hover:bg-slate-50"
                    onClick={event => {
                      event.stopPropagation()
                      setActionMenuOpen(prev => (prev === txn.id ? null : txn.id))
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 top-8 z-20 w-48 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-lg">
                      {currentTab === 'void' || isVoided ? (
                        <button
                          className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isRestoring}
                          onClick={event => {
                            event.stopPropagation();
                            handleRestore(txn);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
                            onClick={event => {
                              event.stopPropagation();
                              setEditingTxn(txn);
                              setActionMenuOpen(null);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-slate-600" />
                            <span>Edit</span>
                          </button>
                          {canRequestRefund && !isPendingRefund && (
                            <button
                              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
                              onClick={event => {
                                event.stopPropagation();
                                openRefundForm(txn, 'request');
                              }}
                            >
                              <span>Request Refund</span>
                            </button>
                          )}
                          {isPendingRefund && (
                            <button
                              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
                              onClick={event => {
                                event.stopPropagation();
                                openRefundForm(txn, 'confirm');
                              }}
                            >
                              <span>Confirm Refund</span>
                            </button>
                          )}
                          <button
                            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-red-600 hover:bg-red-50"
                            onClick={event => {
                              event.stopPropagation();
                              setConfirmVoidTarget(txn);
                              setVoidError(null);
                              setActionMenuOpen(null);
                            }}
                          >
                            <Ban className="h-4 w-4" />
                            <span>Void Transaction</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )

              const renderCell = (key: ColumnKey) => {
                switch (key) {
                  case "date": {
                    const d = new Date(txn.occurred_at ?? txn.created_at ?? Date.now())
                    const day = String(d.getDate()).padStart(2, "0")
                    const month = String(d.getMonth() + 1).padStart(2, "0")
                    const hours = String(d.getHours()).padStart(2, "0")
                    const minutes = String(d.getMinutes()).padStart(2, "0")
                    return (
                      <div className="flex flex-col">
                        <span className="font-semibold">{`${day}/${month}`}</span>
                        <span className="text-xs text-gray-500">{`${hours}:${minutes}`}</span>
                      </div>
                    )
                  }
                  case "type":
                    return typeBadge
                  case "shop": {
                    let displayIcon = txn.shop_logo_url;
                    let displayName = txn.shop_name;

                    if (txn.type === 'repayment' && !displayName) {
                      displayIcon = txn.destination_logo;
                      displayName = txn.destination_name;
                    }

                    return (
                      <div className="flex items-center gap-2 max-w-[220px] overflow-hidden">
                        {displayName && (
                          <>
                            {displayIcon ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={displayIcon}
                                alt={displayName}
                                className="h-8 w-8 object-contain rounded-none"
                              />
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center bg-slate-100 text-[10px] font-semibold text-slate-600 rounded-none">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </>
                        )}
                        {!displayName && displayIcon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayIcon}
                            alt="Shop"
                            className="h-5 w-5 object-cover rounded-none"
                          />
                        )}
                        {!displayName && !displayIcon && (
                          <span className="flex h-5 w-5 items-center justify-center bg-slate-100 text-[10px] font-semibold text-slate-600 rounded-none">
                            🛍️
                          </span>
                        )}
                        {txn.note && (
                          <CustomTooltip content={<div className="max-w-[300px] whitespace-normal break-words">{txn.note}</div>}>
                            <span className="text-sm text-slate-700 font-medium truncate cursor-help max-w-[200px]">
                              {txn.note}
                            </span>
                          </CustomTooltip>
                        )}
                      </div>
                    );
                  }
                  case "category": {
                    if (!txn.category_name) {
                      if (txn.type === 'repayment') return <span className="text-slate-500">Repayment</span>;
                      if (txn.type === 'transfer') return <span className="text-slate-500">Transfer</span>;
                      return <span className="text-red-500">Uncategorized</span>;
                    }
                    return (
                      <CustomTooltip content={txn.category_name ?? "No Category"}>
                        <div className="flex items-center gap-2 max-w-[200px]">
                          {txn.category_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={txn.category_image_url}
                              alt={txn.category_name ?? 'Category'}
                              className="h-8 w-8 object-contain rounded-none"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center bg-slate-100 text-[10px] font-semibold text-slate-600 rounded-none">
                              {txn.category_icon ?? (txn.category_name ? txn.category_name.charAt(0).toUpperCase() : '?')}
                            </span>
                          )}
                          <span className="font-medium text-slate-700 truncate whitespace-nowrap cursor-help">
                            {txn.category_name || "-"}
                          </span>
                        </div>
                      </CustomTooltip>
                    )
                  }
                  case "account": {
                    const sourceIcon = txn.source_logo ? (
                      <img src={txn.source_logo} alt={txn.source_name ?? ''} className="h-8 w-8 object-contain rounded-none" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center bg-slate-100 text-sm font-bold border rounded-none">
                        {(txn.source_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                    );

                    const destIcon = txn.destination_logo ? (
                      <img src={txn.destination_logo} alt={txn.destination_name ?? ''} className="h-8 w-8 object-contain rounded-none" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center bg-slate-100 text-sm font-bold border rounded-none">
                        {(txn.destination_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                    );

                    // Render for Transfer / Debt / Repayment
                    if (txn.type === 'transfer' || txn.type === 'debt' || txn.type === 'repayment') {
                      return (
                        <CustomTooltip content={`${txn.source_name ?? 'Unknown'} ➡️ ${txn.destination_name ?? 'Unknown'}`}>
                          <div className="flex items-center gap-2 cursor-help">
                            {txn.source_name && sourceIcon}
                            {txn.source_name && txn.destination_name && <span className="text-xl">➡️</span>}
                            {txn.destination_name && destIcon}
                          </div>
                        </CustomTooltip>
                      );
                    }

                    // Render for Single Account (Expense/Income)
                    return (
                      <div className="flex items-center gap-2">
                        {txn.source_name && sourceIcon}
                        <CustomTooltip content={txn.account_name}>
                          <span className="truncate max-w-[120px] cursor-help">
                            {txn.account_name ?? 'Unknown'}
                          </span>
                        </CustomTooltip>
                      </div>
                    );
                  }
                  case "people": {
                    const personName = (txn as any).person_name ?? txn.person_name ?? null
                    const personAvatar = (txn as any).person_avatar_url ?? txn.person_avatar_url ?? null
                    if (!personName) return <span className="text-slate-400">-</span>
                    return (
                      <div className="flex items-center gap-2">
                        {personAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={personAvatar}
                            alt={personName}
                            className="h-6 w-6 object-cover rounded-none"
                          />
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-600 rounded-none">
                            {personName.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium text-slate-700">{personName}</span>
                      </div>
                    )
                  }
                  case "tag":
                    return txn.tag ? (
                      <span className="inline-block max-w-[80px] truncate items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                        {txn.tag}
                      </span>
                    ) : <span className="text-slate-400">-</span>
                  case "cycle":
                    return <span className="text-slate-600">{cycleLabel}</span>
                  case "amount":
                    return amountValue
                  case "cashback_percent":
                    return percentRaw ? <span className="text-slate-600">{(percentRaw * 100).toFixed(2)}%</span> : <span className="text-slate-300">-</span>
                  case "cashback_fixed":
                    return fixedRaw ? <span className="text-slate-600">{numberFormatter.format(fixedRaw)}</span> : <span className="text-slate-300">-</span>
                  case "cashback_sum":
                    return calculatedSum > 0 ? <span className="text-slate-600 font-medium">{numberFormatter.format(calculatedSum)}</span> : <span className="text-slate-300">-</span>
                  case "final_price":
                    return <span className={cn("font-bold", amountClass)}>{numberFormatter.format(finalPrice)}</span>
                  case "id":
                    return (
                      <CustomTooltip content={txn.id}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(txn.id);
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <span className="text-xs text-slate-400 font-mono cursor-help">
                            {txn.id.slice(0, 8)}...
                          </span>
                        </div>
                      </CustomTooltip>
                    )
                  case "task":
                    return taskCell
                  default:
                    return ""
                }
              }

              const voidedTextClass = effectiveStatus === 'void' && currentTab !== 'void' ? "opacity-60 line-through text-gray-400" : ""
              const percentRaw = txn.cashback_share_percent
              const fixedRaw = txn.cashback_share_fixed
              const calculatedSum = txn.cashback_share_amount ?? ((Math.abs(originalAmount ?? 0) * (percentRaw ?? 0)) + (fixedRaw ?? 0))
              const finalPrice = Math.abs(originalAmount ?? 0) - calculatedSum

              // Cycle Logic
              let cycleLabel = "-"
              const sourceAccountId = txn.transaction_lines?.find(l => l.account_id && l.type === 'credit')?.account_id
                ?? txn.transaction_lines?.find(l => l.account_id)?.account_id;

              if (sourceAccountId) {
                const acc = accounts.find(a => a.id === sourceAccountId)
                if (acc && acc.cashback_config) {
                  const config = parseCashbackConfig(acc.cashback_config)
                  const range = getCashbackCycleRange(config, new Date(txn.occurred_at))
                  // Format: DD/MM - DD/MM
                  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
                  cycleLabel = `${fmt(range.start)} - ${fmt(range.end)}`
                }
              }

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
                      className={`border-r text-sm ${col.key === "amount" ? "text-right" : ""} ${col.key === "amount" ? "font-bold" : ""
                        } ${col.key === "amount" ? amountClass : ""} ${col.key === "task" ? "" : voidedTextClass}`}
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
                X
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
      {refundFormTxn &&
        (() => {
          const pendingLine = refundFormTxn.transaction_lines?.find(
            line => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
          )
          const baseAmount =
            refundFormStage === 'confirm'
              ? Math.abs(pendingLine?.amount ?? refundFormTxn.original_amount ?? refundFormTxn.amount ?? 0)
              : Math.abs(refundFormTxn.original_amount ?? refundFormTxn.amount ?? 0)
          const sourceAccountLine =
            refundFormTxn.transaction_lines?.find(
              line => line?.type === 'credit' && line.account_id && line.account_id !== REFUND_PENDING_ACCOUNT_ID
            ) ??
            refundFormTxn.transaction_lines?.find(
              line => line?.type === 'debit' && line.account_id && line.account_id !== REFUND_PENDING_ACCOUNT_ID
            )
          const defaultAccountId = sourceAccountLine?.account_id ?? refundAccountOptions[0]?.id ?? null
          const initialNote =
            refundFormStage === 'confirm'
              ? refundFormTxn.note ?? 'Confirm refund'
              : `Refund: ${refundFormTxn.note ?? refundFormTxn.id}`

          return createPortal(
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
              onClick={() => setRefundFormTxn(null)}
            >
              <div
                className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
                onClick={event => event.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {refundFormStage === 'confirm' ? 'Confirm Refund' : 'Request Refund'}
                  </h3>
                  <button
                    className="text-slate-500 transition hover:text-slate-700"
                    onClick={() => setRefundFormTxn(null)}
                  >
                    X
                  </button>
                </div>
                <TransactionForm
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  shops={shops}
                  mode="refund"
                  refundTransactionId={refundFormTxn.id}
                  refundAction={refundFormStage}
                  refundMaxAmount={baseAmount}
                  defaultRefundStatus={refundFormStage === 'confirm' ? 'received' : 'pending'}
                  defaultSourceAccountId={defaultAccountId ?? undefined}
                  initialValues={{
                    amount: baseAmount,
                    note: initialNote,
                    shop_id: refundFormTxn.shop_id ?? undefined,
                    tag: refundFormTxn.tag ?? undefined,
                    occurred_at: refundFormTxn.occurred_at ? new Date(refundFormTxn.occurred_at) : new Date(),
                    source_account_id: defaultAccountId ?? undefined,
                    category_id: refundFormTxn.category_id ?? undefined,
                    person_id: refundFormTxn.person_id ?? undefined,
                  }}
                  onSuccess={handleRefundFormSuccess}
                />
              </div>
            </div>,
            document.body
          )
        })()}
      {bulkDialog?.open &&
        createPortal(
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setBulkDialog(null)}
          >
            <div
              className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {bulkDialog.mode === 'void' ? 'Bulk Void' : 'Bulk Restore'}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Bạn có chắc muốn {bulkDialog.mode === 'void' ? 'hủy' : 'khôi phục'}{' '}
                <span className="font-semibold">{selection.size}</span> giao dịch đã chọn?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setBulkDialog(null)}
                >
                  Cancel
                </button>
                <button
                  className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition ${bulkDialog.mode === 'void'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-green-600 hover:bg-green-500'
                    }`}
                  onClick={() => void executeBulk(bulkDialog.mode)}
                  disabled={isVoiding || isRestoring}
                >
                  {(isVoiding || isRestoring) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {bulkDialog.mode === 'void' ? 'Confirm Void' : 'Confirm Restore'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
