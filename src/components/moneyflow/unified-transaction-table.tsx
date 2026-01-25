"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { createPortal } from "react-dom"
import {
  ArrowUpDown,
  Plus,
  Minus,
  X,
  CreditCard,
  Check,
  Copy,
  CheckCheck,
  Sigma,
  CopyPlus,
  Link2,
  Info,
  ShoppingBasket,
  Wallet,
  ArrowUp,
  ArrowDown,
  Trash2,
  RotateCcw,
  Ban,
  Loader2,
  History,
  ChevronRight,
  ChevronLeft,
  Edit,
  Clock,
  Undo2,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  RefreshCcw,
  MoveRight,
  Wrench,
  Pencil,
  ClipboardPaste,
  Settings2,
} from "lucide-react"
import { ColumnCustomizer } from "./column-customizer"

import { buildEditInitialValues, parseMetadata } from '@/lib/transaction-mapper';

import { MobileTransactionsSimpleList } from "./mobile/MobileTransactionsSimpleList"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { RefundsDialogTrigger } from './toolbar/RefundsDialogTrigger'

import { toast } from "sonner"
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import { createClient } from '@/lib/supabase/client'
import { Account, Category, Person, Shop, TransactionWithDetails } from "@/types/moneyflow.types"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetClose,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TransactionForm, TransactionFormValues } from "./transaction-form"
import {
  restoreTransaction,
  deleteTransaction,
  getTransactionById,
} from "@/services/transaction.service"
import {
  voidTransactionAction,
} from "@/actions/transaction-actions"
import { REFUND_PENDING_ACCOUNT_ID } from "@/constants/refunds"
import { generateTag } from "@/lib/tag"
import { cn } from "@/lib/utils"
import { parseCashbackConfig, getCashbackCycleRange } from '@/lib/cashback'
import { formatCycleTag } from '@/lib/cycle-utils'
import { normalizeMonthTag } from '@/lib/month-tag'
import { ConfirmRefundDialogV2 } from "./confirm-refund-dialog-v2"

import { RequestRefundDialog } from "./request-refund-dialog"
import { TransactionHistoryModal } from "./transaction-history-modal"

import { AddTransactionDialog } from "./add-transaction-dialog"
import { cancelOrder } from "@/actions/transaction-actions"
import { ExcelStatusBar } from "@/components/ui/excel-status-bar"
import { ColumnKey } from "@/components/app/table/transactionColumns"



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
  onSelectTxn?: (id: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
  accounts?: Account[]
  categories?: Category[]
  people?: Person[]
  shops?: Shop[]
  activeTab?: 'active' | 'void' | 'pending'
  hiddenColumns?: ColumnKey[]
  columnOrder?: ColumnKey[]
  onBulkActionStateChange?: (state: BulkActionState) => void
  sortState?: { key: SortKey; dir: SortDir }
  onSortChange?: (state: { key: SortKey; dir: SortDir }) => void
  context?: 'account' | 'person' | 'general'
  isExcelMode?: boolean
  showPagination?: boolean
  currentPage?: number
  totalPages?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  fontSize?: number
  onFontSizeChange?: (size: number) => void
  onEdit?: (txn: TransactionWithDetails) => void
  onDuplicate?: (txn: TransactionWithDetails) => void
  loadingIds?: Set<string>
}




export function UnifiedTransactionTable({
  data,
  transactions,
  accountType,
  accountId,
  contextId,
  selectedTxnIds,
  onSelectionChange,
  onSelectTxn,
  onSelectAll,
  accounts = [],
  categories = [],
  people = [],
  shops = [],
  activeTab,
  hiddenColumns = [],
  columnOrder,
  onBulkActionStateChange,
  sortState: externalSortState,
  onSortChange,
  context,
  isExcelMode = false,
  showPagination = true,
  currentPage: propCurrentPage,
  totalPages,
  pageSize: propPageSize,
  onPageChange,
  onPageSizeChange,
  fontSize: externalFontSize,
  onFontSizeChange,
  onEdit: externalOnEdit,
  onDuplicate: externalOnDuplicate,
  loadingIds,
}: UnifiedTransactionTableProps) {
  const [tableData, setTableData] = useState<TransactionWithDetails[]>(() => data ?? transactions ?? [])
  const [updatingTxnIds, setUpdatingTxnIds] = useState<Set<string>>(new Set())

  // Refund/Cancel Dialog State
  const [isRefundOpen, setIsRefundOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState<TransactionWithDetails | null>(null)
  const [refundType, setRefundType] = useState<'refund' | 'cancel'>('refund')

  // Confirm Refund Dialog State
  const [confirmRefundOpen, setConfirmRefundOpen] = useState(false)
  const [confirmRefundTxn, setConfirmRefundTxn] = useState<TransactionWithDetails | null>(null)

  useEffect(() => {
    setTableData(data ?? transactions ?? [])
  }, [data, transactions])

  const handleOptimisticUpdate = useCallback((optimisticTxn: TransactionWithDetails) => {
    // Safety check: if no ID, cannot update
    if (!optimisticTxn?.id) {
      console.warn('[Optimistic Update] Transaction has no ID, skipping update');
      return;
    }

    setUpdatingTxnIds(prev => {
      const next = new Set(prev)
      next.add(optimisticTxn.id)
      return next
    })

    setTableData(prev => {
      const index = prev.findIndex(t => t.id === optimisticTxn.id)
      if (index >= 0) {
        const next = [...prev]
        next[index] = optimisticTxn
        return next
      } else {
        return [optimisticTxn, ...prev]
      }
    })

    setTimeout(() => {
      setUpdatingTxnIds(prev => {
        const next = new Set(prev)
        next.delete(optimisticTxn.id)
        return next
      })
    }, 2000)
  }, [])
  const defaultColumns: ColumnConfig[] = [
    { key: "date", label: "Date", defaultWidth: 160, minWidth: 140 },
    { key: "shop", label: "Note", defaultWidth: 250, minWidth: 180 },
    { key: "people", label: "People", defaultWidth: 150, minWidth: 120 },
    { key: "account", label: "Flow & Entity", defaultWidth: 280, minWidth: 220 },
    { key: "amount", label: "BASE", defaultWidth: 120, minWidth: 100 },
    { key: "final_price", label: "Net Value", defaultWidth: 120, minWidth: 100 },
    { key: "category", label: "Category", defaultWidth: 180 },
    { key: "id", label: "ID", defaultWidth: 100 },
    { key: "actions", label: "Action", defaultWidth: 80, minWidth: 60 },
  ]
  const [isColumnCustomizerOpen, setIsColumnCustomizerOpen] = useState(false)

  // Initialize with prop or default
  const [customColumnOrder, setCustomColumnOrder] = useState<ColumnKey[]>(() =>
    columnOrder ?? defaultColumns.map(c => c.key)
  )

  const mobileColumnOrder: ColumnKey[] = ["date", "shop", "category", "account", "amount"]
  const router = useRouter()
  // Internal state removed for activeTab, now using prop with fallback
  const lastSelectedIdRef = useRef<string | null>(null)
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    const initial: Record<ColumnKey, boolean> = {
      date: true,
      shop: true,
      note: false,
      category: false, // Merged into Shop (inline badge)
      tag: false,
      account: true,
      amount: true,
      final_price: true,
      back_info: false,
      id: false,
      people: false,
      actions: true,
    }

    if (hiddenColumns.length > 0) {
      hiddenColumns.forEach(col => {
        initial[col] = false
      })
    }

    return initial
  })
  // ... (skipping some lines for brevity in replacing, but need to be careful with context)
  // Actually I will target the defaultColumns block first.
  const [isMobile, setIsMobile] = useState(false)
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    const map = {} as Record<ColumnKey, number>
    defaultColumns.forEach(col => {
      map[col.key] = col.defaultWidth
    })
    return map
  })

  // --- Persistence Logic ---
  useEffect(() => {
    // Load saved settings
    try {
      const savedOrder = localStorage.getItem('mf_v3_col_order');
      const savedVis = localStorage.getItem('mf_v3_col_vis');
      const savedWidths = localStorage.getItem('mf_v3_col_width');

      if (savedOrder) {
        setCustomColumnOrder(JSON.parse(savedOrder));
      }
      if (savedVis) {
        setVisibleColumns(prev => ({ ...prev, ...JSON.parse(savedVis) }));
      }
      if (savedWidths) {
        setColumnWidths(prev => ({ ...prev, ...JSON.parse(savedWidths) }));
      }
    } catch (e) {
      console.error("Failed to load column settings", e);
    }
  }, []);

  useEffect(() => {
    if (customColumnOrder.length > 0)
      localStorage.setItem('mf_v3_col_order', JSON.stringify(customColumnOrder));
  }, [customColumnOrder]);

  useEffect(() => {
    localStorage.setItem('mf_v3_col_vis', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('mf_v3_col_width', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // --- Excel Mode State & Logic ---
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [selectedColumn, setSelectedColumn] = useState<ColumnKey | null>(null)
  const [isSelectingCells, setIsSelectingCells] = useState(false)
  const [selectionStartId, setSelectionStartId] = useState<string | null>(null)

  const handleCellMouseDown = (txnId: string, colKey: ColumnKey, e: React.MouseEvent) => {
    if (!isExcelMode) return

    // Only allow selection on amount (VALUE) column
    if (colKey !== 'amount') return

    if (!e.shiftKey && !e.ctrlKey) {
      // Clear previous if not multi-select modifier
      setSelectedCells(new Set([txnId]))
      setSelectionStartId(txnId)
      setSelectedColumn(colKey) // Lock selection to this column type
      setIsSelectingCells(true)
    } else if (e.shiftKey && selectionStartId && selectedColumn === colKey) {
      // Shift select range
      const startIdx = tableData.findIndex(t => t.id === selectionStartId)
      const currentIdx = tableData.findIndex(t => t.id === txnId)
      if (startIdx !== -1 && currentIdx !== -1) {
        const min = Math.min(startIdx, currentIdx)
        const max = Math.max(startIdx, currentIdx)
        const rangeIds = tableData.slice(min, max + 1).map(t => t.id)
        setSelectedCells(prev => {
          const next = new Set(prev)
          rangeIds.forEach(id => next.add(id))
          return next
        })
      }
    } else if (e.ctrlKey) {
      // Toggle single
      setSelectedCells(prev => {
        const next = new Set(prev)
        if (next.has(txnId)) next.delete(txnId)
        else next.add(txnId)
        return next
      })
      setSelectionStartId(txnId)
      setSelectedColumn(colKey)
    }

    // PREVENT NATIVE TEXT SELECTION
    e.preventDefault()
  }

  const handleCellMouseEnter = (txnId: string, colKey: ColumnKey) => {
    if (isExcelMode && isSelectingCells && selectionStartId && selectedColumn === colKey) {
      const startIdx = tableData.findIndex(t => t.id === selectionStartId)
      const currentIdx = tableData.findIndex(t => t.id === txnId)
      if (startIdx !== -1 && currentIdx !== -1) {
        const min = Math.min(startIdx, currentIdx)
        const max = Math.max(startIdx, currentIdx)
        const rangeIds = tableData.slice(min, max + 1).map(t => t.id)
        setSelectedCells(new Set(rangeIds))
      }
    }
  }

  const handleCellMouseUp = () => {
    setIsSelectingCells(false)
  }

  // Clear selection when mode changes
  useEffect(() => {
    if (!isExcelMode) {
      setSelectedCells(new Set())
      setSelectedColumn(null)
      setIsSelectingCells(false)
    }
  }, [isExcelMode])

  const selectedStats = useMemo(() => {
    if (selectedCells.size === 0 || !selectedColumn) return { totalIn: 0, totalOut: 0, average: 0, count: 0 }

    let totalIn = 0;
    let totalOut = 0;
    let count = 0;

    selectedCells.forEach(id => {
      const txn = tableData.find(t => t.id === id)
      if (txn) {
        let val = 0;
        if (selectedColumn === 'amount') {
          // Use final price if has cashback, otherwise use original amount
          const originalAmount = typeof txn.original_amount === "number" ? txn.original_amount : txn.amount
          const percentDisp = Number(txn.cashback_share_percent ?? 0)
          const fixedDisp = Number(txn.cashback_share_fixed ?? 0)
          const hasCashback = percentDisp > 0 || fixedDisp > 0

          if (hasCashback) {
            const rate = percentDisp > 1 ? percentDisp / 100 : percentDisp
            const cashbackCalc = (Math.abs(Number(originalAmount ?? 0)) * rate) + fixedDisp
            const cashbackAmount = txn.cashback_share_amount ?? (cashbackCalc > 0 ? cashbackCalc : 0)
            const baseAmount = Math.abs(Number(originalAmount ?? 0))
            const finalDisp = (typeof txn.final_price === 'number')
              ? Math.abs(txn.final_price)
              : (cashbackAmount > baseAmount ? baseAmount : Math.max(0, baseAmount - cashbackAmount))

            // Force sign based on type if available, otherwise trust amount
            if (['expense', 'debt', 'transfer'].includes(txn.type)) val = -finalDisp
            else if (['income', 'repayment'].includes(txn.type)) val = finalDisp
            else val = (originalAmount ?? 0) < 0 ? -finalDisp : finalDisp
          } else {
            // Force sign based on type 
            const absVal = Math.abs(originalAmount ?? 0)
            if (['expense', 'debt', 'transfer'].includes(txn.type)) val = -absVal
            else if (['income', 'repayment'].includes(txn.type)) val = absVal
            else val = originalAmount ?? 0
          }
        }

        if (val > 0) totalIn += val
        else totalOut += Math.abs(val)
        count++
      }
    })

    return {
      totalIn,
      totalOut,
      average: count > 0 ? (totalIn - totalOut) / count : 0,
      count
    }
  }, [selectedCells, selectedColumn, tableData])

  useEffect(() => {
    setVisibleColumns(prev => {
      const next = { ...prev }
      if (hiddenColumns.length > 0) {
        hiddenColumns.forEach(col => {
          next[col] = false
        })
      }
      next.date = hiddenColumns.includes('date') ? false : true
      next.shop = hiddenColumns.includes('shop') ? false : true
      next.category = hiddenColumns.includes('category') ? false : true
      next.account = hiddenColumns.includes('account') ? false : true
      next.amount = hiddenColumns.includes('amount') ? false : true
      next.id = hiddenColumns.includes('id') ? false : false
      // Simple deep equality check to prevent infinite loop
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return prev
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(hiddenColumns), isMobile])

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768)
      }
    }
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

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
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null)
  const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
  const [confirmCancelTarget, setConfirmCancelTarget] = useState<TransactionWithDetails | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [historyTarget, setHistoryTarget] = useState<TransactionWithDetails | null>(null)
  const [cloningTxn, setCloningTxn] = useState<TransactionWithDetails | null>(null)
  const [confirmDeletingTarget, setConfirmDeletingTarget] = useState<TransactionWithDetails | null>(null)

  useEffect(() => {
    if (!actionMenuOpen) return
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-action-menu]') || target.closest('[data-action-trigger]')) return
      setActionMenuOpen(null)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [actionMenuOpen])

  const [statusOverrides, setStatusOverrides] = useState<Record<string, TransactionWithDetails['status']>>({})
  const [refundFormTxn, setRefundFormTxn] = useState<TransactionWithDetails | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [refundFormStage] = useState<'request' | 'confirm'>('request')
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

  const pageSize = propPageSize ?? internalPageSize
  const currentPage = propCurrentPage ?? internalCurrentPage

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
    if (!propCurrentPage) {
      setCurrentPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, transactions, accountType, accountId, sortState, context])



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
          // For an expense (cancel target), account_id is the source.
          const targetAccountId = confirmCancelTarget.account_id

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

  const handleDuplicate = (txn: TransactionWithDetails) => {
    if (externalOnDuplicate) {
      externalOnDuplicate(txn);
      return;
    }
    setCloningTxn(txn);
    setActionMenuOpen(null);
  };

  const handleEdit = (txn: TransactionWithDetails) => {
    if (externalOnEdit) {
      externalOnEdit(txn);
      return;
    }
    setEditingTxn(txn);
    setActionMenuOpen(null);
  };

  const handleSingleDeleteConfirm = async () => {
    if (!confirmDeletingTarget) return
    setIsDeleting(true)
    try {
      const ok = await deleteTransaction(confirmDeletingTarget.id)
      if (ok) {
        setConfirmDeletingTarget(null)
        router.refresh()
      } else {
        setVoidError('Failed to delete transaction.')
      }
    } catch (err: any) {
      setVoidError(err.message || 'Failed to delete transaction.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenLinkedDebt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const txn = await getTransactionById(id);
      if (txn) {
        setEditingTxn(txn);
      } else {
        toast.error("Linked transaction not found.");
      }
    } catch (err) {
      console.error("Failed to fetch linked transaction", err);
      toast.error("Failed to load linked transaction.");
    }
  };

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
        } catch {
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
    onSelectAll?.(checked)
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
    onSelectTxn?.(txnId, checked)
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

  const renderActionMenuItems = (
    txn: TransactionWithDetails,
    isVoided: boolean,
    variant: 'popover' | 'sheet'
  ) => {
    const isSheet = variant === 'sheet'
    const isPendingRefund = txn.account_id === REFUND_PENDING_ACCOUNT_ID
    const hasRefundRequest = (txn.metadata as any)?.has_refund_request || (txn.metadata as any)?.refund_request_id
    const baseItemClass = isSheet
      ? "flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700"
      : "flex w-full items-center gap-2 rounded px-3 py-1 text-left hover:bg-slate-50"
    const dangerItemClass = isSheet
      ? `${baseItemClass} text-rose-600 hover:bg-rose-50`
      : `${baseItemClass} text-red-600 hover:bg-red-50`
    const successItemClass = isSheet
      ? `${baseItemClass} text-emerald-700 hover:bg-emerald-50`
      : `${baseItemClass} text-green-700 hover:bg-green-50`
    const neutralItemClass = isSheet
      ? `${baseItemClass} text-slate-700 hover:bg-slate-50`
      : `${baseItemClass} text-slate-600 hover:bg-slate-50`
    const divider = isSheet
      ? <div className="h-px bg-slate-100" />
      : <hr className="my-1 border-slate-200" />

    if (currentTab === 'void' || isVoided) {
      return (
        <>
          <button
            className={`${successItemClass} disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={isRestoring}
            onClick={event => {
              event.stopPropagation();
              handleRestore(txn);
              setActionMenuOpen(null);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
          </button>

          {divider}

          {(txn.history_count || 0) > 0 && (
            <button
              className={neutralItemClass}
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
      )
    }

    return (
      <>
        <button
          className={baseItemClass}
          onClick={event => {
            event.stopPropagation();
            handleEdit(txn);
            setActionMenuOpen(null);
          }}
        >
          <Pencil className="h-4 w-4" />
          <span>Edit</span>
        </button>
        <button
          className={baseItemClass}
          onClick={event => {
            event.stopPropagation();
            handleDuplicate(txn);
            setActionMenuOpen(null);
          }}
        >
          <ClipboardPaste className="h-4 w-4" />
          <span>Duplicate</span>
        </button>
        <button
          className={dangerItemClass}
          onClick={event => {
            event.stopPropagation();
            setConfirmVoidTarget(txn);
            setActionMenuOpen(null);
          }}
        >
          <Ban className="h-4 w-4" />
          <span>Void</span>
        </button>

        {/* Refund & Cancel Actions - Restored */}
        {!isPendingRefund && txn.type === 'expense' && (
          <>
            <button
              className={`${neutralItemClass} ${hasRefundRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!hasRefundRequest}
              onClick={event => {
                event.stopPropagation();
                setRefundTarget(txn);
                setRefundType('refund');
                setIsRefundOpen(true);
                setActionMenuOpen(null);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              <span>{hasRefundRequest ? 'Refund Requested' : 'Request Refund'}</span>
            </button>
            <button
              className={`${dangerItemClass} ${hasRefundRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!hasRefundRequest}
              onClick={event => {
                event.stopPropagation();
                // For Cancel Order, we can reuse the dialog or call specialized handler
                // If RequestRefundDialog doesn't support 'type', we might need to adjust it
                // But for now, let's open it as refund but maybe pre-set
                // Actually, let's use the same dialog but with a title change if possible
                setRefundTarget(txn);
                setRefundType('cancel');
                setIsRefundOpen(true);
                setActionMenuOpen(null);
              }}
            >
              <Ban className="h-4 w-4" />
              <span>{hasRefundRequest ? 'Order Cancelled' : 'Cancel Order (100%)'}</span>
            </button>
          </>
        )}
        <button
          className={dangerItemClass}
          onClick={event => {
            event.stopPropagation();
            setConfirmDeletingTarget(txn);
            setActionMenuOpen(null);
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </button>

        {divider}

        {(txn.history_count || 0) > 0 && (
          <button
            className={neutralItemClass}
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
        {/* Request Refund Dialog */}
      </>
    )
  }


  const renderRowActions = (txn: TransactionWithDetails, isVoided: boolean) => {
    const isMenuOpen = actionMenuOpen === txn.id

    if (isMobile) {
      return (
        <Sheet open={isMenuOpen} onOpenChange={(open) => setActionMenuOpen(open ? txn.id : null)}>
          <SheetTrigger asChild>
            <button
              id={`action-btn-${txn.id}`}
              type="button"
              data-action-trigger
              className="inline-flex items-center justify-center rounded-md p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              disabled={isExcelMode}
              onClick={event => {
                event.stopPropagation()
                setActionMenuOpen(isMenuOpen ? null : txn.id)
              }}
            >
              <Wrench className="h-4 w-4 pointer-events-none" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="p-0 rounded-t-2xl w-full"
            showClose={false}
            data-action-menu
            onPointerDownOutside={() => setActionMenuOpen(null)}
            onEscapeKeyDown={() => setActionMenuOpen(null)}
          >
            <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0 px-4 py-3 border-b border-slate-200 text-left">
              <SheetTitle className="text-sm font-semibold text-slate-900">Quick actions</SheetTitle>
              <SheetClose asChild>
                <button
                  type="button"
                  className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </SheetHeader>
            <div className="flex flex-col">
              {renderActionMenuItems(txn, isVoided, 'sheet')}
            </div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <div className="flex items-center gap-1" data-action-menu-wrapper onClick={(e) => e.stopPropagation()}>
        {/* Quick Actions */}
        <button
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          onClick={(e) => { e.stopPropagation(); handleEdit(txn); }}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <CustomTooltip content="Duplicate">
          <button
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDuplicate(txn); }}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
          </button>
        </CustomTooltip>

        <Popover open={isMenuOpen} onOpenChange={(open) => setActionMenuOpen(open ? txn.id : null)}>
          <PopoverTrigger asChild>
            <button
              id={`action-btn-${txn.id}`}
              type="button"
              data-action-trigger
              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              disabled={isExcelMode}
              onClick={event => {
                event.stopPropagation()
              }}
            >
              <Wrench className="h-3.5 w-3.5 pointer-events-none" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-48 p-1 z-[100]"
            align="end"
            side="bottom"
            sideOffset={5}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col">
              {renderActionMenuItems(txn, isVoided, 'popover')}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )

  }



  const effectiveColumnOrder = columnOrder ?? customColumnOrder
  const displayedColumns = useMemo(() => {
    if (isMobile) {
      return mobileColumnOrder.map(key => defaultColumns.find(col => col.key === key)).filter(Boolean).filter(col => visibleColumns[col!.key]) as ColumnConfig[]
    }

    return effectiveColumnOrder
      .map(key => defaultColumns.find(col => col.key === key))
      .filter((col): col is ColumnConfig => !!col && visibleColumns[col.key] !== false)
  }, [isMobile, effectiveColumnOrder, visibleColumns, mobileColumnOrder, defaultColumns])

  if (tableData.length === 0 && activeTab === 'active') {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>No transactions yet.</p>
        <p className="text-sm mt-2">Add your first transaction to get started.</p>
      </div>
    );
  }

  const isAllSelected = displayedTransactions.length > 0 && selection.size >= displayedTransactions.length

  return (
    <div className="relative flex flex-col w-full h-full min-h-0">
      <div className={cn(
        "relative w-full rounded-xl border border-slate-200 bg-card shadow-sm transition-colors duration-300 flex flex-col h-full min-h-0",
        isExcelMode && "border-emerald-500 shadow-emerald-100 ring-4 ring-emerald-50"
      )} style={{} as React.CSSProperties}>
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto">
          <MobileTransactionsSimpleList
            transactions={paginatedTransactions}
            categories={categories}
            selectedTxnIds={selection}
            onSelectTxn={(id, selected) => handleSelectOne(id, selected)}
            renderActions={isMobile ? (txn) => renderRowActions(txn, (statusOverrides[txn.id] ?? txn.status) === 'void') : undefined}
            onRowClick={(txn) => {
              if (isExcelMode) return;
              handleEdit(txn);
            }}
            onCopyId={(id) => {
              navigator.clipboard.writeText(id)
              toast.success("Transaction ID copied")
            }}
            formatters={{
              currency: (val) => numberFormatter.format(val),
              date: formattedDate
            }}
          />
        </div>
        {!isMobile && (
          <div className="hidden md:block flex-1 min-h-0 overflow-auto w-full h-full bg-white relative" style={{ scrollbarGutter: 'stable' }}>
            <table
              className="w-full caption-bottom text-sm border-collapse min-w-[800px] lg:min-w-0"
              onMouseUp={handleCellMouseUp}
              onMouseLeave={handleCellMouseUp}
            >
              <TableHeader className="sticky top-0 z-50 bg-gradient-to-b from-slate-50 to-white backdrop-blur-sm border-b-2 border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                <TableRow className="hover:bg-transparent border-0">
                  {displayedColumns.map(col => {
                    // Sticky Logic Removed Personally by User Request
                    // "Mobile Layout bỏ freeze cột (bỏ cả Web luôn)" -> remove sticky classes
                    const stickyClass = "";
                    const stickyStyle: React.CSSProperties = { width: columnWidths[col.key] };

                    const isMobileCategoryDate = isMobile && col.key === 'category'
                    const columnLabel = isMobileCategoryDate ? 'Category / Date' : col.label

                    return (
                      <TableHead
                        key={col.key}
                        className={cn(
                          "border-r border-slate-200 bg-transparent text-slate-700 whitespace-nowrap sticky top-0 z-40 font-semibold",
                          // Ensure higher z-index for left-sticky columns to overlap standard headers during horizontal scroll
                          (stickyStyle.left !== undefined) && "z-60",
                          stickyClass
                        )}
                        style={stickyStyle}
                      >
                        {col.key === 'category' ? (
                          <span>{columnLabel}</span>
                        ) : col.key === 'date' || isMobileCategoryDate ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={isAllSelected}
                              onChange={e => handleSelectAll(e.target.checked)}
                              disabled={isExcelMode}
                            />
                            <button
                              className="flex items-center gap-1 group"
                              onClick={() => {
                                const nextDir =
                                  sortState.key === 'date' ? (sortState.dir === 'asc' ? 'desc' : 'asc') : 'desc'
                                setSortState({ key: 'date', dir: nextDir })
                              }}
                            >
                              {columnLabel}
                              {sortState.key === 'date' ? (
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
                            {columnLabel}
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
                        ) : col.key === 'actions' ? (
                          <div className="flex items-center justify-center w-full relative group">
                            <span className="mr-6">{columnLabel}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setIsColumnCustomizerOpen(true)
                              }}
                              className="absolute right-0 p-1.5 hover:bg-slate-300 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Customize Columns"
                            >
                              <Settings2 className="h-3.5 w-3.5 text-slate-600" />
                            </button>
                          </div>
                        ) : (
                          columnLabel
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
                  const isSelected = selection.has(txn.id)
                  const effectiveStatus = statusOverrides[txn.id] ?? txn.status
                  const isVoided = effectiveStatus === 'void'
                  const isMenuOpen = actionMenuOpen === txn.id
                  const txnMetadata = parseMetadata(txn.metadata)
                  // Refund SEQ Logic (Global for row)
                  let refundSeq = 0;
                  if (txnMetadata?.has_refund_request || txn.status === 'waiting_refund') refundSeq = 1;
                  else if (txnMetadata?.original_transaction_id && !txnMetadata.is_refund_confirmation) refundSeq = 2;
                  else if (txnMetadata?.is_refund_confirmation) refundSeq = 3;

                  let displayIdForBadge = txn.id;
                  if (refundSeq === 2 || refundSeq === 3) {
                    displayIdForBadge = (txnMetadata?.original_transaction_id as string) || txn.id;
                  }




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

                  const renderCell = (key: ColumnKey) => {
                    switch (key) {
                      case "date": {
                        const d = new Date(txn.occurred_at ?? txn.created_at ?? Date.now())
                        const day = String(d.getDate()).padStart(2, '0')
                        const month = String(d.getMonth() + 1).padStart(2, '0')
                        const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        const fullDateStr = d.toLocaleDateString('vi-VN', {
                          weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })

                        return (
                          <div className="flex items-center gap-3 overflow-visible w-full">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 pointer-events-auto"
                              checked={isSelected}
                              onClick={(e) => { e.stopPropagation(); if (e.shiftKey) handleSelectOne(txn.id, !isSelected, true); }}
                              onChange={(e) => handleSelectOne(txn.id, e.target.checked)}
                              disabled={isExcelMode}
                            />

                            <CustomTooltip content={fullDateStr}>
                              <div className="flex flex-col items-start justify-center cursor-help rounded px-0.5 group min-w-[34px]">
                                <span className="text-sm font-bold text-slate-700 leading-none group-hover:text-blue-600 transition-colors">
                                  {day}.{month}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 group-hover:text-blue-500 transition-colors">
                                  {timeStr}
                                </span>
                              </div>
                            </CustomTooltip>

                          </div>
                        )
                      }
                      case "actions": {
                        return (
                          <div className="flex items-center justify-end w-full pr-1">
                            {renderRowActions(txn, isVoided)}
                          </div>
                        )
                      }
                      // Note: 'type' column was removed - it's now merged into the 'date' column
                      case "shop": {
                        let shopLogo = txn.shop_image_url;

                        const repaymentAccount = txnSourceId ? accounts.find(account => account.id === txnSourceId) : null;
                        const repaymentLogo = txn.source_image ?? repaymentAccount?.image_url ?? null;

                        // Fallback logic for repayment/service
                        if (txn.type === 'repayment') {
                          shopLogo = repaymentLogo ?? shopLogo ?? null;
                        }

                        const isServicePayment = txn.note?.startsWith('Payment for Service') || (txn.metadata as any)?.type === 'service_payment';
                        if (isServicePayment && !shopLogo) {
                          shopLogo = txn.source_image;
                        }

                        const installmentBadge = (txn.is_installment || txn.installment_plan_id) ? (
                          <CustomTooltip content="Trả góp - Click để xem">
                            <Link
                              href={`/installments?tab=active&highlight=${txn.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center rounded bg-amber-100 border border-amber-400 px-1 py-0.5 text-amber-700 hover:bg-amber-200 transition-colors shrink-0"
                            >
                              <Link2 className="h-4 w-4" />
                            </Link>
                          </CustomTooltip>
                        ) : null;

                        const refundAccount = accounts.find(a => a.id === txn.account_id);
                        // Check joined account name (txn.accounts) OR looked up account name
                        const accountName = (txn.accounts as any)?.name || refundAccount?.name;
                        const isPendingRefund = txn.account_id === REFUND_PENDING_ACCOUNT_ID || accountName === 'Pending Refunds (System)';
                        // BADGE LOGIC & CONFIRM BUTTON VISIBILITY
                        const originalMetadata = (txn.metadata as any) ?? {};

                        // 1. isPendingRefund (For Confirm Button)
                        // This logic determines if the "Confirm" button should show.
                        // It serves Tx 2 (Request) which is NOT yet completed.
                        const isOriginalTxn = Boolean(originalMetadata.original_transaction_id);
                        const isRefundConfirmation = Boolean(originalMetadata.is_refund_confirmation);
                        const isRefundRequest = isOriginalTxn && !isRefundConfirmation;

                        const canConfirm = isRefundRequest && txn.status !== 'completed';

                        // 2. VISUAL BADGES
                        // Hourglass (Tx 1): Shows on Original if refund is requested but not fully refunded
                        const refundStatus = originalMetadata.refund_status;
                        // Show hourglass only if requested AND NOT completed
                        const showHourglass = Boolean(originalMetadata.has_refund_request)
                          && txn.status !== 'refunded'
                          && refundStatus !== 'completed'
                          && refundStatus !== 'refunded';

                        // Reversed/Refunded Icon (Tx 1): Shows if refund is COMPLETED
                        // This replaces the hourglass when the cycle is done (GD3 exists)
                        const showReversed = Boolean(originalMetadata.has_refund_request)
                          && (refundStatus === 'completed' || refundStatus === 'refunded' || txn.status === 'refunded');

                        // Check (Tx 2): Shows on Request if it is Completed (Confirmed)
                        const showCheck = isRefundRequest && txn.status === 'completed';

                        // OK (Tx 3): Shows on Confirmation
                        const showOK = isRefundConfirmation;

                        let refundBadge = null;
                        if (showHourglass) {
                          refundBadge = (
                            <CustomTooltip content="Refund Requested - Waiting for Confirmation">
                              <div className="flex items-center justify-center rounded bg-amber-100 border border-amber-300 text-amber-700 px-1 py-0.5 shrink-0 ml-1">
                                <Clock className="h-3 w-3" />
                              </div>
                            </CustomTooltip>
                          );
                        } else if (showReversed) {
                          refundBadge = (
                            <CustomTooltip content="Refund Completed">
                              <div className="flex items-center justify-center rounded bg-slate-100 border border-slate-300 text-slate-700 px-1 py-0.5 shrink-0 ml-1">
                                <Undo2 className="h-3 w-3" />
                              </div>
                            </CustomTooltip>
                          );
                        } else if (showCheck) {
                          refundBadge = (
                            <CustomTooltip content="Refund Confirmed">
                              <div className="flex items-center justify-center rounded bg-emerald-100 border border-emerald-300 text-emerald-700 px-1 py-0.5 shrink-0 ml-1">
                                <Check className="h-3 w-3" />
                              </div>
                            </CustomTooltip>
                          );
                        } else if (showOK) {
                          refundBadge = (
                            <CustomTooltip content="Refund Received (OK)">
                              <div className="flex items-center justify-center rounded bg-indigo-100 border border-indigo-300 text-indigo-700 px-1 py-0.5 shrink-0 ml-1">
                                <span className="text-[10px] font-bold">OK</span>
                              </div>
                            </CustomTooltip>
                          );
                        }

                        const confirmRefundBadge = canConfirm ? (
                          <CustomTooltip content="Click to Confirm Refund">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmRefundTxn(txn);
                                setConfirmRefundOpen(true);
                              }}
                              className="flex items-center justify-center rounded bg-emerald-100 border border-emerald-400 text-emerald-700 px-1.5 py-0.5 shrink-0 transition-colors hover:bg-emerald-200 cursor-pointer ml-1"
                            >
                              <CheckCheck className="h-3 w-3" />
                              <span className="text-[10px] font-bold ml-1">Confirm</span>
                            </div>
                          </CustomTooltip>
                        ) : null;

                        // Transaction ID display - No prefix, just truncated ID
                        const txnIdShort = txn.id.slice(0, 4) + '...';
                        const txnIdFull = txn.id;

                        return (
                          <div className="flex items-center gap-2 w-full overflow-hidden group">
                            {/* Logo */}
                            {shopLogo ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={shopLogo} alt="" className="h-8 w-8 object-contain shrink-0 rounded-sm border-none ring-0 outline-none" />
                              </>
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center bg-slate-50 rounded-sm shrink-0">
                                {txn.type === 'repayment' ? (
                                  <Wallet className="h-4 w-4 text-orange-600" />
                                ) : (
                                  <ShoppingBasket className="h-4 w-4 text-slate-500" />
                                )}
                              </div>
                            )}

                            <div className="flex flex-col min-w-0 flex-1 justify-center">
                              {/* Row 1: ID (Compact) + Note */}
                              <div className="flex items-center gap-1.5 min-w-0 w-full mb-0.5">
                                {/* ID Badge - Moved Up & Compact - 2 characters + ellipsis? Or just icon? User said "align sau img [7e...] làm gọn lại" */}
                                <CustomTooltip content={`Click to copy: ${txnIdFull}`}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(txn.id);
                                      setCopiedId(txn.id);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-0.5 px-0.5 py-0 rounded text-[9px] font-mono transition-colors shrink-0 h-4",
                                      copiedId === txn.id
                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                        : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                                    )}
                                  >
                                    <span className="max-w-[30px] truncate">{txnIdShort}</span>
                                    {copiedId === txn.id ? <Check className="h-2 w-2" /> : <Copy className="h-2 w-2" />}
                                  </button>
                                </CustomTooltip>

                                {/* Note Content - Same Line */}
                                {txn.note ? (
                                  <CustomTooltip content={txn.note}>
                                    <span
                                      className="text-slate-900 font-bold truncate cursor-help block flex-1"
                                      style={{ fontSize: `0.9em` }} // Match Flow
                                    >
                                      {txn.note}
                                    </span>
                                  </CustomTooltip>
                                ) : (
                                  <span className="text-slate-400 italic text-[0.9em]">No note</span>
                                )}

                                {/* Inline Category Badge */}
                                {(() => {
                                  const actualCategory = categories.find(c => c.id === txn.category_id);
                                  const displayCategory = actualCategory?.name || txn.category_name;
                                  if (!displayCategory) return null;
                                  return (
                                    <span className="inline-flex items-center justify-center rounded-sm bg-slate-100 border border-slate-200 px-1.5 h-4 text-[9px] font-bold text-slate-500 uppercase tracking-tight shrink-0 ml-1">
                                      {displayCategory}
                                    </span>
                                  )
                                })()}
                              </div>

                              {/* Row 2: Badges (Installment/Refund/Split) */}
                              {(() => {
                                const metadata = (typeof txn.metadata === 'string' ? JSON.parse(txn.metadata) : txn.metadata) as any;
                                // Support New and Old flags
                                const isSplitParent = metadata?.is_split_bill === true || metadata?.is_split_bill_base === true;
                                const isSplitChild = !!(metadata?.parent_transaction_id || metadata?.split_parent_id);
                                const splitGroupName = metadata?.split_group_name;

                                let splitBadge = null;
                                if (isSplitParent || isSplitChild) {
                                  const badgeText = isSplitParent ? "SPLIT" : "SHARE";
                                  // Parent = Indigo (Distinct), Child = Slate (Subtle)
                                  const badgeColor = isSplitParent
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200";

                                  const tooltipText = isSplitParent
                                    ? (splitGroupName ? `Split Bill Parent - Group: ${splitGroupName}` : "Split Bill Parent (Total)")
                                    : "Split Bill Share (Linked)";

                                  splitBadge = (
                                    <CustomTooltip content={tooltipText}>
                                      <span className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap",
                                        badgeColor
                                      )}>
                                        {isSplitParent ? "⚡" : "🔗"} {badgeText}
                                      </span>
                                    </CustomTooltip>
                                  );
                                }

                                const hasBulkDebts = (metadata?.bulk_allocation?.debts?.length > 0) || (metadata?.bulkAllocation?.debts?.length > 0);
                                return (installmentBadge || refundBadge || confirmRefundBadge || splitBadge || hasBulkDebts) && (
                                  <div className="flex items-center gap-1">
                                    {installmentBadge}
                                    {refundBadge}
                                    {confirmRefundBadge}
                                    {splitBadge}
                                    {/* Repayment Counter Badge (Added to Shop Column) */}
                                    {hasBulkDebts && (() => {
                                      const bulkAllocation = metadata?.bulk_allocation || metadata?.bulkAllocation;

                                      if (bulkAllocation?.debts && bulkAllocation.debts.length > 0) {
                                        const debts = bulkAllocation.debts as { id: string, amount: number, tag?: string, note?: string }[];
                                        const count = debts.length;
                                        // Only show badge if count > 1 (True Bulk). Single item is redundant context.
                                        if (count <= 1) return null;

                                        return (
                                          <CustomTooltip
                                            content={
                                              <div className="flex flex-col gap-1">
                                                <span className="font-semibold border-b border-slate-600 pb-1 mb-1">Repayment for {count} items:</span>
                                                {debts.map((d, i) => (
                                                  <div key={i} className="flex justify-between gap-4 text-xs">
                                                    <span>{d.tag || 'Unknown Period'}:</span>
                                                    <span className="font-mono">{numberFormatter.format(d.amount)}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            }
                                          >
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(txn);
                                              }}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 w-fit cursor-pointer hover:bg-indigo-300 transition-colors"
                                            >
                                              <span className="text-[10px] font-bold">+{count} Paid</span>
                                            </button>
                                          </CustomTooltip>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      }
                      case "note": {
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
                            {/* Note Content & Badges Container */}
                            <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
                              <div className="flex items-center gap-2 truncate w-full">
                                <span
                                  className="text-slate-900 font-bold truncate cursor-help block flex-1"
                                  style={{ fontSize: `0.9em` }} // Match Flow
                                >
                                  {txn.note}
                                </span>

                                {/* Split Bill Indicator */}
                                {(() => {
                                  const metadata = (typeof txn.metadata === 'string' ? JSON.parse(txn.metadata) : txn.metadata) as any;
                                  const isSplitParent = metadata?.is_split_bill === true || metadata?.is_split_bill_base === true;
                                  const isSplitChild = !!(metadata?.parent_transaction_id || metadata?.split_parent_id);
                                  const splitGroupName = metadata?.split_group_name;

                                  if (!isSplitParent && !isSplitChild) return null;

                                  const badgeText = isSplitParent ? "SPLIT" : "SHARE";
                                  const badgeColor = isSplitParent
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200";
                                  const tooltipText = isSplitParent
                                    ? (splitGroupName ? `Split Bill Parent - Group: ${splitGroupName}` : "Split Bill Parent (Total)")
                                    : "Split Bill Share (Linked)";

                                  return (
                                    <CustomTooltip content={tooltipText}>
                                      <span className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap",
                                        badgeColor
                                      )}>
                                        {isSplitParent ? "⚡" : "🔗"} {badgeText}
                                      </span>
                                    </CustomTooltip>
                                  );
                                })()}

                                {txn.note && (
                                  <CustomTooltip content={<div className="max-w-[300px] whitespace-normal break-words">{txn.note}</div>}>
                                    <Info className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                  </CustomTooltip>
                                )}
                              </div>


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
                      }
                      case "people": {
                        const personName = (txn as any).person_name ?? people.find(p => p.id === txn.person_id)?.name
                        if (!personName) return <span className="text-slate-400 italic text-xs">-</span>

                        return (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center justify-center h-8 w-8 rounded-sm bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200">
                              {personName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]" title={personName}>
                              {personName}
                            </span>
                          </div>
                        )
                      }
                      case "category": {
                        // 1. Determine Type Badge
                        let typeLabel = "EXPENSE"; // Default
                        let typeColor = "bg-red-100 text-red-700 border-red-200";
                        let typeTextColor = "text-red-700"; // For Name Sync
                        let typeIcon = <Minus className="h-3 w-3" />;

                        if (txn.type === 'repayment') {
                          typeLabel = "PAID";
                          typeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
                          typeTextColor = "text-emerald-700";
                          typeIcon = <Check className="h-3 w-3" />;
                        } else if (txn.type === 'debt') {
                          typeLabel = "LEND";
                          typeColor = "bg-orange-100 text-orange-700 border-orange-200";
                          typeTextColor = "text-orange-700";
                          typeIcon = <ArrowUpRight className="h-3 w-3 shrink-0" />;
                        } else if (txn.type === 'transfer') {
                          typeLabel = "TF";
                          typeColor = "bg-sky-100 text-sky-700 border-sky-200";
                          typeTextColor = "text-sky-700";
                          typeIcon = <ArrowRightLeft className="h-3 w-3" />;
                          // Smart Context for Transfer
                          if (contextId) {
                            if (contextId == txnSourceId) { typeLabel = "TF OUT"; typeIcon = <ArrowUpRight className="h-3 w-3" />; }
                            else if (contextId == txnDestId) { typeLabel = "TF IN"; typeColor = "bg-emerald-100 text-emerald-700 border-emerald-200"; typeTextColor = "text-emerald-700"; typeIcon = <ArrowDownLeft className="h-3 w-3" />; }
                          }
                        } else if (txn.type === 'income') {
                          typeLabel = "IN";
                          typeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
                          typeTextColor = "text-emerald-700";
                          typeIcon = <Plus className="h-3 w-3" />;
                        } else if (txn.type === 'expense') {
                          typeLabel = "OUT";
                          typeIcon = <Minus className="h-3 w-3" />;
                        }

                        // 2. Resolve Actual Category Data
                        const actualCategory = categories.find(c => c.id === txn.category_id) || null;

                        const displayCategory = actualCategory?.name || txn.category_name || (txn.type ? txn.type.charAt(0).toUpperCase() + txn.type.slice(1) : "Uncategorized");
                        const metadataImage = (txn.metadata as any)?.image_url ?? null;
                        const shopImage = txn.shop_image_url ?? null;
                        const categoryImage = (actualCategory as any)?.image_url || actualCategory?.image_url || txn.category_image_url || null;
                        const categoryIcon = (actualCategory as any)?.icon || txn.category_icon || null;
                        const displayImage = metadataImage || shopImage || categoryImage;
                        const occurredDate = txn.occurred_at ?? txn.created_at ?? null;
                        const mobileDateLabel = isMobile && occurredDate
                          ? new Date(occurredDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : null;

                        const catBadgeColor = "bg-slate-100 border-slate-200 text-slate-700";

                        return (
                          <div className="flex w-full flex-col gap-1">
                            <div className="flex items-center gap-1.5 justify-start">
                              {isMobile && (
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 pointer-events-auto"
                                  checked={isSelected}
                                  onClick={(e) => { e.stopPropagation(); if (e.shiftKey) handleSelectOne(txn.id, !isSelected, true); }}
                                  onChange={(e) => handleSelectOne(txn.id, e.target.checked)}
                                />
                              )}
                              {/* 1. Category Icon (Visual) */}
                              <CustomTooltip content={displayCategory}>
                                <div className="shrink-0 cursor-help">
                                  {displayImage ? (
                                    <div className="flex h-8 w-8 items-center justify-center">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={displayImage} alt="" className="h-full w-full object-contain rounded-sm ring-0 outline-none" />
                                    </div>
                                  ) : categoryIcon ? (
                                    <div className="flex h-8 w-8 items-center justify-center bg-slate-50 rounded-sm text-sm border border-slate-200">
                                      {categoryIcon}
                                    </div>
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center bg-slate-100 rounded-sm text-[10px] font-bold text-slate-500 border border-slate-200 uppercase">
                                      {displayCategory.slice(0, 1)}
                                    </div>
                                  )}
                                </div>
                              </CustomTooltip>

                              {/* 2. Type Badge - Fixed defined Width */}
                              <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 h-6 text-[10px] font-extrabold whitespace-nowrap w-[60px] justify-center shrink-0", typeColor)}>
                                {typeIcon} {typeLabel}
                              </span>

                              {/* 3. Category Name Badge - Align Start */}
                              <CustomTooltip content={displayCategory}>
                                <span
                                  className={cn("inline-flex items-center justify-start rounded-md border px-1.5 font-extrabold truncate w-[85px] h-6 leading-none cursor-help shrink-0 pl-1.5", catBadgeColor, typeTextColor)}
                                  style={{ fontSize: `${fontSize}px` }}
                                >
                                  {displayCategory}
                                </span>
                              </CustomTooltip>

                              {/* 4. Status Indicators - Separate Tooltip to avoid shadowing */}

                              {!isMobile && mobileDateLabel && (
                                <span className="text-[10px] text-slate-500 leading-tight">{mobileDateLabel}</span>
                              )}
                            </div>

                            {/* Linked Repayment Badges REMOVED from Category Column */}
                            {(() => null)()}

                            {isMobile && mobileDateLabel && (
                              <div className="flex w-full justify-start">
                                <span className="text-[11px] text-slate-500 leading-tight block pl-14">{mobileDateLabel}</span>
                              </div>
                            )}
                          </div>
                        )
                      }
                      case "account": {
                        // --- 1. Resolve Entities (Source & Target) ---
                        const sourceName = txn.source_name || txn.account_name || 'Unknown'
                        const sourceIcon = txn.source_image
                        const sourceId = txnSourceId
                        // In single-table mode, account_id is the source.

                        // Target Parsing
                        let targetName = destNameRaw
                        let targetIcon = txn.destination_image
                        let targetId = txnDestId
                        let targetType: 'account' | 'person' | 'none' = 'account'
                        let targetLink = targetId ? `/accounts/${targetId}` : null

                        // Check for Person First (Person takes precedence in "Accounts -> People" flow logic usually, or depends on data)
                        const personId = (txn as any).person_id
                        const personNameLink = (txn as any).person_name
                        const personAvatar = (txn as any).person_image_url

                        if (personId) {
                          targetType = 'person'
                          targetName = personNameLink || 'Unknown Person'
                          targetIcon = personAvatar
                          targetId = personId
                          targetLink = `/people/${personId}/details`
                        } else if (targetId) {
                          targetType = 'account'
                          if (targetName === 'Unknown') {
                            const foundAcc = accounts.find(a => a.id === targetId)
                            if (foundAcc) {
                              targetName = foundAcc.name
                              targetIcon = foundAcc.image_url
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
                        const isPersonContext = context === 'person' || (Boolean(contextId) && personId === contextId);
                        const isAccountContext = context === 'account' || (Boolean(contextId) && !isPersonContext);

                        // --- 3. Badges & Tags ---
                        const cycleTag = normalizeMonthTag(txn.persisted_cycle_tag) ?? txn.persisted_cycle_tag
                        const debtTag = personId ? (normalizeMonthTag(txn.tag) ?? txn.tag) : null

                        let cycleLabel = "-"
                        if (sourceId) {
                          const acc = accounts.find(a => a.id === sourceId)
                          if (acc && acc.cashback_config) {
                            const config = parseCashbackConfig(acc.cashback_config)
                            const range = getCashbackCycleRange(config, new Date(txn.occurred_at))
                            if (range) {
                              const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`
                              cycleLabel = `${fmt(range.start)} to ${fmt(range.end)}`
                            }
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
                          contextBadge = null,
                          isTarget = false // New prop for right-aligned target entities
                        }: {
                          name: string,
                          icon?: string | null,
                          link: string | null,
                          isSquare?: boolean,
                          badges?: React.ReactNode[],
                          contextBadge?: React.ReactNode,
                          isTarget?: boolean
                        }) => {
                          const Content = isTarget ? (
                            // Target Entity: Right-aligned with Image After Text
                            <div className="flex items-center gap-2 min-w-0 w-full justify-end">
                              {/* Name & Badges */}
                              <div className="flex flex-col min-w-0 flex-1 justify-center items-end">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {/* From/To Badge */}
                                  {contextBadge}
                                  <CustomTooltip content={name}>
                                    <span className="text-[0.9em] font-bold text-slate-700 truncate block flex-1 text-right cursor-help">
                                      {name}
                                    </span>
                                  </CustomTooltip>
                                </div>
                                {badges.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5 justify-end">
                                    {badges}
                                  </div>
                                )}
                              </div>

                              {/* Icon - After Text */}
                              {icon ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={icon} alt="" className={cn("h-8 w-8 object-contain shrink-0 rounded-sm border-none ring-0 outline-none", isSquare ? "" : "")} />
                                </>
                              ) : (
                                <div className={cn("flex h-8 w-8 items-center justify-center bg-slate-100 shrink-0 text-slate-400 rounded-sm border-none ring-0 outline-none")}>
                                  {link?.includes('people') ? <User className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                                </div>
                              )}
                            </div>
                          ) : (
                            // Source Entity: Default layout with Icon Before Text
                            <div className="flex items-center gap-2 min-w-0 w-full">
                              {/* Icon - Increased Size */}
                              {icon ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={icon} alt="" className={cn("h-8 w-8 object-contain shrink-0 rounded-sm border-none ring-0 outline-none", isSquare ? "" : "")} />
                                </>
                              ) : (
                                <div className={cn("flex h-8 w-8 items-center justify-center bg-slate-100 shrink-0 text-slate-400 rounded-sm border-none ring-0 outline-none")}>
                                  {link?.includes('people') ? <User className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                                </div>
                              )}

                              {/* Name & Badges */}
                              <div className="flex flex-col min-w-0 flex-1 justify-center">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {/* From/To Badge */}
                                  {contextBadge}

                                  <CustomTooltip content={name}>
                                    <span className="text-[0.9em] font-bold text-slate-700 truncate block flex-1 cursor-help">
                                      {name}
                                    </span>
                                  </CustomTooltip>
                                </div>
                                {/* Badges Row Removed - Now displayed in Shop/Note column */}
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

                        const personEntity = personId ? {
                          name: personNameLink || 'Unknown Person',
                          icon: personAvatar,
                          link: `/people/${personId}`,
                        } : null
                        const accountEntity = {
                          name: sourceName,
                          icon: sourceIcon,
                          link: sourceId ? `/accounts/${sourceId}` : null,
                        }

                        // Badges Construction - Rounded md and Bold Colors
                        const cycleBadge = (cycleLabel && cycleLabel !== '-') ? (
                          <span key="cycle" className="inline-flex items-center rounded-md bg-purple-100 px-1.5 py-0.5 text-[0.7em] font-bold text-purple-700 whitespace-nowrap leading-none border border-purple-200">
                            {cycleLabel}
                          </span>
                        ) : null

                        const tagBadge = (cycleTag || debtTag) ? (
                          <span key="tag" className="inline-flex items-center rounded-md bg-teal-100 px-1.5 py-0.5 text-[0.7em] font-bold text-teal-800 whitespace-nowrap leading-none border border-teal-200">
                            {cycleTag || debtTag}
                          </span>
                        ) : null

                        const fromBadge = <span key="from" className="inline-flex items-center rounded-md bg-orange-100 px-1.5 h-5 text-[0.7em] font-extrabold text-orange-700 border border-orange-200">FROM</span>
                        const toBadge = <span key="to" className="inline-flex items-center rounded-md bg-sky-100 px-1.5 h-5 text-[0.7em] font-extrabold text-sky-700 border border-sky-200">TO</span>


                        // 6. Paid Badges Logic (Moved from Category) -> REMOVED from here.

                        // --- 5. Main Render Switch ---

                        // SCENARIO 1: VIEWING PERSON PAGE (Context = Person)
                        if (isPersonContext && contextId && personEntity && personId === contextId) {
                          const isRepaymentTxn = txn.type === 'repayment';
                          // For Repayment: Person -> Account. We hide Person (Context). Show Target (Account).
                          // For Debt: Account -> Person. We hide Person (Context). Show Source (Account).

                          if (isRepaymentTxn) {
                            // REPAY: Show Target Account with TO badge
                            return (
                              <div className="flex items-center w-full">
                                <div className="flex-1 min-w-0">
                                  <RenderEntity
                                    name={accountEntity.name}
                                    icon={accountEntity.icon}
                                    link={accountEntity.link}
                                    badges={[tagBadge, cycleBadge]}
                                    contextBadge={toBadge}
                                    isTarget={true}
                                  />
                                </div>
                              </div>
                            )
                          } else {
                            // DEBT: Show Source Account with FROM badge
                            return (
                              <div className="flex items-center w-full">
                                <div className="flex-1 min-w-0">
                                  <RenderEntity
                                    name={accountEntity.name}
                                    icon={accountEntity.icon}
                                    link={accountEntity.link}
                                    badges={[cycleBadge]}
                                    contextBadge={fromBadge}
                                  />
                                </div>
                              </div>
                            )
                          }
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
                                    isTarget={true}
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
                        if (targetType === 'none') {
                          return (
                            <div className="flex items-center w-full min-w-0">
                              <div className="flex-1 min-w-0">
                                <RenderEntity
                                  name={sourceName}
                                  icon={sourceIcon}
                                  link={sourceId ? `/accounts/${sourceId}` : null}
                                  badges={[cycleBadge]}
                                />
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center w-full min-w-0">
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
                              <MoveRight className="h-5 w-5" />
                            </div>

                            {/* Right: Target */}
                            <div className="min-w-0 w-full overflow-hidden">
                              <RenderEntity
                                name={targetName}
                                icon={targetIcon}
                                link={targetLink}
                                badges={[tagBadge]}
                                isTarget={true}
                              />
                            </div>
                          </div>
                        )

                      }
                      case "tag": {
                        const displayTag = normalizeMonthTag(txn.tag) ?? txn.tag ?? ''

                        // Tooltip: Date Range (if recognized) or full tag
                        const dateRangeTooltip = displayTag ? formatCycleTag(displayTag) : ''

                        return (
                          <div className="flex flex-wrap gap-1 min-w-[120px] justify-end">
                            {displayTag && (
                              <CustomTooltip content={dateRangeTooltip || displayTag}>
                                <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 cursor-help whitespace-nowrap">
                                  {displayTag}
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
                            {!txn.tag && !txn.is_installment && !txn.installment_plan_id && <span className="text-slate-400 opacity-50 text-xs">-</span>}
                          </div>
                        )
                      }
                      case "amount": {
                        const amount = typeof txn.amount === "number" ? txn.amount : 0
                        const originalAmount = typeof txn.original_amount === "number" ? txn.original_amount : amount
                        // Amount logic: if >= 0 income/in, < 0 expense/out
                        const isIncome = amount >= 0

                        // Calculate Cashback/Fee for display
                        const cashbackVal = txn.cashback_share_amount ?? 0
                        const percentDisp = Number(txn.cashback_share_percent ?? 0)
                        const fixedDisp = Number(txn.cashback_share_fixed ?? 0)

                        // Calculate final price
                        const rate = percentDisp > 1 ? percentDisp / 100 : percentDisp
                        const cashbackCalc = (Math.abs(Number(originalAmount ?? 0)) * rate) + fixedDisp
                        const cashbackAmount = txn.cashback_share_amount ?? (cashbackCalc > 0 ? cashbackCalc : 0);
                        const baseAmount = Math.abs(Number(originalAmount ?? 0));
                        const finalDisp = (typeof txn.final_price === 'number')
                          ? Math.abs(txn.final_price)
                          : (cashbackAmount > baseAmount ? baseAmount : Math.max(0, baseAmount - cashbackAmount));

                        const hasCashback = cashbackVal > 0 || percentDisp > 0 || fixedDisp > 0

                        // Price breakdown tooltip content
                        const priceBreakdown = hasCashback ? (
                          <div className="text-xs space-y-1">
                            <div className="font-semibold border-b border-slate-200 pb-1 mb-1">💰 Price Breakdown</div>
                            <div className="flex justify-between gap-4">
                              <span>Original Amount:</span>
                              <span className="font-mono">{numberFormatter.format(Math.abs(originalAmount))}</span>
                            </div>
                            {percentDisp > 0 && (
                              <div className="flex justify-between gap-4 text-emerald-600">
                                <span>Discount ({percentDisp > 1 ? percentDisp : percentDisp * 100}%):</span>
                                <span className="font-mono">-{numberFormatter.format(Math.abs(originalAmount) * rate)}</span>
                              </div>
                            )}
                            {fixedDisp > 0 && (
                              <div className="flex justify-between gap-4 text-emerald-600">
                                <span>Fixed Discount:</span>
                                <span className="font-mono">-{numberFormatter.format(fixedDisp)}</span>
                              </div>
                            )}
                            <div className="flex justify-between gap-4 font-bold border-t border-slate-200 pt-1 mt-1">
                              <span>Final Price:</span>
                              <span className="font-mono">{numberFormatter.format(finalDisp)}</span>
                            </div>
                          </div>
                        ) : null;

                        return (
                          <div className="flex flex-col items-end gap-1 w-full">
                            <span
                              className={cn("font-bold tabular-nums tracking-tight truncate", amountClass)}
                              style={{ fontSize: `0.9em` }}
                            >
                              {numberFormatter.format(Math.abs(amount))}
                            </span>
                          </div>
                        )
                      }
                      case "final_price": {
                        const amount = typeof txn.amount === "number" ? txn.amount : 0
                        const originalAmount = typeof txn.original_amount === "number" ? txn.original_amount : amount

                        const percentDisp = Number(txn.cashback_share_percent ?? 0)
                        const fixedDisp = Number(txn.cashback_share_fixed ?? 0)
                        const rate = percentDisp > 1 ? percentDisp / 100 : percentDisp
                        const cashbackCalc = (Math.abs(Number(originalAmount ?? 0)) * rate) + fixedDisp
                        const cashbackAmount = txn.cashback_share_amount ?? (cashbackCalc > 0 ? cashbackCalc : 0);
                        const baseAmount = Math.abs(Number(originalAmount ?? 0));
                        const finalDisp = (typeof txn.final_price === 'number')
                          ? Math.abs(txn.final_price)
                          : (cashbackAmount > baseAmount ? baseAmount : Math.max(0, baseAmount - cashbackAmount));

                        const hasCashback = percentDisp > 0 || fixedDisp > 0 || cashbackAmount > 0;
                        const isRepayment = txn.type === 'repayment';
                        const visualType = (txn as any).displayType ?? txn.type;
                        const amountClass =
                          visualType === "income" || isRepayment
                            ? "text-emerald-700"
                            : visualType === "expense"
                              ? "text-red-500"
                              : "text-slate-600"

                        if (!hasCashback) {
                          // If no cashback, Net = Base. Show same value or dimmed?
                          // To align with "Base ... Net", we show it again or maybe just "-" if identical?
                          // Usually showing it confirms the final settlement.
                          return (
                            <div className="flex flex-col items-end gap-1 w-full">
                              <span className={cn("font-bold tabular-nums tracking-tight truncate opacity-80", amountClass)} style={{ fontSize: `0.9em` }}>
                                {numberFormatter.format(Math.abs(amount))}
                              </span>
                            </div>
                          )
                        }

                        return (
                          <div className="flex flex-col items-end gap-1 w-full">
                            <div className="flex items-center gap-1.5 justify-end">
                              {/* Cashback Badges */}
                              {percentDisp > 0 && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">
                                  -{percentDisp > 1 ? percentDisp : percentDisp * 100}%
                                </span>
                              )}
                              {fixedDisp > 0 && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">
                                  -{numberFormatter.format(fixedDisp)}
                                </span>
                              )}
                              <span className={cn("font-bold tabular-nums tracking-tight truncate", amountClass)} style={{ fontSize: `0.9em` }}>
                                {numberFormatter.format(finalDisp)}
                              </span>
                            </div>
                          </div>
                        )
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
                      default:
                        return ""
                    }
                  }





                  return (
                    <TableRow
                      key={txn.id}
                      className={cn(
                        "border-b border-slate-200 transition-colors text-base",
                        isMenuOpen ? "bg-blue-50" : rowBgColor,
                        !isExcelMode && "hover:bg-slate-50/50",
                        (updatingTxnIds.has(txn.id) || loadingIds?.has(txn.id)) && "opacity-70 animate-pulse bg-slate-50"
                      )}
                    >
                      {displayedColumns.map(col => {
                        // ... column rendering ...
                        // Sticky Logic for Cells
                        // Use a slightly more flexible stickyStyle that respects content if not explicitly date/shop
                        const allowOverflow = col.key === "date"
                        const stickyStyle: React.CSSProperties = {
                          width: columnWidths[col.key],
                          maxWidth: col.key === 'account' ? 'none' : columnWidths[col.key],
                          overflow: allowOverflow ? 'visible' : 'hidden',
                          whiteSpace: allowOverflow ? 'nowrap' : 'nowrap'
                        };
                        const stickyClass = "";

                        return (
                          <TableCell
                            key={`${txn.id}-${col.key}`}
                            onMouseDown={(e) => handleCellMouseDown(txn.id, col.key, e)}
                            onMouseEnter={() => handleCellMouseEnter(txn.id, col.key)}
                            className={cn(
                              `border-r border-slate-200 ${col.key === "amount" ? "text-right" : ""} ${col.key === "amount" ? "font-bold" : ""
                              } ${col.key === "amount" ? amountClass : ""} ${voidedTextClass} truncate`,
                              stickyClass,
                              col.key === "date" && "p-1",
                              col.key === "date" && "relative overflow-visible",
                              isExcelMode && "select-none cursor-crosshair active:cursor-crosshair",
                              isExcelMode && selectedCells.has(txn.id) && col.key === 'amount' && "bg-blue-100 ring-2 ring-inset ring-blue-500 z-10" // ADDED: Visual feedback for selected cells
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
                {
                  selection.size > 0 && (
                    <>
                      {summary.incomeSummary.sumAmount > 0 && (
                        <TableRow className="bg-slate-50 border-t border-slate-200 hover:bg-slate-50">
                          {displayedColumns.findIndex(c => c.key === 'amount') > 1 && (
                            <TableCell colSpan={displayedColumns.findIndex(c => c.key === 'amount') - 1} />
                          )}
                          <TableCell className="font-bold text-emerald-700 text-right pr-4">
                            Total Income:
                          </TableCell>
                          <TableCell className="font-bold text-emerald-700 text-right">
                            {numberFormatter.format(summary.incomeSummary.sumAmount)}
                          </TableCell>
                          <TableCell colSpan={displayedColumns.length - 1 - displayedColumns.findIndex(c => c.key === 'amount')} />
                        </TableRow>
                      )}
                      {summary.expenseSummary.sumAmount > 0 && (
                        <TableRow className="bg-slate-50 border-t border-slate-200 hover:bg-slate-50">
                          {displayedColumns.findIndex(c => c.key === 'amount') > 1 && (
                            <TableCell colSpan={displayedColumns.findIndex(c => c.key === 'amount') - 1} />
                          )}
                          <TableCell className="font-bold text-red-600 text-right pr-4">
                            Total Expense:
                          </TableCell>
                          <TableCell className="font-bold text-red-600 text-right">
                            {numberFormatter.format(summary.expenseSummary.sumAmount)}
                          </TableCell>
                          <TableCell colSpan={displayedColumns.length - 1 - displayedColumns.findIndex(c => c.key === 'amount')}></TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                }
              </TableBody >

            </table>
          </div >
        )
        }
      </div >

      {/* Footer - Outside scroll container */}
      {/* Footer - Outside scroll container */}

      {/* Pagination moved OUTSIDE the scrollable container to ensure visibility */}
      {
        !isExcelMode && showPagination && (
          <>
            {typeof document !== 'undefined' && createPortal(
              <div className="fixed bottom-0 left-0 right-0 flex md:hidden bg-white border-t border-slate-200 px-3 py-2 items-center justify-between gap-2 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap hidden sm:inline">Rows</span>
                  <select
                    className="h-7 w-14 rounded-md border border-slate-200 text-[11px] font-semibold focus:border-blue-500 focus:outline-none bg-white px-1"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {[10, 20, 50, 100, 200, 500].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <div className="text-[11px] font-medium whitespace-nowrap">
                    {currentPage} <span className="text-slate-400">/ {totalPages ?? 1}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages ?? 1, currentPage + 1))}
                    disabled={currentPage >= (totalPages ?? 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>,
              document.body
            )}

            <div className="hidden md:flex flex-none bg-white border-t border-slate-200 p-2 lg:p-3 items-center justify-between gap-2 z-40 sticky bottom-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              {/* Left: Items per Page */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap hidden sm:inline">Rows</span>
                <select
                  className="h-7 w-14 rounded-md border border-slate-200 text-[11px] font-semibold focus:border-blue-500 focus:outline-none bg-white px-1"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[10, 20, 50, 100, 200, 500].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              {/* Center: Pagination */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div className="text-[11px] font-medium whitespace-nowrap">
                  <span className="hidden sm:inline">Page </span>{currentPage} <span className="text-slate-400">/ {totalPages ?? 1}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages ?? 1, currentPage + 1))}
                  disabled={currentPage >= (totalPages ?? 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Right: Font Size & Reset - Hidden on Mobile */}
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                  <button
                    onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                    className="rounded p-1 hover:bg-slate-200 disabled:opacity-50"
                    disabled={fontSize <= 10}
                  >
                    <Minus className="h-3 w-3 text-slate-600" />
                  </button>
                  <span className="text-[10px] font-bold w-6 text-center">{fontSize}</span>
                  <button
                    onClick={() => setFontSize(Math.min(20, fontSize + 1))}
                    className="rounded p-1 hover:bg-slate-200 disabled:opacity-50"
                    disabled={fontSize >= 20}
                  >
                    <Plus className="h-3 w-3 text-slate-600" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSortState({ key: 'date', dir: 'desc' });
                    updateSelection(new Set());
                    resetColumns();
                    setCurrentPage(1);
                  }}
                  className="flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  title="Reset view"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden xl:inline">Reset</span>
                </button>
              </div>
            </div>
          </>
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
            onSuccess={(txn) => {
              // CRITICAL: Always close modal first, then try optimistic update
              setEditingTxn(null);

              // Try optimistic update if txn is provided
              if (txn) {
                handleOptimisticUpdate(txn);
              }
            }}
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
                Money will stay in &quot;Pending&quot; account until you confirm receipt.
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
        confirmDeletingTarget && createPortal(
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
            onClick={() => setConfirmDeletingTarget(null)}
          >
            <div
              className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-900">Delete transaction forever?</h3>
              <p className="mt-2 text-sm text-slate-600">
                This will PERMANENTLY remove this transaction from the database. This action cannot be undone.
              </p>
              {voidError && (
                <p className="mt-2 text-sm text-red-600">{voidError}</p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-md px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setConfirmDeletingTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={handleSingleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete Permanently
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
          const baseAmount =
            refundFormStage === 'confirm'
              ? Math.abs(refundFormTxn.amount ?? 0)
              : Math.abs(refundFormTxn.original_amount ?? refundFormTxn.amount ?? 0)

          // Source account for refund (where money goes back to)
          // If request, it's the original source (account_id).
          // If confirm, we might default to the first available account or just null.
          // Note: Logic above is approximation. 
          // Better: If request, use refundFormTxn.account_id.
          // If confirm, refundFormTxn is the request (on Pending Account). We need a target.
          // The request doesn't explicitly store the "return to" account until confirmed.
          // But usually we default to the first real account.
          const defaultAccountId = (refundFormStage === 'confirm' ? null : refundFormTxn.account_id) ?? refundAccountOptions[0]?.id ?? null
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

      <TransactionHistoryModal
        transactionId={historyTarget?.id ?? ''}
        transactionNote={historyTarget?.note}
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
      {confirmRefundTxn && (
        <ConfirmRefundDialogV2
          open={!!confirmRefundTxn}
          onOpenChange={(open) => {
            if (!open) setConfirmRefundTxn(null)
          }}
          transaction={confirmRefundTxn}
          accounts={accounts}
        />
      )}
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

      {/* Request Refund Dialog */}
      {refundTarget && (
        <RequestRefundDialog
          open={isRefundOpen}
          onOpenChange={setIsRefundOpen}
          transaction={refundTarget}
          type={refundType}
        />
      )}
      {/* Column Customizer */}
      <ColumnCustomizer
        open={isColumnCustomizerOpen}
        onOpenChange={setIsColumnCustomizerOpen}
        columns={customColumnOrder.map(key => {
          const def = defaultColumns.find(c => c.key === key)
          if (!def) return null
          return {
            id: key,
            label: def.label || (key === 'actions' ? 'Action' : key),
            frozen: key === 'date' || key === 'actions'
          }
        }).filter(Boolean) as any[]}
        visibleColumns={visibleColumns}
        onVisibilityChange={(key, visible) => {
          setVisibleColumns(prev => ({ ...prev, [key]: visible }))
        }}
        onOrderChange={(newOrder) => {
          // Enforce Date always first and Actions always last
          const content = newOrder.filter(k => k !== 'date' && k !== 'actions')
          setCustomColumnOrder(['date', ...content, 'actions'] as ColumnKey[])
        }}
        onReset={() => {
          // 1. Reset Order
          setCustomColumnOrder(defaultColumns.map(c => c.key));
          localStorage.removeItem('mf_v3_col_order');

          // 2. Reset Visibility
          const defaultVis: Record<ColumnKey, boolean> = {
            date: true,
            shop: true,
            note: false,
            category: false,
            tag: false,
            account: true,
            amount: true,
            final_price: true,
            back_info: false,
            id: false,
            people: false,
            actions: true,
          };
          setVisibleColumns(defaultVis);
          localStorage.removeItem('mf_v3_col_vis');

          // 3. Reset Widths
          const map = {} as Record<ColumnKey, number>;
          defaultColumns.forEach(col => {
            map[col.key] = col.defaultWidth;
          });
          setColumnWidths(map);
          localStorage.removeItem('mf_v3_col_width');

          toast.success("Column settings reset to default");
        }}
        widths={columnWidths}
        onWidthChange={(key, width) => {
          setColumnWidths(prev => ({ ...prev, [key]: width }))
        }}
      />
    </div>
  )
}
