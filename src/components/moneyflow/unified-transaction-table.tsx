"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import {
  ArrowUpDown,
  Calendar,
  MoreHorizontal,
  Plus,
  Minus,
  Search,
  SlidersHorizontal,
  X,
  CreditCard,
  Check,
  Copy,
  CheckCheck,
  Sigma,
  Link2,
  Info,
  ArrowLeft,
  ArrowRight,
  ShoppingBasket,
  Wallet,
  ArrowUp,
  ArrowDown,
  Trash2,
  Tag,
  RotateCcw,
  Pencil,
  Ban,
  Loader2,
  Store,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronRight,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Clock,
  AlertCircle,
  Banknote,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Notebook,
  HelpCircle,
  User,
  Eraser,
  Undo2
} from 'lucide-react'
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { CustomTooltip, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/custom-tooltip'
import { createClient } from '@/lib/supabase/client'
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
  deleteTransaction,
} from "@/services/transaction.service"
import {
  voidTransactionAction,
} from "@/actions/transaction-actions"
import { REFUND_PENDING_ACCOUNT_ID } from "@/constants/refunds"
import { generateTag } from "@/lib/tag"
import { cn } from "@/lib/utils"
import { parseCashbackConfig, getCashbackCycleRange, ParsedCashbackConfig } from '@/lib/cashback'
import { RefundNoteDisplay } from './refund-note-display'
import { ConfirmRefundDialog } from "./confirm-refund-dialog"
import { TransactionHistoryModal } from './transaction-history-modal'
import { AddTransactionDialog } from "./add-transaction-dialog"
import { ExcelStatusBar } from "@/components/ui/excel-status-bar"

type ColumnKey =
  | "date"
  | "shop" // Merged Shop/Note
  | "category"
  | "tag"
  | "note" // Added Note Column
  | "account" // Merged Account ➜ People
  | "amount"
  | "back_info"
  | "final_price"
  | "id"
  | "task"

type SortKey = 'date' | 'amount'
type SortDir = 'asc' | 'desc'

type BulkActionState = {
  selectionCount: number
  currentTab: 'active' | 'void' | 'pending'
  onVoidSelected: () => Promise<void> | void
  onRestoreSelected: () => Promise<void> | void
  onDeleteSelected: () => Promise<void> | void
  isVoiding: boolean
  isRestoring: boolean
  isDeleting: boolean
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

  const categoryName = categoryLine?.categories?.name?.toLowerCase() ?? txn.category_name?.toLowerCase() ?? '';

  if (personLine?.person_id) {
    if (categoryName.includes('thu ná»£') || categoryName.includes('repayment')) {
      derivedType = 'repayment';
    } else {
      derivedType = 'debt';
    }
  } else if (categoryName.includes('cashback') || categoryName.includes('income') || categoryName.includes('refund')) {
    derivedType = 'income';
  } else if (categoryName.includes('money transfer') || categoryName.includes('chuyá»ƒn tiá»n')) {
    derivedType = 'transfer';
  } else if (!categoryLine && !txn.category_name) {
    derivedType = 'transfer';
  } else if (categoryLine?.type === 'debit') {
    derivedType = 'expense';
  } else if (categoryLine?.type === 'credit') {
    derivedType = 'income';
  } else if (txn.type === 'income') {
    derivedType = 'income';
  } else if (txn.type === 'expense') {
    derivedType = 'expense';
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
      percentValue !== undefined && percentValue !== null ? percentValue : undefined,
    cashback_share_fixed:
      txn.cashback_share_fixed !== null && txn.cashback_share_fixed !== undefined ? Number(txn.cashback_share_fixed) : undefined,
    is_installment: txn.is_installment ?? false,
    cashback_mode: (percentValue !== undefined && percentValue !== null && Number(percentValue) > 0) ? 'real_percent' :
      (txn.cashback_share_fixed !== null && txn.cashback_share_fixed !== undefined && Number(txn.cashback_share_fixed) > 0) ? 'real_fixed' : 'none_back',
  };
}

interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultWidth: number
  minWidth?: number
}

interface UnifiedTransactionTableProps {
  data?: TransactionWithDetails[]
  transactions?: TransactionWithDetails[] // Keeping for backward compatibility or alias
  accountType?: Account['type']
  accountId?: string // Specific Account Context
  contextId?: string // NEW: Context entity ID (account or person) for smart display
  selectedTxnIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  accounts?: Account[]
  categories?: Category[]
  people?: Person[]
  shops?: Shop[]
  activeTab?: 'active' | 'void' | 'pending'
  hiddenColumns?: ColumnKey[]
  onBulkActionStateChange?: (state: BulkActionState) => void
  sortState?: { key: SortKey; dir: SortDir }
  onSortChange?: (state: { key: SortKey; dir: SortDir }) => void
  context?: 'account' | 'person' | 'general'
  isExcelMode?: boolean
  // Pagination Props
  showPagination?: boolean
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  fontSize?: number
  onFontSizeChange?: (size: number) => void
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
  data,
  transactions,
  accountType,
  accountId,
  contextId,
  selectedTxnIds,
  onSelectionChange,
  accounts = [],
  categories = [],
  people = [],
  shops = [],
  activeTab,
  hiddenColumns = [],
  onBulkActionStateChange,
  sortState: externalSortState,
  onSortChange,
  context,
  isExcelMode = false,
  showPagination = true,
  currentPage: externalPage,
  pageSize: externalPageSize,
  onPageChange,
  onPageSizeChange,
  fontSize: externalFontSize,
  onFontSizeChange,
}: UnifiedTransactionTableProps) {
  const tableData = data ?? transactions ?? []
  const defaultColumns: ColumnConfig[] = [
    { key: "date", label: "Date", defaultWidth: 80, minWidth: 70 },
    { key: "shop", label: "Note", defaultWidth: 200, minWidth: 150 },
    { key: "category", label: "Category", defaultWidth: 150 },
    { key: "account", label: "Accounts ➜ People", defaultWidth: 180, minWidth: 180 },
    { key: "amount", label: "Amount", defaultWidth: 100 },
    { key: "final_price", label: "Final Price", defaultWidth: 100 },
    { key: "id", label: "ID", defaultWidth: 100 },
    { key: "task", label: "", defaultWidth: 48, minWidth: 48 },
  ]
  const router = useRouter()
  // Internal state removed for activeTab, now using prop with fallback
  const lastSelectedIdRef = useRef<string | null>(null)
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)



  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    const initial: Record<ColumnKey, boolean> = {
      date: true,
      shop: true,
      note: false, // Merged into Shop
      category: true,
      tag: false, // Merged into Account column (not in defaultColumns)
      account: true,
      amount: true,
      back_info: false, // Merged into Amount column (not in defaultColumns)
      final_price: true,
      id: false,
      task: true,
    }

    if (hiddenColumns.length > 0) {
      hiddenColumns.forEach(col => {
        initial[col] = false
      })
    }

    return initial
  })
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    const map = {} as Record<ColumnKey, number>
    defaultColumns.forEach(col => {
      map[col.key] = col.defaultWidth
    })
    return map
  })

  useEffect(() => {
    setVisibleColumns(prev => {
      const next = { ...prev }
      if (hiddenColumns.length > 0) {
        hiddenColumns.forEach(col => {
          next[col] = false
        })
      }
      // Simple deep equality check to prevent infinite loop
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return prev
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(hiddenColumns)])

  // Realtime Subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // State for actions
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  // fontSize state moved up
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null)
  const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
  const [confirmCancelTarget, setConfirmCancelTarget] = useState<TransactionWithDetails | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [confirmRefundOpen, setConfirmRefundOpen] = useState(false)
  const [confirmRefundTxn, setConfirmRefundTxn] = useState<TransactionWithDetails | null>(null)
  const [historyTarget, setHistoryTarget] = useState<TransactionWithDetails | null>(null)
  const [cloningTxn, setCloningTxn] = useState<TransactionWithDetails | null>(null)

  const handleOpenConfirmRefund = (txn: TransactionWithDetails) => {
    setConfirmRefundTxn(txn)
    setConfirmRefundOpen(true)
    setActionMenuOpen(null)
  }
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TransactionWithDetails['status']>>({})
  const [refundFormTxn, setRefundFormTxn] = useState<TransactionWithDetails | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [refundFormStage, setRefundFormStage] = useState<'request' | 'confirm'>('request')
  const [internalSortState, setInternalSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: 'date', dir: 'desc' })
  const [bulkDialog, setBulkDialog] = useState<{ mode: 'void' | 'restore' | 'delete'; open: boolean } | null>(null)
  const stopBulk = useRef(false)

  // Font Size Logic
  const [internalFontSize, setInternalFontSize] = useState(14)
  const fontSize = externalFontSize ?? internalFontSize
  const setFontSize = onFontSizeChange ?? setInternalFontSize

  // Pagination State Logic
  const [internalPageSize, setInternalPageSize] = useState(20)
  const [internalCurrentPage, setInternalCurrentPage] = useState(1)

  const pageSize = externalPageSize ?? internalPageSize
  const currentPage = externalPage ?? internalCurrentPage

  const setPageSize = (size: number) => {
    setInternalPageSize(size)
    onPageSizeChange?.(size)
  }

  const setCurrentPage = (page: number) => {
    setInternalCurrentPage(page)
    onPageChange?.(page)
  }

  const sortState = externalSortState ?? internalSortState
  const setSortState = onSortChange ?? setInternalSortState

  useEffect(() => {
    if (!externalPage) {
      setCurrentPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, transactions, accountType, accountId, sortState, context])

  // --- Excel Mode Logic ---
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [startTxnId, setStartTxnId] = useState<string | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<'amount' | 'final_price' | null>(null)

  useEffect(() => {
    if (!isExcelMode) {
      setSelectedCells(new Set())
      setIsSelecting(false)
      setStartTxnId(null)
      setSelectedColumn(null)
    }
  }, [isExcelMode])

  const handleCellMouseDown = (txnId: string, colKey: 'amount' | 'final_price', event: React.MouseEvent) => {
    if (!isExcelMode) return
    // Only allow left click
    if (event.button !== 0) return

    event.preventDefault() // Prevent text selection
    setIsSelecting(true)
    setStartTxnId(txnId)
    setSelectedColumn(colKey)
    setSelectedCells(new Set([txnId]))
  }

  const handleCellMouseEnter = (txnId: string, colKey: 'amount' | 'final_price') => {
    if (!isExcelMode || !isSelecting || !startTxnId || selectedColumn !== colKey) return

    // Find range between startTxnId and current txnId in displayedTransactions
    const startIdx = displayedTransactions.findIndex(t => t.id === startTxnId)
    const currentIdx = displayedTransactions.findIndex(t => t.id === txnId)

    if (startIdx === -1 || currentIdx === -1) return

    const min = Math.min(startIdx, currentIdx)
    const max = Math.max(startIdx, currentIdx)

    const range = displayedTransactions.slice(min, max + 1)
    const newSet = new Set(range.map(t => t.id))
    setSelectedCells(newSet)
  }

  const handleCellMouseUp = () => {
    if (!isExcelMode) return
    setIsSelecting(false)
    setStartTxnId(null)
    // Keep selectedColumn for display purposes until Excel mode is off or new selection starts
  }

  // Global mouse up to catch drag release outside cell
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false)
        setStartTxnId(null)
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isSelecting])

  const selectedStats = useMemo(() => {
    if (selectedCells.size === 0 || !selectedColumn) return { sum: 0, count: 0, average: 0, totalIn: 0, totalOut: 0 }

    let sum = 0
    let count = 0
    let totalIn = 0
    let totalOut = 0

    selectedCells.forEach(id => {
      const txn = tableData.find(t => t.id === id)
      if (txn) {
        let value = 0;
        if (selectedColumn === 'final_price') {
          const originalAmount = typeof txn.original_amount === "number" ? txn.original_amount : txn.amount ?? 0;
          const percentRaw = Number(txn.cashback_share_percent ?? 0);
          const fixedRaw = Number(txn.cashback_share_fixed ?? 0);
          const rate = percentRaw > 1 ? percentRaw / 100 : percentRaw;
          const cashbackCalc = (Math.abs(originalAmount) * rate) + fixedRaw;
          const cashbackAmount = txn.cashback_share_amount ?? (cashbackCalc > 0 ? cashbackCalc : 0);
          const baseAmount = Math.abs(originalAmount);
          value = cashbackAmount > baseAmount ? baseAmount : Math.max(0, baseAmount - cashbackAmount);
        } else { // selectedColumn === 'amount'
          value = Math.abs(typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount ?? 0);
        }

        sum += value;
        count++;

        const visualType = (txn as any).displayType ?? txn.type;
        // For totalIn/totalOut, use the original amount sign, but the calculated value
        // Exclude transfers from totalIn/totalOut unless they are explicitly income/expense
        if (visualType === 'income' && txn.type !== 'transfer') {
          totalIn += value;
        } else if (visualType === 'expense' && txn.type !== 'transfer') {
          totalOut += value;
        } else if (txn.type === 'repayment') {
          // Repayments are usually expenses from the perspective of the payer
          totalOut += value;
        }
      }
    })

    return {
      sum,
      count,
      average: count > 0 ? sum / count : 0,
      totalIn,
      totalOut
    }
  }, [selectedCells, tableData, selectedColumn])


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

  // Auto-disable Show Selected Only when selection is cleared
  useEffect(() => {
    if (selection.size === 0 && showSelectedOnly) {
      setShowSelectedOnly(false)
    }
  }, [selection.size, showSelectedOnly])

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
    setFontSize(14) // Reset font size to default
    // Note: Column visibility is NOT reset - user's choice is preserved
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

  const handleRecalcSelections = async () => {
    if (!selection.size) return
    const ids = Array.from(selection)
    const toastId = toast.loading(`Recalculating cashback for ${ids.length} transactions...`)

    let successCount = 0
    let failCount = 0

    for (const id of ids) {
      try {
        const res = await fetch(`/api/debug/recalc-cashback?id=${id}`)
        if (res.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch (e) {
        console.error(e)
        failCount++
      }
    }

    toast.dismiss(toastId)
    if (failCount === 0) {
      toast.success(`Successfully recalculated ${successCount} transactions.`)
    } else {
      toast.warning(`Finished with ${successCount} successes and ${failCount} failures.`)
    }
    router.refresh()
    // Clear selection after action
    updateSelection(new Set())
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
    void voidTransactionAction(confirmVoidTarget.id)
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
        if (err.message && err.message.includes('void the confirmation transaction first')) {
          toast.error("Please void the Confirmation Transaction (GD3) first.", {
            description: "Linked confirmation exists."
          });
          closeVoidDialog();
        } else {
          setVoidError(err.message || 'Unable to void transaction. Please try again.')
        }
      })
      .finally(() => setIsVoiding(false))
  }

  const handleCancelOrderConfirm = (moneyReceived: boolean) => {
    if (!confirmCancelTarget) return
    setVoidError(null)
    setIsVoiding(true)

    import("@/services/transaction.service").then(async ({ requestRefund, confirmRefund }) => {
      const originalAmount = typeof confirmCancelTarget.original_amount === "number"
        ? confirmCancelTarget.original_amount
        : confirmCancelTarget.amount
      const amountToRefund = Math.abs(originalAmount ?? 0)

      try {
        // 1. Request Refund (Always needed to set up metadata and pending txn)
        const reqRes = await requestRefund(
          confirmCancelTarget.id,
          amountToRefund,
          false // isPending = false means it goes to Pending account? No, partial=false means full refund.
        )

        if (!reqRes.success || !reqRes.refundTransactionId) {
          throw new Error(reqRes.error || 'Failed to request refund')
        }

        // 2. If Money Received, Confirm it immediately
        if (moneyReceived) {
          // Determine target account (default to source account of original txn)
          const sourceAccountLine = confirmCancelTarget.transaction_lines?.find(l => l.type === 'credit' && l.account_id)
          const targetAccountId = sourceAccountLine?.account_id

          if (!targetAccountId) {
            throw new Error('Cannot determine target account for immediate refund. Please use manual refund.')
          }

          const confRes = await confirmRefund(reqRes.refundTransactionId, targetAccountId)
          if (!confRes.success) {
            throw new Error(confRes.error || 'Failed to confirm refund')
          }
        }

        router.refresh()
        setConfirmCancelTarget(null)
      } catch (err: any) {
        console.error(err)
        setVoidError(err.message || 'Failed to cancel order')
      } finally {
        setIsVoiding(false)
      }
    })
  }

  const handleBulkVoid = useCallback(async () => {
    if (selection.size === 0) return;
    setBulkDialog({ mode: 'void', open: true })
  }, [selection.size])

  const handleBulkRestore = useCallback(async () => {
    if (selection.size === 0) return;
    setBulkDialog({ mode: 'restore', open: true })
  }, [selection.size])

  const handleBulkDelete = useCallback(async () => {
    if (selection.size === 0) return;
    setBulkDialog({ mode: 'delete', open: true })
  }, [selection.size])

  const currentTab = activeTab ?? 'active';

  useEffect(() => {
    if (!onBulkActionStateChange) return
    onBulkActionStateChange({
      selectionCount: selection.size,
      currentTab,
      onVoidSelected: handleBulkVoid,
      onRestoreSelected: handleBulkRestore,
      onDeleteSelected: handleBulkDelete,
      isVoiding,
      isRestoring,
      isDeleting,
    })
  }, [
    currentTab,
    handleBulkRestore,
    handleBulkVoid,
    handleBulkDelete,
    isRestoring,
    isVoiding,
    isDeleting,
    onBulkActionStateChange,
    selection.size,
  ])

  const handleEditSuccess = () => {
    setEditingTxn(null)
    router.refresh()
  }

  const executeBulk = async (mode: 'void' | 'restore' | 'delete') => {
    if (selection.size === 0) return
    stopBulk.current = false
    let processedCount = 0

    if (mode === 'void') {
      setIsVoiding(true)
      let errorCount = 0
      for (const id of Array.from(selection)) {
        if (stopBulk.current) {
          toast.info(`Process stopped. ${processedCount} items processed.`)
          break
        }
        try {
          const ok = await voidTransactionAction(id)
          if (ok) {
            setStatusOverrides(prev => ({ ...prev, [id]: 'void' }))
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
        processedCount++
      }
      setIsVoiding(false)
      updateSelection(new Set())
      router.refresh()
      if (errorCount > 0) {
        toast.error(`Failed to void ${errorCount} transactions.`)
      }
    } else if (mode === 'restore') {
      setIsRestoring(true)
      let errorCount = 0
      for (const id of Array.from(selection)) {
        if (stopBulk.current) {
          toast.info(`Process stopped. ${processedCount} items processed.`)
          break
        }
        const ok = await restoreTransaction(id)
        if (ok) {
          setStatusOverrides(prev => ({ ...prev, [id]: 'posted' }))
        } else {
          errorCount++
        }
        processedCount++
      }
      setIsRestoring(false)
      updateSelection(new Set())
      router.refresh()
      if (errorCount > 0) {
        toast.error(`Failed to restore ${errorCount} transactions.`)
      }
    } else if (mode === 'delete') {
      setIsDeleting(true)
      let errorCount = 0
      for (const id of Array.from(selection)) {
        if (stopBulk.current) {
          toast.info(`Process stopped. ${processedCount} items processed.`)
          break
        }
        const ok = await deleteTransaction(id)
        if (!ok) {
          errorCount++
        }
        processedCount++
      }
      setIsDeleting(false)
      updateSelection(new Set())
      router.refresh()
      if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} transactions.`)
      }
    }
    setBulkDialog(null)
  }

  const displayedTransactions = useMemo(() => {
    if (showSelectedOnly && selection.size > 0) {
      return tableData.filter(t => selection.has(t.id))
    }

    const filtered = tableData.filter(txn => {
      // 1. Account Filter (Handled by server usually, but safety check)
      if (context === 'account' && accountId) {
        // If necessary, check if txn belongs to account. 
        // Assuming tableData is correct from server/parent.
      }

      // 2. Tab Filter
      const status = statusOverrides[txn.id] ?? txn.status
      if (currentTab === 'void') {
        if (status !== 'void') return false
      } else if (currentTab === 'pending') {
        // Pending logic (Yellow)
        const isPending = status === 'pending'
        const isWaitingRefund = status === 'waiting_refund'
        if (!isPending && !isWaitingRefund) return false
      } else {
        // Active tab: Show everything EXCEPT void
        if (status === 'void') return false
      }

      return true
    })

    // Sort
    return filtered.sort((a, b) => {
      const dateA = new Date(a.occurred_at ?? a.created_at ?? 0).getTime()
      const dateB = new Date(b.occurred_at ?? b.created_at ?? 0).getTime()

      if (sortState.key === 'date') {
        return sortState.dir === 'asc' ? dateA - dateB : dateB - dateA
      } else if (sortState.key === 'amount') {
        const amtA = Math.abs(a.amount ?? 0)
        const amtB = Math.abs(b.amount ?? 0)
        return sortState.dir === 'asc' ? amtA - amtB : amtB - amtA
      }
      return 0
    })
  }, [tableData, showSelectedOnly, selection, context, accountId, statusOverrides, currentTab, sortState])

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return displayedTransactions.slice(start, start + pageSize)
  }, [displayedTransactions, currentPage, pageSize])


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      updateSelection(new Set(displayedTransactions.map(txn => txn.id)))
    } else {
      updateSelection(new Set())
    }
  }

  const handleSelectOne = (txnId: string, checked: boolean, shiftKey: boolean = false) => {
    const newSet = new Set(selection)

    if (shiftKey && lastSelectedIdRef.current) {
      const startIdx = displayedTransactions.findIndex(t => t.id === lastSelectedIdRef.current)
      const endIdx = displayedTransactions.findIndex(t => t.id === txnId)

      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx)
        const max = Math.max(startIdx, endIdx)
        const range = displayedTransactions.slice(min, max + 1)

        range.forEach(t => {
          if (checked) newSet.add(t.id)
          else newSet.delete(t.id)
        })
      }
    } else {
      if (checked) {
        newSet.add(txnId)
      } else {
        newSet.delete(txnId)
      }
    }

    lastSelectedIdRef.current = txnId
    updateSelection(newSet)
  }

  // --- Summary Calculation ---
  const summary = useMemo(() => {
    const selectedTxns = tableData.filter(txn => selection.has(txn.id))
    const initialSummary = { sumAmount: 0 };
    const incomeSummary = { ...initialSummary };
    const expenseSummary = { ...initialSummary };

    for (const txn of selectedTxns) {
      const visualType = (txn as any).displayType ?? txn.type;
      const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount;
      const absAmount = Math.abs(originalAmount ?? 0);

      if (visualType === 'income') {
        incomeSummary.sumAmount += absAmount;
      } else if (visualType === 'expense') {
        expenseSummary.sumAmount += absAmount;
      } else {
        // For transfers/others, fallback to amount sign if needed, or default to expense as per FilterableTransactions?
        // FilterableTransactions defaults 'else' to expense.
        // But let's try to be smarter: if amount > 0, income, else expense.
        const amount = txn.amount ?? 0;
        if (amount > 0) {
          incomeSummary.sumAmount += absAmount;
        } else {
          expenseSummary.sumAmount += absAmount;
        }
      }
    }
    return { incomeSummary, expenseSummary }
  }, [selection, tableData])



  if (tableData.length === 0 && activeTab === 'active') {
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
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className={cn(
        "relative w-full border rounded-md bg-white shadow-sm transition-colors duration-300 flex-1 overflow-auto",
        isExcelMode && "border-emerald-500 shadow-emerald-100 ring-4 ring-emerald-50"
      )} style={{ ['--table-font-size' as string]: `${fontSize}px` } as React.CSSProperties}>
        <Table className="min-w-[1000px] [&_td]:text-[length:var(--table-font-size)] [&_th]:text-[length:var(--table-font-size)]" wrapperClassName="overflow-visible" style={{ fontSize: `${fontSize}px` }}>
          <TableHeader className="sticky top-0 z-30 bg-slate-100 backdrop-blur text-foreground font-bold shadow-sm">
            <TableRow className="hover:bg-transparent border-b-2 border-slate-300">
              {displayedColumns.map(col => {
                if (col.key === "task") {
                  return (
                    <TableHead
                      key={col.key}
                      className="text-right border-l-2 border-slate-300 bg-slate-200 whitespace-nowrap sticky right-0 z-40 shadow-[-1px_0_0_0_rgba(0,0,0,0.1)]"
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

                let stickyStyle: React.CSSProperties = { width: columnWidths[col.key] };
                let stickyClass = "";

                if (col.key === 'date') {
                  stickyClass = "sticky left-0 z-40 bg-slate-200 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] border-r border-slate-300";
                } else if (col.key === 'shop') {
                  // Shop (Notes) column is sticky after Date column
                  let left = 0;
                  if (visibleColumns.date) left += columnWidths.date;
                  // Note: 'type' column was removed, it's now merged into date

                  stickyClass = "sticky z-40 bg-slate-200 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] border-r border-slate-300";
                  stickyStyle.left = left;
                }

                return (
                  <TableHead
                    key={col.key}
                    className={cn("border-r-2 border-slate-300 bg-slate-200 font-semibold text-slate-700 whitespace-nowrap", stickyClass)}
                    style={stickyStyle}
                  >
                    {col.key === 'date' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={isAllSelected}
                          onChange={e => handleSelectAll(e.target.checked)}
                        />
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
                      </div>
                    ) : col.key === 'amount' ? (
                      <button
                        className="flex items-center gap-1 group w-full justify-end"
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
            {paginatedTransactions.map(txn => {
              const isRepayment = txn.type === 'repayment';
              const visualType = (txn as any).displayType ?? txn.type;
              const displayDirection = (txn as any).display_type as string | undefined;
              const amountClass =
                visualType === "income" || isRepayment
                  ? "text-emerald-700"
                  : visualType === "expense"
                    ? "text-red-500"
                    : "text-slate-600"

              // Shared ID Resolution for Smart Context (Type Badge + Account Column)
              const txnSourceId = txn.source_account_id || txn.account_id
              const destNameRaw = txn.destination_name || 'Unknown'
              const txnDestId = txn.destination_account_id || ((txn as any).target_account_id) || (destNameRaw !== 'Unknown' ? accounts.find(a => a.name === destNameRaw)?.id : undefined)
              const txnPersonId = (txn as any).person_id
              const originalAmount = typeof txn.original_amount === "number" ? txn.original_amount : txn.amount
              const amountValue = numberFormatter.format(Math.abs(originalAmount ?? 0))

              const isExcelSelected = isExcelMode && selectedCells.has(txn.id)

              const isSelected = selection.has(txn.id)
              const effectiveStatus = statusOverrides[txn.id] ?? txn.status
              const isVoided = effectiveStatus === 'void'
              const isMenuOpen = actionMenuOpen === txn.id
              const txnMetadata = parseMetadata(txn.metadata)
              const refundStatusMeta = typeof txnMetadata?.refund_status === "string" ? txnMetadata.refund_status : null
              const refundedAmount = typeof txnMetadata?.refunded_amount === "number" ? Math.abs(txnMetadata.refunded_amount) : 0
              const effectiveOriginalAmount = Math.abs(originalAmount ?? 0)
              const refundStatus =
                refundStatusMeta === 'full' || refundStatusMeta === 'partial'
                  ? refundStatusMeta
                  : refundedAmount > 0
                    ? refundedAmount >= effectiveOriginalAmount && effectiveOriginalAmount > 0
                      ? 'full'
                      : 'partial'
                    : refundStatusMeta
              const isPendingRefund = refundStatusMeta === 'requested'
              const categoryLabel = txn.category_name ?? ''
              const hasShoppingCategory = categoryLabel.toLowerCase().includes('shopping')
              const isFullyRefunded =
                refundStatus === 'full' ||
                (refundedAmount > 0 && effectiveOriginalAmount > 0 && refundedAmount >= effectiveOriginalAmount)
              const isPartialRefund =
                !isFullyRefunded &&
                refundedAmount > 0
              const canRequestRefund =
                (visualType === 'expense' || txn.type === 'expense') &&
                (Boolean(txn.shop_id) || hasShoppingCategory) &&
                !isFullyRefunded

              // Refund SEQ Logic (Global for row)
              let refundSeq = 0;
              if (txnMetadata?.has_refund_request || txn.status === 'waiting_refund') refundSeq = 1;
              else if (txnMetadata?.original_transaction_id && !txnMetadata.is_refund_confirmation) refundSeq = 2;
              else if (txnMetadata?.is_refund_confirmation) refundSeq = 3;

              let displayIdForBadge = txn.id;
              if (refundSeq === 2 || refundSeq === 3) {
                displayIdForBadge = (txnMetadata?.original_transaction_id as string) || txn.id;
              }
              const shortIdBadge = displayIdForBadge.length > 4
                ? `[${displayIdForBadge.slice(0, 2)}..${displayIdForBadge.slice(-2)}]`
                : '';

              // --- Type Logic ---
              let typeBadge = null;
              if (txn.type === 'repayment') {
                typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-emerald-200 px-2 py-1 text-xs font-bold text-emerald-900 h-6">REPAY</span>;
              } else if (txn.type === 'transfer') {
                if (contextId) {
                  // Smart Context Type Logic
                  if (contextId == txnSourceId) {
                    typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 h-6">TF OUT</span>
                  } else if (contextId == txnDestId || contextId == txnPersonId) {
                    typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-emerald-200 px-2 py-1 text-xs font-bold text-emerald-900 h-6">TF IN</span>
                  } else {
                    // Context exists but doesn't match source/dest (e.g. searching global table with filter?)
                    // Fallback to amount logic
                    if (txn.amount >= 0) {
                      typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-emerald-200 px-2 py-1 text-xs font-bold text-emerald-900 h-6">TF IN</span>
                    } else {

                      typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 h-6">TF OUT</span>
                    }
                  }
                } else if (accountId) {
                  if (txn.amount >= 0) {
                    typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-emerald-200 px-2 py-1 text-xs font-bold text-emerald-900 h-6">TF IN</span>
                  } else {
                    typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 h-6">TF OUT</span>
                  }
                } else {
                  // Standard Transfer -> Blue
                  typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 h-6">TF</span>
                }
              } else if (visualType === 'expense') {
                typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-700 h-6">OUT</span>
              } else if (visualType === 'income') {
                typeBadge = <span className="inline-flex items-center justify-center w-[60px] rounded-md bg-emerald-200 px-2 py-1 text-xs font-bold text-emerald-900 h-6">IN</span>
              } else {
                typeBadge = <span className="inline-flex items-center rounded-md bg-blue-200 px-2 py-1 text-xs font-bold text-blue-900 h-6">TF</span>
              }


              // --- Status Logic ---
              let statusIndicator = null;
              let statusTooltip = "";
              const meta = (txn.metadata as any) || {};
              const isRefundConfirmation = meta?.is_refund_confirmation === true;
              const metaRefundStatus = meta?.refund_status;

              const statusBadgeStyle = "flex items-center justify-center rounded p-0.5 w-5 h-5 transition-colors border";

              if (isVoided) {
                statusIndicator = <Ban className="h-4 w-4 text-slate-400" />;
                statusTooltip = "Voided";
              }
              else if (effectiveStatus === 'pending') {
                statusIndicator = (
                  <div className={cn(statusBadgeStyle, "bg-amber-100 border-amber-300 text-amber-700")}>
                    <Clock className="h-3 w-3" />
                  </div>
                );
                statusTooltip = "Pending Refund";
              }
              else if (effectiveStatus === 'waiting_refund' || metaRefundStatus === 'waiting_refund') {
                statusIndicator = (
                  <div className={cn(statusBadgeStyle, "bg-amber-100 border-amber-300 text-amber-700")}>
                    <Clock className="h-3 w-3" />
                  </div>
                );
                statusTooltip = "Waiting Refund";
              }
              else if (effectiveStatus === 'completed') {
                statusIndicator = (
                  <div className={cn(statusBadgeStyle, "bg-emerald-100 border-emerald-300 text-emerald-700")}>
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                );
                statusTooltip = "Refund Completed";
              }
              else if (effectiveStatus === 'refunded' || metaRefundStatus === 'refunded') {
                statusIndicator = (
                  <div className={cn(statusBadgeStyle, "bg-emerald-100 border-emerald-300 text-emerald-700")}>
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                );
                statusTooltip = "Refund Received";
              }
              // GD3: Refund confirmation with posted status
              else if (isRefundConfirmation && effectiveStatus === 'posted') {
                statusIndicator = (
                  <div className={cn(statusBadgeStyle, "bg-emerald-100 border-emerald-300 text-emerald-700")}>
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                );
                statusTooltip = "Money Received";
              }
              // GD1: Has pending refund request (not yet confirmed)
              else if (meta?.has_refund_request && !metaRefundStatus) {
                statusIndicator = (
                  <div className={cn(statusBadgeStyle, "bg-blue-100 border-blue-300 text-blue-700")}>
                    <FileText className="h-3 w-3" />
                  </div>
                );
                statusTooltip = "Refund Requested";
              }

              const isInstallmentRow = txn.is_installment || txn.installment_plan_id;


              const taskCell = (
                <div className="relative flex justify-end">
                  <button
                    id={`action-btn-${txn.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isExcelMode}
                    onClick={event => {
                      event.stopPropagation()
                      if (!isExcelMode) {
                        setActionMenuOpen(prev => (prev === txn.id ? null : txn.id))
                      }
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {isMenuOpen && typeof document !== 'undefined' && createPortal(
                    <>
                      <div
                        className="fixed inset-0 z-[60] bg-transparent"
                        onClick={() => setActionMenuOpen(null)}
                      />
                      <div
                        className="fixed z-[70] w-48 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-lg"
                        style={{
                          top: document.getElementById(`action-btn-${txn.id}`)?.getBoundingClientRect().bottom ?? 0,
                          left: (document.getElementById(`action-btn-${txn.id}`)?.getBoundingClientRect().left ?? 0) - 150,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {currentTab === 'void' || isVoided ? (
                          <>
                            <button
                              className="flex w-full items-center gap-2 rounded px-3 py-1 text-left text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={isRestoring}
                              onClick={event => {
                                event.stopPropagation();
                                handleRestore(txn);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                            </button>

                            <hr className="my-1 border-slate-200" />

                            {(txn.history_count || 0) > 0 && (
                              <button
                                className="flex w-full items-center gap-2 rounded px-3 py-1 text-left text-slate-600 hover:bg-slate-50"
                                onClick={event => {
                                  event.stopPropagation();
                                  setHistoryTarget(txn);
                                  setActionMenuOpen(null);
                                }}
                              >
                                <History className="h-4 w-4" />
                                <span>View History</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              className="flex w-full items-center gap-2 rounded px-3 py-1 text-left hover:bg-slate-50"
                              onClick={event => {
                                event.stopPropagation();
                                setEditingTxn(txn);
                                setActionMenuOpen(null);
                              }}
                            >
                              <Pencil className="h-4 w-4 text-slate-600" />
                              <span>Edit</span>
                            </button>

                            <button
                              className="flex w-full items-center gap-2 rounded px-3 py-1 text-left hover:bg-slate-50"
                              onClick={event => {
                                event.stopPropagation();
                                setCloningTxn(txn);
                                setActionMenuOpen(null);
                              }}
                            >
                              <Copy className="h-4 w-4 text-slate-600" />
                              <span>Clone</span>
                            </button>

                            {canRequestRefund && !isPendingRefund && (
                              <button
                                className="flex w-full items-center gap-2 rounded px-3 py-1 text-left text-blue-600 hover:bg-blue-50"
                                onClick={event => {
                                  event.stopPropagation();
                                  openRefundForm(txn, 'request');
                                }}
                              >
                                <Undo2 className="h-4 w-4" />
                                <span>Request Refund</span>
                              </button>
                            )}
                            {canRequestRefund && !isPendingRefund && !isFullyRefunded && (
                              <button
                                className="flex w-full items-center gap-2 rounded px-3 py-1 text-left text-purple-700 hover:bg-purple-50"
                                onClick={event => {
                                  event.stopPropagation();
                                  setConfirmCancelTarget(txn);
                                  setActionMenuOpen(null);
                                }}
                              >
                                <Eraser className="h-4 w-4" />
                                <span>Cancel Order (100%)</span>
                              </button>
                            )}
                            {(effectiveStatus === 'pending' && (txn.account_name === 'Pending Refunds' || txn.source_name?.includes('Pending'))) && (
                              <button
                                className="flex w-full items-center gap-2 rounded px-3 py-1 text-left text-green-700 hover:bg-green-50"
                                onClick={event => {
                                  event.stopPropagation();
                                  handleOpenConfirmRefund(txn);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Confirm Money Received</span>
                              </button>
                            )}

                            <hr className="my-1 border-slate-200" />

                            {(txn.history_count || 0) > 0 && (
                              <button
                                className="flex w-full items-center gap-2 rounded px-3 py-1 text-left text-slate-600 hover:bg-slate-50"
                                onClick={event => {
                                  event.stopPropagation();
                                  setHistoryTarget(txn);
                                  setActionMenuOpen(null);
                                }}
                              >
                                <History className="h-4 w-4" />
                                <span>View History</span>
                              </button>
                            )}

                            <button
                              className="flex w-full items-center gap-2 rounded px-3 py-1 text-left text-red-700 hover:bg-red-50"
                              onClick={event => {
                                event.stopPropagation();
                                setConfirmVoidTarget(txn);
                                setVoidError(null);
                                setActionMenuOpen(null);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Void Transaction</span>
                            </button>
                          </>
                        )}
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              )

              const voidedTextClass = ""

              // Row Background Logic (Restored)
              let rowBgColor = "bg-white"
              if (isVoided) {
                rowBgColor = "opacity-60 bg-gray-50 scale-[0.99] border-dashed grayscale"
              } else {
                const refundSeqCheck = (txn.metadata as any)?.refund_sequence || 0
                if (txn.is_installment || txn.installment_plan_id) rowBgColor = "bg-amber-50"
                else if (refundSeqCheck > 0) rowBgColor = "bg-purple-50" // Refund shading
                else if (txn.type === 'repayment') rowBgColor = "bg-slate-50"
                else if (effectiveStatus === 'pending' || effectiveStatus === 'waiting_refund') rowBgColor = "bg-emerald-50/50"
              }

              // Final Price Logic
              // Rename calculatedSum -> cashbackAmount for clarity
              // If cashback > 0, we subtract it.
              const percentRaw = Number(txn.cashback_share_percent ?? 0)
              const fixedRaw = Number(txn.cashback_share_fixed ?? 0)
              // Normalize: if > 1, assume percent (e.g. 2 -> 2% = 0.02 rate), else rate
              const rate = percentRaw > 1 ? percentRaw / 100 : percentRaw
              const cashbackCalc = (Math.abs(Number(originalAmount ?? 0)) * rate) + fixedRaw
              const cashbackAmount = txn.cashback_share_amount ?? (cashbackCalc > 0 ? cashbackCalc : 0);

              // Final Price: original - cashback. Use Math.max to prevent negative, but only if cashback is reasonable
              // If cashback > amount, it's likely a configuration error - show the original amount instead
              const baseAmount = Math.abs(Number(originalAmount ?? 0));
              const finalPrice = (typeof txn.final_price === 'number')
                ? Math.abs(txn.final_price)
                : (cashbackAmount > baseAmount ? baseAmount : Math.max(0, baseAmount - cashbackAmount));

              // Cycle Logic - Use account_id directly (single-table mode)
              let cycleLabel = "-"
              // In single-table mode, use txn.account_id directly instead of transaction_lines
              const sourceAccountId = txn.account_id;

              if (sourceAccountId) {
                const acc = accounts.find(a => a.id === sourceAccountId)
                if (acc && acc.cashback_config) {
                  const config = parseCashbackConfig(acc.cashback_config)
                  const range = getCashbackCycleRange(config, new Date(txn.occurred_at))
                  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
                  cycleLabel = `${fmt(range.start)} - ${fmt(range.end)}`
                }
              }

              const renderCell = (key: ColumnKey) => {
                switch (key) {
                  case "date": {
                    const d = new Date(txn.occurred_at ?? txn.created_at ?? Date.now())
                    const dateFormatter = new Intl.DateTimeFormat('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })
                    const dateStr = dateFormatter.format(d)

                    return (
                      <div className="flex items-center gap-1.5 w-full">
                        {/* Checkbox for row selection */}
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 shrink-0"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectOne(txn.id, e.target.checked);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (e.shiftKey) {
                              handleSelectOne(txn.id, !isSelected, true);
                            }
                          }}
                        />
                        {/* Date and Time */}
                        <div className="flex flex-col min-w-[50px]">
                          <span className="font-semibold whitespace-nowrap leading-none">{dateStr}</span>
                          <span className="text-[0.7em] text-slate-400 font-medium leading-tight">
                            {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                        {/* Type Badge */}
                        <div className="ml-auto pl-1.5 border-l border-slate-100 flex items-center shrink-0">
                          {typeBadge}
                        </div>
                      </div>
                    )
                  }
                  // Note: 'type' column was removed - it's now merged into the 'date' column
                  case "shop": {
                    let shopLogo = txn.shop_logo_url;
                    let shopName = txn.shop_name;

                    // Fallback logic for repayment/service
                    if (txn.type === 'repayment' && !shopName) {
                      shopLogo = txn.destination_logo;
                      shopName = txn.destination_name;
                    }

                    const isServicePayment = txn.note?.startsWith('Payment for Service') || (txn.metadata as any)?.type === 'service_payment';
                    if (isServicePayment && !shopLogo) {
                      shopLogo = txn.source_logo;
                    }

                    return (
                      <div className="flex items-center gap-2 w-full overflow-hidden group">
                        {/* Installment Link - Moved to Start (Before Logo) */}
                        {(txn.is_installment || txn.installment_plan_id) && (
                          <CustomTooltip content="Trả góp - Click để xem">
                            <Link
                              href={`/installments?tab=active&highlight=${txn.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center rounded bg-amber-100 border border-amber-400 px-1 py-0.5 text-amber-700 hover:bg-amber-200 transition-colors shrink-0"
                            >
                              <Link2 className="h-4 w-4" />
                            </Link>
                          </CustomTooltip>
                        )}

                        {/* Logo */}
                        {shopLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={shopLogo} alt="" className="h-6 w-6 object-contain shrink-0 !rounded-none !border-none ring-0 outline-none" />
                        ) : (
                          // Replaced ShoppingBasket with Status/Refund Indicator
                          // User requested: No border for Refund icon, bigger size. Darker ShoppingBasket.
                          <div className={cn(
                            "flex items-center justify-center h-8 w-8 !rounded-none !border-none ring-0 outline-none bg-slate-50 shrink-0",
                            !statusIndicator && ""
                          )}>
                            {statusIndicator ? (
                              <CustomTooltip content={statusTooltip}>
                                <span className="text-xl cursor-help font-bold text-slate-800" suppressHydrationWarning>{statusIndicator}</span>
                              </CustomTooltip>
                            ) : (
                              <ShoppingBasket className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                        )}

                        {/* Refund Badge - moved after img */}
                        {refundSeq > 0 && (
                          <span className="inline-flex items-center justify-center rounded-md bg-blue-100 text-blue-700 px-1.5 h-5 text-[10px] font-bold shrink-0 whitespace-nowrap" title={`Refund Step ${refundSeq} - ID: ${displayIdForBadge}`}>
                            {refundSeq}. {shortIdBadge}
                          </span>
                        )}

                        <div className="flex flex-col min-w-0 flex-1">
                          {/* Name */}
                          {/* Name - Hidden by default as per user request */}

                          {/* Note */}
                          {txn.note ? (
                            <CustomTooltip content={txn.note}>
                              <span className="text-[1em] text-slate-700 font-bold truncate cursor-help block">
                                {txn.note}
                              </span>
                            </CustomTooltip>
                          ) : (
                            <span className="text-[1em] text-slate-400 italic block">No note</span>
                          )}
                        </div>

                        {/* Copy ID Button - Always Show */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(txn.id);
                            setCopiedId(txn.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className={cn(
                            "flex-shrink-0 ml-auto transition-colors p-1",
                            copiedId === txn.id ? "text-emerald-500" : "text-slate-300 hover:text-slate-500"
                          )}
                          title="Copy ID"
                        >
                          {copiedId === txn.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  }
                  case "note":
                    const linkedIdForCopy = (refundSeq === 2 || refundSeq === 3) ? displayIdForBadge : null;
                    return (
                      <div className="flex items-center gap-1 max-w-[250px] group/note">
                        {/* Linked ID Copy (if exists) */}
                        {linkedIdForCopy && linkedIdForCopy !== txn.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(linkedIdForCopy);
                              setCopiedId(`linked-${txn.id}`);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className={cn(
                              "opacity-0 group-hover/note:opacity-100 transition-opacity p-0.5 hover:bg-blue-50 rounded text-blue-400 hover:text-blue-600",
                              copiedId === `linked-${txn.id}` && "opacity-100 text-emerald-500"
                            )}
                            title={`Copy Linked ID: ${linkedIdForCopy}`}
                          >
                            {copiedId === `linked-${txn.id}` ? <CheckCheck className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                          </button>
                        )}

                        {/* Note Content */}
                        <div className="flex items-center gap-2 truncate flex-1">
                          <span className="truncate text-slate-700 font-medium" title={txn.note ?? ''}>
                            {txn.note}
                          </span>
                          {txn.note && (
                            <CustomTooltip content={<div className="max-w-[300px] whitespace-normal break-words">{txn.note}</div>}>
                              <Info className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            </CustomTooltip>
                          )}
                        </div>

                        {/* Transaction ID Copy */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(txn.id);
                            setCopiedId(txn.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className={cn(
                            "p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 ml-1 transition-colors",
                            copiedId === txn.id && "text-emerald-500"
                          )}
                          title={`Copy Transaction ID: ${txn.id}`}
                        >
                          {copiedId === txn.id ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    );
                  case "category": {
                    // Determine badge color by type
                    let badgeColors = "bg-red-100 text-red-700 ring-red-600/10"; // Default = expense
                    if (txn.type === 'transfer') badgeColors = "bg-sky-100 text-sky-700 ring-sky-700/10";
                    else if (txn.type === 'income' || visualType === 'income') badgeColors = "bg-emerald-100 text-emerald-700 ring-emerald-600/20";
                    else if (txn.type === 'repayment') badgeColors = "bg-orange-100 text-orange-800 ring-orange-600/20";

                    if (!txn.category_name) {
                      if (txn.type === 'repayment') return <div className="flex items-center gap-2 justify-start"><span className="inline-flex items-center justify-center rounded-md bg-orange-100 px-2 py-1 text-[0.9em] font-medium text-orange-800 ring-1 ring-inset ring-orange-600/20 w-[120px]">Repayment</span></div>;
                      if (txn.type === 'transfer') return <div className="flex items-center gap-2 justify-start"><span className="inline-flex items-center justify-center rounded-md bg-blue-100 px-2 py-1 text-[0.9em] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 w-[120px]">Transfer</span></div>;
                      return <div className="flex items-center gap-2 justify-start"><span className="inline-flex items-center justify-center rounded-md bg-red-50 px-2 py-1 text-[0.9em] font-medium text-red-700 ring-1 ring-inset ring-red-600/10 w-[120px]">Uncategorized</span></div>;
                    }
                    return (
                      <CustomTooltip content={txn.category_name ?? "No Category"}>
                        <div className="flex items-center gap-2 justify-start">
                          {/* Category Icon - always show */}
                          {txn.category_logo_url ? (
                            <div className="flex h-6 w-6 items-center justify-center shrink-0">
                              <img src={txn.category_logo_url} alt="" className="h-full w-full object-contain !rounded-none !border-none ring-0 outline-none" />
                            </div>
                          ) : txn.category_icon ? (
                            <span className="text-base shrink-0">{txn.category_icon}</span>
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center bg-slate-100 rounded-full text-xs font-semibold text-slate-600 shrink-0">
                              {txn.category_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {/* Category Badge */}
                          <span className={cn("inline-flex items-center justify-center rounded-md px-2 py-1 text-[0.9em] font-medium ring-1 ring-inset truncate w-[120px]", badgeColors)}>
                            {txn.category_name}
                          </span>
                        </div>
                      </CustomTooltip>
                    )
                  }
                  case "account": {
                    // --- 1. Resolve Entities (Source & Target) ---
                    const sourceName = txn.source_name || txn.account_name || 'Unknown'
                    const sourceIcon = txn.source_logo
                    const sourceId = txnSourceId
                    // In single-table mode, account_id is the source.

                    // Target Parsing
                    let targetName = destNameRaw
                    let targetIcon = txn.destination_logo
                    let targetId = txnDestId
                    let targetType: 'account' | 'person' | 'none' = 'account'
                    let targetLink = targetId ? `/accounts/${targetId}` : null

                    // Check for Person First (Person takes precedence in "Accounts -> People" flow logic usually, or depends on data)
                    const personId = (txn as any).person_id
                    const personNameLink = (txn as any).person_name
                    const personAvatar = (txn as any).person_avatar_url

                    if (personId) {
                      targetType = 'person'
                      targetName = personNameLink || 'Unknown Person'
                      targetIcon = personAvatar
                      targetId = personId
                      targetLink = `/people/${personId}`
                    } else if (targetId) {
                      targetType = 'account'
                      if (targetName === 'Unknown') {
                        const foundAcc = accounts.find(a => a.id === targetId)
                        if (foundAcc) {
                          targetName = foundAcc.name
                          targetIcon = foundAcc.logo_url
                        }
                      }
                      targetLink = `/accounts/${targetId}`
                    } else {
                      targetType = 'none'
                      targetLink = null
                    }

                    // Validation: If Source == Target (Draft Fund Bug or Bad Data), treat Target as None
                    if (sourceId && targetId && sourceId === targetId) {
                      targetType = 'none'
                      targetId = undefined
                      targetLink = null
                    }

                    // --- 2. Resolve Context & View Mode ---
                    // "Smart Context"
                    const isPersonContext = context === 'person' || (Boolean(contextId) && targetType === 'person' && targetId === contextId);
                    const isAccountContext = context === 'account' || (Boolean(contextId) && !isPersonContext);

                    // --- 3. Badges & Tags ---
                    const cycleTag = txn.persisted_cycle_tag
                    const debtTag = targetType === 'person' ? txn.tag : null

                    let cycleLabel = "-"
                    if (sourceId) {
                      const acc = accounts.find(a => a.id === sourceId)
                      if (acc && acc.cashback_config) {
                        const config = parseCashbackConfig(acc.cashback_config)
                        const range = getCashbackCycleRange(config, new Date(txn.occurred_at))
                        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
                        cycleLabel = `${fmt(range.start)} - ${fmt(range.end)}`
                      }
                    }

                    // --- 4. Render Helper for Entity ---
                    // Simplified Entity Renderer that is fully clickable
                    const RenderEntity = ({
                      name,
                      icon,
                      link,
                      isSquare = true,
                      badges = [],
                      contextBadge = null
                    }: {
                      name: string,
                      icon?: string | null,
                      link: string | null,
                      isSquare?: boolean,
                      badges?: React.ReactNode[],
                      contextBadge?: React.ReactNode
                    }) => {
                      const Content = (
                        <div className="flex items-center gap-2 min-w-0 w-full">
                          {/* Icon */}
                          {icon ? (
                            <img src={icon} alt="" className={cn("h-8 w-8 object-contain shrink-0 !rounded-none !border-none ring-0 outline-none", isSquare ? "" : "")} />
                          ) : (
                            <div className={cn("flex h-8 w-8 items-center justify-center bg-slate-100 shrink-0 text-slate-400 !rounded-none !border-none ring-0 outline-none")}>
                              {link?.includes('people') ? <User className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                            </div>
                          )}

                          {/* Name & Badges */}
                          <div className="flex flex-col min-w-0 flex-1 justify-center">
                            <div className="flex items-center gap-1 min-w-0">
                              {contextBadge}
                              <span className="text-[0.85em] font-bold text-slate-700 truncate block" title={name}>
                                {name}
                              </span>
                            </div>
                            {badges.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 mt-0.5">
                                {badges}
                              </div>
                            )}
                          </div>
                        </div>
                      )

                      if (link) {
                        return (
                          <Link href={link} onClick={(e) => e.stopPropagation()} className="block w-full hover:bg-slate-50 rounded-sm transition-colors p-0.5 relative z-20">
                            {Content}
                          </Link>
                        )
                      }
                      return <div className="block w-full p-0.5 opacity-80">{Content}</div>
                    }

                    // Badges Construction
                    const cycleBadge = (cycleLabel && cycleLabel !== '-') ? (
                      <span key="cycle" className="inline-flex items-center rounded-sm bg-purple-100 px-1 py-0.5 text-[0.7em] font-bold text-purple-700 whitespace-nowrap leading-none">
                        {cycleLabel}
                      </span>
                    ) : null

                    const tagBadge = (cycleTag || debtTag) ? (
                      <span key="tag" className="inline-flex items-center rounded-sm bg-teal-100 px-1 py-0.5 text-[0.7em] font-bold text-teal-800 whitespace-nowrap leading-none">
                        {cycleTag || debtTag}
                      </span>
                    ) : null

                    const fromBadge = <span key="from" className="inline-flex items-center rounded-sm bg-orange-100 px-1.5 py-0.5 text-[0.7em] font-extrabold text-orange-700 border border-orange-200">FROM</span>
                    const toBadge = <span key="to" className="inline-flex items-center rounded-sm bg-sky-100 px-1.5 py-0.5 text-[0.7em] font-extrabold text-sky-700 border border-sky-200">TO</span>


                    // --- 5. Main Render Switch ---

                    // SCENARIO 1: VIEWING PERSON PAGE (Context = Person)
                    if (isPersonContext && contextId && personId === contextId) {
                      // We are looking at the Person. 
                      // Show: FROM [Source Account]
                      // Hide: Arrow & Person (Self)

                      return (
                        <div className="flex items-center w-full">
                          <div className="flex-1 min-w-0">
                            <RenderEntity
                              name={sourceName}
                              icon={sourceIcon}
                              link={sourceId ? `/accounts/${sourceId}` : null}
                              badges={[cycleBadge]}
                              contextBadge={fromBadge}
                            />
                          </div>
                        </div>
                      )
                    }

                    // SCENARIO 2: VIEWING ACCOUNT PAGE (Context = Account)
                    if (isAccountContext && contextId) {
                      // Sub-case 2a: Viewing Source Account (Outbound)
                      if (sourceId === contextId) {
                        // Show: TO [Target] (Person or Account)
                        // Hide: Source (Self) & Arrow

                        if (targetType === 'none') {
                          return <span className="text-slate-400 text-xs italic pl-1">Expense / No Target</span>
                        }

                        return (
                          <div className="flex items-center w-full">
                            <div className="flex-1 min-w-0">
                              <RenderEntity
                                name={targetName}
                                icon={targetIcon}
                                link={targetLink}
                                badges={[tagBadge]} // Tags on target
                                contextBadge={toBadge}
                              />
                            </div>
                          </div>
                        )
                      }

                      // Sub-case 2b: Viewing Target Account (Inbound)
                      if (targetType === 'account' && targetId === contextId) {
                        // Show: FROM [Source]
                        // Hide: Target (Self) & Arrow

                        return (
                          <div className="flex items-center w-full">
                            <div className="flex-1 min-w-0">
                              <RenderEntity
                                name={sourceName}
                                icon={sourceIcon}
                                link={sourceId ? `/accounts/${sourceId}` : null}
                                badges={[cycleBadge]}
                                contextBadge={fromBadge}
                              />
                            </div>
                          </div>
                        )
                      }
                    }

                    // SCENARIO 3: STANDARD VIEW (No Context or context mismatch)
                    // Show: [Source] -> [Target]
                    return (
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center w-full">
                        {/* Left: Source */}
                        <div className="min-w-0 w-full overflow-hidden">
                          <RenderEntity
                            name={sourceName}
                            icon={sourceIcon}
                            link={sourceId ? `/accounts/${sourceId}` : null}
                            badges={[cycleBadge]}
                          />
                        </div>

                        {/* Center: Arrow (Only if Target exists) */}
                        <div className="shrink-0 flex justify-center text-slate-400">
                          {targetType !== 'none' && <ArrowRight className="h-4 w-4" />}
                        </div>

                        {/* Right: Target */}
                        <div className="min-w-0 w-full overflow-hidden">
                          {targetType !== 'none' ? (
                            <RenderEntity
                              name={targetName}
                              icon={targetIcon}
                              link={targetLink}
                              badges={[tagBadge]}
                            />
                          ) : (
                            <span className="block w-full"></span> // Spacer
                          )}
                        </div>
                      </div>
                    )

                  }
                  case "tag":
                    return (
                      <div className="flex flex-wrap gap-1 min-w-[180px]">
                        {/* Removed duplicate cycle label here since it's in Account now */}
                        {txn.tag && (
                          <CustomTooltip content={txn.tag}>
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[0.85em] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 cursor-help whitespace-normal break-words">
                              {txn.tag}
                            </span>
                          </CustomTooltip>
                        )}
                        {/* Installment Icon moved here */}
                        {(txn.is_installment || txn.installment_plan_id) && (
                          <Link
                            href="/installments"
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Installment Plan"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Link>
                        )}
                        {!txn.tag && !txn.is_installment && !txn.installment_plan_id && <span className="text-slate-400">-</span>}
                      </div>
                    )
                  case "amount": {
                    const percentDisp = Number(txn.cashback_share_percent ?? 0)
                    const fixedDisp = Number(txn.cashback_share_fixed ?? 0)
                    const displayPercent = percentDisp < 1 && percentDisp > 0 ? percentDisp * 100 : percentDisp

                    return (
                      <div
                        className={cn(
                          "flex flex-col items-end p-1 rounded transition-colors",
                          amountClass,
                          isExcelMode ? "cursor-cell select-none" : "",
                          isExcelMode && selectedCells.has(txn.id) && selectedColumn === 'amount' && "bg-blue-100 ring-1 ring-blue-300"
                        )}
                        onMouseDown={(e) => handleCellMouseDown(txn.id, 'amount', e)}
                        onMouseEnter={() => handleCellMouseEnter(txn.id, 'amount')}
                        onMouseUp={handleCellMouseUp}
                      >
                        <span className={cn("font-bold text-[1.25em]", amountClass)}>{amountValue}</span>
                        {(displayPercent > 0 || fixedDisp > 0) && (
                          <div className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[0.85em] font-bold text-emerald-600 border border-emerald-100 gap-1 mt-0.5 whitespace-nowrap">
                            {displayPercent > 0 && <span>{Number(displayPercent.toFixed(2))}%</span>}
                            {displayPercent > 0 && fixedDisp > 0 && <span>+</span>}
                            {fixedDisp > 0 && <span>{numberFormatter.format(fixedDisp)}</span>}
                            <span className="text-emerald-400 font-medium">Back</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  case "back_info": {
                    // Cashback Info Display (merged initial_back + people_back)
                    const cashbackAmount = Number(txn.bank_back ?? 0) + Number(txn.cashback_share_amount ?? 0)
                    const pRaw = Number(txn.cashback_share_percent ?? 0)
                    const fRaw = Number(txn.cashback_share_fixed ?? 0)
                    if (!pRaw && !fRaw && typeof txn.profit !== 'number') return <span className="text-slate-300">-</span>
                    return (
                      <div className="flex flex-col text-[1em]">
                        {/* Formula on Top */}
                        {(pRaw || fRaw) && (
                          <span className="text-[0.7em] text-slate-500 mb-0.5">
                            {pRaw ? `${(pRaw * 100).toFixed(2)}%` : ''}
                            {pRaw && fRaw ? ' + ' : ''}
                            {fRaw ? numberFormatter.format(fRaw) : ''}
                          </span>
                        )}
                        {/* Sum and Profit on Bottom */}
                        <div className="flex items-center gap-2">
                          {cashbackAmount > 0 && (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <Sigma className="h-3 w-3" />
                              {numberFormatter.format(cashbackAmount)}
                            </span>
                          )}
                          {typeof txn.profit === 'number' && txn.profit !== 0 && (
                            <>
                              {cashbackAmount > 0 && <span className="text-slate-300">;</span>}
                              <span className={`font-bold flex items-center gap-1 ${txn.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                🤑 {numberFormatter.format(txn.profit)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  }
                  // Note: 'initial_back' and 'people_back' columns removed - merged into 'back_info'
                  case "final_price":
                    const percentDisp = Number(txn.cashback_share_percent ?? 0)
                    const fixedDisp = Number(txn.cashback_share_fixed ?? 0)
                    // Display Percent: if rate 0.02 -> 2. If > 1 -> keep as is.
                    const displayPercent = percentDisp < 1 && percentDisp > 0 ? percentDisp * 100 : percentDisp
                    const rate = percentDisp < 1 && percentDisp > 0 ? percentDisp : percentDisp / 100
                    const percentAmount = Math.abs(Number(originalAmount ?? 0)) * rate

                    const finalDisp = Math.round(finalPrice);
                    const hasBack = Math.abs(Number(originalAmount ?? 0)) > finalDisp

                    return (
                      <div
                        className={cn(
                          "flex flex-col items-end p-1 rounded transition-colors",
                          amountClass,
                          isExcelMode ? "cursor-cell select-none" : "",
                          isExcelMode && selectedCells.has(txn.id) && selectedColumn === 'final_price' && "bg-blue-100 ring-1 ring-blue-300"
                        )}
                        onMouseDown={(e) => handleCellMouseDown(txn.id, 'final_price', e)}
                        onMouseEnter={() => handleCellMouseEnter(txn.id, 'final_price')}
                        onMouseUp={handleCellMouseUp}
                      >
                        <CustomTooltip content={
                          <div className="flex flex-col gap-1">
                            <span className="font-bold underline">Equation</span>
                            <span>{numberFormatter.format(baseAmount)} (Amount)</span>
                            <span>- {numberFormatter.format(cashbackAmount)} (Cashback)</span>
                            <hr className="border-slate-500" />
                            <span className="font-bold">= {numberFormatter.format(finalDisp)} (Final Price)</span>
                          </div>
                        }>
                          <span className={cn("font-bold text-[1.25em] cursor-help", amountClass, isVoided && "line-through opacity-50")}>
                            {numberFormatter.format(finalDisp)}
                          </span>
                        </CustomTooltip>

                        {/* Show badges if any logic exists (Percent, Fixed, Profit, BankBack) */}
                        {true && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {/* Profit */}
                            {typeof txn.profit === 'number' && txn.profit !== 0 && (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[0.85em] font-bold text-emerald-600 border border-emerald-100">
                                🤑 {numberFormatter.format(txn.profit)}
                              </span>
                            )}
                            {/* Bank Back */}
                            {typeof txn.bank_back === 'number' && txn.bank_back > 0 && (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[0.85em] font-bold text-blue-600 border border-blue-100">
                                🏦 {numberFormatter.format(txn.bank_back)}
                              </span>
                            )}
                            {/* Cashback Info */}
                            {(displayPercent > 0 || fixedDisp > 0) && (
                              <div className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[0.85em] font-bold text-emerald-600 border border-emerald-100 whitespace-nowrap">
                                {displayPercent > 0 && fixedDisp > 0 ? (
                                  <span>{numberFormatter.format(percentAmount)} + {numberFormatter.format(fixedDisp)}</span>
                                ) : displayPercent > 0 ? (
                                  <span>{displayPercent}% Back</span>
                                ) : (
                                  <span>Fix {numberFormatter.format(fixedDisp)}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  case "id":
                    const isCopied = copiedId === txn.id
                    return (
                      <CustomTooltip content={txn.id}>
                        <div className="flex items-center gap-1.5 max-w-[100px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(txn.id);
                              setCopiedId(txn.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                            title="Copy ID"
                          >
                            {isCopied ? <CheckCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <span className="text-[0.85em] text-slate-400 font-mono cursor-help truncate">
                            {isCopied ? 'Copied!' : `${txn.id.slice(0, 8)}...`}
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



              return (
                <TableRow
                  key={txn.id}
                  className={cn(
                    "border-b-2 border-slate-300 transition-colors text-base",
                    isMenuOpen ? "bg-blue-50" : rowBgColor,
                    !isExcelMode && "hover:bg-slate-50/50"
                  )}
                >
                  {displayedColumns.map(col => {
                    // Sticky Logic for Cells
                    let stickyStyle: React.CSSProperties = { width: columnWidths[col.key], maxWidth: columnWidths[col.key], overflow: 'hidden', whiteSpace: 'nowrap' };
                    let stickyClass = "";

                    // Determine sticky cell background color
                    const getStickyBg = () => {
                      if (isMenuOpen) return "bg-blue-50";
                      if (isInstallmentRow && !isVoided) return "bg-amber-50";
                      if ((effectiveStatus === 'pending' || effectiveStatus === 'waiting_refund') && !isVoided) return "bg-emerald-50";
                      return "bg-white";
                    };
                    const stickyBg = getStickyBg();

                    if (col.key === 'date') {
                      stickyClass = cn("sticky left-0 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]", stickyBg);
                    } else if (col.key === 'shop') {
                      // Shop (Notes) column sticky positioning
                      let left = 0;
                      if (visibleColumns.date) left += columnWidths.date;
                      // Note: 'type' column was removed, it's now merged into date
                      stickyStyle.left = left;
                      stickyClass = cn("sticky z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]", stickyBg);
                    }

                    return (
                      <TableCell
                        key={`${txn.id}-${col.key}`}
                        className={cn(
                          `border-r-2 border-slate-300 ${col.key === "amount" ? "text-right" : ""} ${col.key === "amount" ? "font-bold" : ""
                          } ${col.key === "amount" ? amountClass : ""} ${col.key === "task" ? "" : voidedTextClass} truncate`,
                          stickyClass
                        )}
                        style={stickyStyle}
                      >
                        {renderCell(col.key)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody >
          {
            selection.size > 0 && (
              <TableFooter>
                {summary.incomeSummary.sumAmount > 0 && (
                  <TableRow className="bg-emerald-50">
                    <TableCell
                      colSpan={1 + displayedColumns.findIndex(c => c.key === 'amount')}
                      className="font-bold text-emerald-700 border-r text-right"
                    >
                      Total Income
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700 border-r">{numberFormatter.format(summary.incomeSummary.sumAmount)}</TableCell>
                    <TableCell colSpan={displayedColumns.length - 1 - displayedColumns.findIndex(c => c.key === 'amount')}></TableCell>
                  </TableRow>
                )}
                {summary.expenseSummary.sumAmount > 0 && (
                  <TableRow className="bg-red-50">
                    <TableCell
                      colSpan={1 + displayedColumns.findIndex(c => c.key === 'amount')}
                      className="font-bold text-red-500 border-r text-right"
                    >
                      Total Expense
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-500 border-r">{numberFormatter.format(summary.expenseSummary.sumAmount)}</TableCell>
                    <TableCell colSpan={displayedColumns.length - 1 - displayedColumns.findIndex(c => c.key === 'amount')}></TableCell>
                  </TableRow>
                )}
              </TableFooter>
            )
          }
        </Table>
      </div>

      {/* Footer - Outside scroll container */}
      {showPagination && (
        <div className="sticky bottom-0 z-20 flex-none flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] text-sm">
          <div className="flex items-center gap-4">
            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                className="rounded p-1 hover:bg-slate-100 disabled:opacity-50"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                title="Previous Page"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>
              <div className="flex items-center gap-1">
                <span className="rounded px-2 py-1 text-xs font-semibold bg-blue-600 text-white">{currentPage}</span>
                <span className="text-xs text-slate-500">/ {Math.max(1, Math.ceil(displayedTransactions.length / pageSize))}</span>
              </div>
              <button
                className="rounded p-1 hover:bg-slate-100 disabled:opacity-50"
                disabled={currentPage >= Math.ceil(displayedTransactions.length / pageSize)}
                onClick={() => setCurrentPage(currentPage + 1)}
                title="Next Page"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600 rotate-180" />
              </button>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 rounded border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              <option value={10}>10 / p</option>
              <option value={20}>20 / p</option>
              <option value={50}>50 / p</option>
              <option value={100}>100 / p</option>
            </select>
            <div className="h-4 w-px bg-slate-200" />

            {/* Font Size Controls */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 mr-1">Text:</span>
              <button
                onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                className="rounded p-1 hover:bg-slate-100 disabled:opacity-50"
                title="Decrease font size"
                disabled={fontSize <= 10}
              >
                <Minus className="h-3.5 w-3.5 text-slate-600" />
              </button>
              <span className="text-xs font-semibold w-10 text-center tabular-nums">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(20, fontSize + 1))}
                className="rounded p-1 hover:bg-slate-100 disabled:opacity-50"
                title="Increase font size"
                disabled={fontSize >= 20}
              >
                <Plus className="h-3.5 w-3.5 text-slate-600" />
              </button>
            </div>
            <div className="h-4 w-px bg-slate-200" />

            <button
              onClick={() => {
                setSortState({ key: 'date', dir: 'desc' });
                updateSelection(new Set());
                resetColumns();
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 text-slate-600 hover:text-red-600 transition-colors pointer-events-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Reset</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-slate-500 font-medium text-xs">
              Showing <span className="text-slate-900 font-bold">{Math.min((currentPage - 1) * pageSize + 1, displayedTransactions.length)}</span> - <span className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, displayedTransactions.length)}</span> of <span className="text-slate-900 font-bold">{displayedTransactions.length}</span> rows
            </p>
          </div>
        </div>
      )}


      {
        isCustomizerOpen && (
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
                      className="rounded border-gray-300"
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
        )
      }

      {
        editingTxn && editingInitialValues && (
          <AddTransactionDialog
            isOpen={!!editingTxn}
            onOpenChange={(open) => {
              if (!open) setEditingTxn(null)
            }}
            mode="edit"
            transactionId={editingTxn.id}
            initialValues={editingInitialValues}
            accounts={accounts}
            categories={categories}
            people={people}
            shops={shops}
            triggerContent={<span className="hidden"></span>}
          />
        )
      }

      {
        confirmVoidTarget && createPortal(
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
                  className="rounded-md px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                  onClick={closeVoidDialog}
                  disabled={isVoiding}
                >
                  Keep
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
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
        )
      }

      {
        confirmCancelTarget && createPortal(
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
                  className="flex-1 rounded-md bg-slate-100 px-4 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  onClick={() => setConfirmCancelTarget(null)}
                  disabled={isVoiding}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-md bg-amber-500 px-4 py-1 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                  onClick={() => handleCancelOrderConfirm(false)}
                  disabled={isVoiding}
                >
                  {isVoiding ? 'Processing...' : 'Pending (Wait)'}
                </button>
                <button
                  className="flex-1 rounded-md bg-emerald-600 px-4 py-1 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  onClick={() => handleCancelOrderConfirm(true)}
                  disabled={isVoiding}
                >
                  {isVoiding ? 'Processing...' : 'Received (Instant)'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
      {
        refundFormTxn &&
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
        })()
      }
      {
        bulkDialog?.open &&
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
                {bulkDialog.mode === 'void' ? 'Bulk Void' : bulkDialog.mode === 'restore' ? 'Bulk Restore' : 'Permanent Delete'}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {bulkDialog.mode === 'void'
                  ? `Are you sure you want to void ${selection.size} transactions?`
                  : bulkDialog.mode === 'restore'
                    ? `Are you sure you want to restore ${selection.size} transactions?`
                    : `Are you sure you want to PERMANENTLY DELETE ${selection.size} transactions? This cannot be undone.`}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-md px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                  onClick={() => {
                    if (isVoiding || isRestoring || isDeleting) {
                      stopBulk.current = true
                    } else {
                      setBulkDialog(null)
                    }
                  }}
                >
                  {isVoiding || isRestoring || isDeleting ? 'Stop' : 'Cancel'}
                </button>
                <button
                  className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70 ${bulkDialog.mode === 'restore' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                    }`}
                  onClick={() => executeBulk(bulkDialog.mode)}
                  disabled={isVoiding || isRestoring || isDeleting}
                >
                  {(isVoiding || isRestoring || isDeleting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {bulkDialog.mode === 'void' ? 'Void' : bulkDialog.mode === 'restore' ? 'Restore' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
      <ConfirmRefundDialog
        open={confirmRefundOpen}
        onOpenChange={setConfirmRefundOpen}
        transaction={confirmRefundTxn}
        accounts={accounts}
      />
      <TransactionHistoryModal
        transactionId={historyTarget?.id ?? ''}
        transactionNote={historyTarget?.note}
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
      {
        cloningTxn && (
          <AddTransactionDialog
            isOpen={!!cloningTxn}
            onOpenChange={(open) => {
              if (!open) setCloningTxn(null)
            }}
            accounts={accounts}
            categories={categories}
            people={people}
            shops={shops}
            cloneInitialValues={buildEditInitialValues(cloningTxn)}
            triggerContent={<span className="hidden"></span>}
          />
        )
      }
      <ExcelStatusBar
        totalIn={selectedStats.totalIn}
        totalOut={selectedStats.totalOut}
        average={selectedStats.average}
        count={selectedStats.count}
        isVisible={!!isExcelMode && selectedCells.size > 0}
      />
    </div >
  )
}
