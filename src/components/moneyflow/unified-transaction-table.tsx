"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameDay, isSameMonth, format } from 'date-fns'
import React, { useCallback, useEffect, useMemo, useState, useRef, isValidElement, useImperativeHandle } from "react"
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
  Files,
  Link2,
  Info,
  ShoppingBasket,
  Wallet,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
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
  UserPlus,
  UserMinus,
  RefreshCcw,
  MoveRight,
  Wrench,
  Pencil,
  Settings2,
  SlidersHorizontal,
  Zap,
  FileSpreadsheet,
  Users2,
  ShoppingBag,
  Book,
  FileText
} from "lucide-react"
import { normalizeCashbackConfig } from "@/lib/cashback"
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
import { resolveCashbackPolicy } from "@/services/cashback/policy-resolver"

import { ConfirmRefundDialogV2 } from "./confirm-refund-dialog-v2"

import { RequestRefundDialog } from "./request-refund-dialog"
import { TransactionHistoryModal } from "./transaction-history-modal"

import { cancelOrder } from "@/actions/transaction-actions"
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2"
import { ExcelStatusBar } from "@/components/ui/excel-status-bar"
import { ColumnKey } from "@/components/app/table/transactionColumns"
import { EmptyState } from "@/components/ui/empty-state"



type SortKey = 'date' | 'amount' | 'final_price'
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



import { Badge } from "@/components/ui/badge"
import { CycleBadge } from "@/components/transactions-v2/badge/CycleBadge"

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
  onDuplicate?: (input: any) => void
  loadingIds?: Set<string>
  setIsGlobalLoading?: (loading: boolean) => void
  setLoadingMessage?: (message: string) => void
  onSuccess?: () => Promise<void> | void
  searchQuery?: string
}

export type UnifiedTransactionTableRef = {
  handleOptimisticUpdate: (txn: TransactionWithDetails) => void
}




export const UnifiedTransactionTable = React.forwardRef<UnifiedTransactionTableRef, UnifiedTransactionTableProps>(({
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
  onSuccess,
  loadingIds,
  setIsGlobalLoading,
  setLoadingMessage,
  searchQuery,
}, ref) => {
  const [tableData, setTableData] = useState<TransactionWithDetails[]>(() => data ?? transactions ?? [])
  const [updatingTxnIds, setUpdatingTxnIds] = useState<Set<string>>(new Set())

  // Refund/Cancel Dialog State
  const [isRefundOpen, setIsRefundOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState<TransactionWithDetails | null>(null)
  const [refundType, setRefundType] = useState<'refund' | 'cancel'>('refund')

  // Confirm Refund Dialog State
  const [confirmRefundOpen, setConfirmRefundOpen] = useState(false)
  const [confirmRefundTxn, setConfirmRefundTxn] = useState<TransactionWithDetails | null>(null)

  // Store optimistic updates to persist across parent re-renders/stale server updates
  const optimisticTxns = useRef<Map<string, TransactionWithDetails>>(new Map())

  useEffect(() => {
    // Merge server data with pending optimistic updates
    const baseData = data ?? transactions ?? []
    const merged = [...baseData]

    optimisticTxns.current.forEach((optTxn) => {
      const idx = merged.findIndex(t => t.id === optTxn.id)
      if (idx !== -1) {
        merged[idx] = optTxn
      } else {
        // Prepend new transactions
        merged.unshift(optTxn)
      }
    })

    setTableData(merged)
  }, [data, transactions])

  const handleOptimisticUpdate = useCallback((optimisticTxn: TransactionWithDetails) => {
    // Safety check: if no ID, cannot update
    if (!optimisticTxn?.id) {
      console.warn('[Optimistic Update] Transaction has no ID, skipping update');
      return;
    }

    // 1. Store in ref for persistence
    optimisticTxns.current.set(optimisticTxn.id, optimisticTxn)

    // 2. Trigger Highlight Effect
    setUpdatingTxnIds(prev => {
      const next = new Set(prev)
      next.add(optimisticTxn.id)
      return next
    })

    // 3. Force Update Table Data immediately
    setTableData(prev => {
      const index = prev.findIndex(t => t.id === optimisticTxn.id)
      if (index !== -1) {
        const next = [...prev]
        next[index] = optimisticTxn
        return next
      }
      return [optimisticTxn, ...prev]
    })

    setTimeout(() => {
      setUpdatingTxnIds(prev => {
        const next = new Set(prev)
        next.delete(optimisticTxn.id)
        return next
      })
    }, 2000)
  }, [])

  useImperativeHandle(ref, () => ({
    handleOptimisticUpdate
  }), [handleOptimisticUpdate])

  const copyToClipboard = useCallback(async (value: string, successLabel?: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      if (successLabel) {
        toast.success(`${successLabel} copied`)
      }

      return true
    } catch (err) {
      toast.error('Copy failed')
      return false
    }
  }, [])
  const defaultColumns: ColumnConfig[] = [
    { key: "date", label: "Date", defaultWidth: 110, minWidth: 90 },
    { key: "shop", label: "Notes Flow", defaultWidth: 360, minWidth: 280 },
    { key: "account", label: "Flow", defaultWidth: 300, minWidth: 280 },
    { key: "amount", label: "BASE", defaultWidth: 120, minWidth: 100 },
    { key: "total_back", label: "Total Back", defaultWidth: 120, minWidth: 100 },
    { key: "final_price", label: "Net Value", defaultWidth: 120, minWidth: 100 },
    { key: "category", label: "Category", defaultWidth: 180 },
    { key: "id", label: "ID", defaultWidth: 100 },
    { key: "actual_cashback", label: "Est. Cashback", defaultWidth: 120, minWidth: 100 },
    { key: "est_share", label: "Cashback Shared", defaultWidth: 100, minWidth: 80 },
    { key: "net_profit", label: "Profit", defaultWidth: 100, minWidth: 80 },
    { key: "actions", label: "Action", defaultWidth: 100, minWidth: 60 },
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
  const [showTotals, setShowTotals] = useState(false)
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    const initial: Record<ColumnKey, boolean> = {
      date: true,
      shop: true,
      note: false,
      category: true, // Shown by default with new UI
      tag: false,
      account: true,
      amount: true,
      final_price: true,
      total_back: false,
      id: false,
      actions: true,
      actual_cashback: false,
      est_share: false,
      net_profit: false,
      back_info: false,
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

  // Cashback Columns Visibility based on Account Type
  useEffect(() => {
    setVisibleColumns(prev => {
      const next = { ...prev };
      const showCashback = accountType === "credit_card";

      // Only update if changed
      if (
        prev.actual_cashback === showCashback &&
        prev.est_share === showCashback &&
        prev.net_profit === showCashback
      ) {
        return prev;
      }

      next.actual_cashback = showCashback;
      next.est_share = showCashback;
      next.net_profit = showCashback;
      return next;
    });
  }, [accountType]);

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
  const [successTxnIds, setSuccessTxnIds] = useState<Set<string>>(new Set()) // For green flash effect if needed
  const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
  const [confirmCancelTarget, setConfirmCancelTarget] = useState<TransactionWithDetails | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [historyTarget, setHistoryTarget] = useState<TransactionWithDetails | null>(null)
  const [confirmDeletingTarget, setConfirmDeletingTarget] = useState<TransactionWithDetails | null>(null)
  const [operationMode, setOperationMode] = useState<'add' | 'edit' | 'duplicate'>('edit')

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

  const handleRestore = async (txn: TransactionWithDetails) => {
    setIsRestoring(true)
    try {
      const ok = await restoreTransaction(txn.id)
      if (!ok) {
        setVoidError('Unable to restore transaction. Please try again.')
        return
      }
      setActionMenuOpen(null)
      setVoidError(null)
      setStatusOverrides(prev => ({ ...prev, [txn.id]: 'posted' }))
      if (onSuccess) await onSuccess()
      window.dispatchEvent(new CustomEvent('refresh-account-data'))
      router.refresh()
    } catch (err) {
      console.error('Failed to restore transaction:', err)
      setVoidError('Unable to restore transaction. Please try again.')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleRefundFormSuccess = useCallback(() => {
    setRefundFormTxn(null)
    router.refresh()
  }, [router])

  const handleVoidConfirm = async () => {
    if (!confirmVoidTarget) return
    setVoidError(null)
    setIsVoiding(true)
    if (setIsGlobalLoading) setIsGlobalLoading(true)
    if (setLoadingMessage) setLoadingMessage('Voiding transaction...')
    const targetId = confirmVoidTarget.id
    setUpdatingTxnIds(prev => new Set(prev).add(targetId))

    try {
      const ok = await voidTransactionAction(targetId)
      if (!ok) {
        setVoidError('Unable to void transaction. Please try again.')
        return
      }
      setStatusOverrides(prev => ({ ...prev, [targetId]: 'void' }))
      closeVoidDialog()
      if (onSuccess) await onSuccess()
      window.dispatchEvent(new CustomEvent('refresh-account-data'))
      router.refresh()
    } catch (err: any) {
      if (err.message && err.message.includes('void the confirmation transaction first')) {
        toast.error("Please void the Confirmation Transaction (GD3) first.", {
          description: "Linked confirmation exists."
        });
        closeVoidDialog();
      } else {
        setVoidError(err.message || 'Unable to void transaction. Please try again.')
      }
    } finally {
      setIsVoiding(false)
      if (setIsGlobalLoading) setIsGlobalLoading(false)
      setUpdatingTxnIds(prev => {
        const next = new Set(prev)
        next.delete(targetId)
        return next
      })
    }
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

        if (onSuccess) await onSuccess()
        window.dispatchEvent(new CustomEvent('refresh-account-data'))
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

  // Duplicate feature temporarily removed - will rewrite from scratch later

  const handleEdit = (txn: TransactionWithDetails) => {
    if (externalOnEdit) {
      externalOnEdit(txn);
      return;
    }
    setOperationMode('edit');
    setEditingTxn(txn);
    setActionMenuOpen(null);
  };

  const handleDuplicate = (txn: TransactionWithDetails) => {
    if (externalOnDuplicate) {
      externalOnDuplicate(txn as any);
      return;
    }
    setOperationMode('duplicate');
    setEditingTxn(txn);
    setActionMenuOpen(null);
  };

  const handleSingleDeleteConfirm = async () => {
    if (!confirmDeletingTarget) return
    setIsDeleting(true)
    setLoadingMessage?.('Deleting transaction...')
    setIsGlobalLoading?.(true)
    try {
      const ok = await deleteTransaction(confirmDeletingTarget.id)
      if (ok) {
        setConfirmDeletingTarget(null)
        if (onSuccess) await onSuccess()
        window.dispatchEvent(new CustomEvent('refresh-account-data'))
        router.refresh()
      } else {
        setVoidError('Failed to delete transaction.')
      }
    } catch (err: any) {
      setVoidError(err.message || 'Failed to delete transaction.')
    } finally {
      setIsDeleting(false)
      setIsGlobalLoading?.(false)
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

    const processIds = Array.from(selection);

    // Initial loading state
    setUpdatingTxnIds(new Set(processIds));

    if (mode === 'void') {
      setIsVoiding(true)
      let errorCount = 0
      for (const id of processIds) {
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
        } finally {
          setUpdatingTxnIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
        processedCount++
      }
      setIsVoiding(false)
      updateSelection(new Set())
      if (onSuccess) await onSuccess()
      window.dispatchEvent(new CustomEvent('refresh-account-data'))
      router.refresh()
      if (errorCount > 0) {
        toast.error(`Failed to void ${errorCount} transactions.`)
      }
    } else if (mode === 'restore') {
      setIsRestoring(true)
      let errorCount = 0
      for (const id of processIds) {
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
        setUpdatingTxnIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        processedCount++
      }
      setIsRestoring(false)
      updateSelection(new Set())
      if (onSuccess) await onSuccess()
      window.dispatchEvent(new CustomEvent('refresh-account-data'))
      router.refresh()
      if (errorCount > 0) {
        toast.error(`Failed to restore ${errorCount} transactions.`)
      }
    } else if (mode === 'delete') {
      setIsDeleting(true)
      let errorCount = 0
      for (const id of processIds) {
        if (stopBulk.current) {
          toast.info(`Process stopped. ${processedCount} items processed.`)
          break
        }
        const ok = await deleteTransaction(id)
        if (!ok) {
          errorCount++
        }
        setUpdatingTxnIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        processedCount++
      }
      setIsDeleting(false)
      updateSelection(new Set())
      if (onSuccess) await onSuccess()
      window.dispatchEvent(new CustomEvent('refresh-account-data'))
      router.refresh()
      if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} transactions.`)
      }
    }
    setBulkDialog(null)
    setUpdatingTxnIds(new Set()) // Safety clear
  }

  const displayedTransactions = useMemo(() => {
    if (showSelectedOnly && selection.size > 0) {
      return tableData.filter(t => selection.has(t.id))
    }

    const filtered = tableData.filter(txn => {
      if (context === 'account' && accountId) {
        // If necessary, check if txn belongs to account.
        // Assuming tableData is correct from server/parent.
      }

      // Add Search Logic
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match =
          (txn.shop_name?.toLowerCase() || '').includes(q) ||
          (txn.note?.toLowerCase() || '').includes(q) ||
          (txn.category_name?.toLowerCase() || '').includes(q) ||
          ((txn.amount || '').toString().includes(q)) ||
          ((txn.metadata as any)?.original_description?.toLowerCase() || '').includes(q)

        if (!match) return false
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
      // Default: sort by date descending
      return dateB - dateA
    })
  }, [tableData, showSelectedOnly, selection, context, accountId, statusOverrides, currentTab, sortState])

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return displayedTransactions.slice(start, start + pageSize)
  }, [displayedTransactions, currentPage, pageSize])

  // Calculate total pages from displayedTransactions (not paginatedTransactions)
  const calculatedTotalPages = useMemo(() => {
    return Math.ceil(displayedTransactions.length / pageSize) || 1
  }, [displayedTransactions.length, pageSize])


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

  const tableTotals = useMemo(() => {
    let base = 0, net = 0, back = 0, estCb = 0, shared = 0, profit = 0;

    const sourceData = selection.size > 0
      ? tableData.filter(t => selection.has(t.id))
      : paginatedTransactions;

    sourceData.forEach(txn => {
      const isVoided = (statusOverrides[txn.id] ?? txn.status) === 'void';
      if (isVoided) return;

      const amount = Math.abs(txn.amount ?? 0);
      const originalAmount = typeof txn.original_amount === 'number' ? Math.abs(txn.original_amount) : amount;

      const percentDisp = Number(txn.cashback_share_percent ?? 0);
      const fixedDisp = Number(txn.cashback_share_fixed ?? 0);
      const rate = percentDisp > 1 ? percentDisp / 100 : percentDisp;
      const calcBack = (originalAmount * rate) + fixedDisp;
      const cashbackAmount = txn.cashback_share_amount ?? (calcBack > 0 ? calcBack : 0);

      const finalPrice = typeof txn.final_price === 'number' ? Math.abs(txn.final_price) : Math.max(0, originalAmount - cashbackAmount);

      // Est Cashback (From Policy)
      let est_cb = 0;
      const isExpense = txn.type === 'expense';
      const account = accounts.find(a => a.id === txn.account_id);
      if (isExpense && account?.type === 'credit_card') {
        const policy = resolveCashbackPolicy({
          account: account as any,
          categoryId: txn.category_id,
          amount: originalAmount,
          categoryName: txn.category_name,
          cycleTotals: { spent: 0 }
        });
        const policyRate = policy?.rate ?? 0;
        const baseVal = originalAmount * policyRate;
        est_cb = (policy?.maxReward !== undefined && policy.maxReward !== null)
          ? Math.min(baseVal, policy.maxReward)
          : baseVal;
      }

      base += originalAmount;
      back += cashbackAmount;
      net += finalPrice;
      estCb += est_cb;
      shared += (txn.cashback_share_amount ?? 0);
      profit += (est_cb - (txn.cashback_share_amount ?? 0));
    });

    return { base, net, back, estCb, shared, profit };
  }, [paginatedTransactions, statusOverrides, accounts]);

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
          <Copy className="h-4 w-4" />
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

        {divider}

        <button
          className={dangerItemClass}
          onClick={event => {
            event.stopPropagation();
            setConfirmDeletingTarget(txn);
            setActionMenuOpen(null);
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete (Forever)</span>
        </button>
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
      <div className="flex items-center gap-0.5" data-action-menu-wrapper onClick={(e) => e.stopPropagation()}>
        {/* Quick Actions - Primary */}
        <CustomTooltip content="Edit">
          <button
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            onClick={(e) => { e.stopPropagation(); handleEdit(txn); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </CustomTooltip>

        <CustomTooltip content="Duplicate">
          <button
            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            onClick={(e) => { e.stopPropagation(); externalOnDuplicate?.(txn); }}
          >
            <Files className="h-3.5 w-3.5" />
          </button>
        </CustomTooltip>

        {/* More Actions Menu */}
        <Popover open={isMenuOpen} onOpenChange={(open) => setActionMenuOpen(open ? txn.id : null)}>
          <PopoverTrigger asChild>
            <button
              id={`action-btn-${txn.id}`}
              type="button"
              data-action-trigger
              className={cn(
                "inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors",
                isMenuOpen && "bg-slate-100 text-slate-700"
              )}
              disabled={isExcelMode}
              onClick={event => {
                event.stopPropagation()
              }}
            >
              <Settings2 className="h-3.5 w-3.5 pointer-events-none" />
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
      .filter((col): col is ColumnConfig => !!col && visibleColumns[col.key] !== false && !hiddenColumns?.includes(col.key))
  }, [isMobile, effectiveColumnOrder, visibleColumns, mobileColumnOrder, defaultColumns, hiddenColumns])

  if (tableData.length === 0 && activeTab === 'active') {
    return (
      <EmptyState
        title="No transactions yet"
        description="Add your first transaction to get started"
      />
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
            onCopyId={async (id) => {
              const ok = await copyToClipboard(id, "Transaction ID")
              if (!ok) return
            }}
            formatters={{
              currency: (val) => numberFormatter.format(val),
              date: formattedDate
            }}
          />
        </div>
        {!isMobile && (
          <div className="hidden md:block flex-1 min-h-0 overflow-auto w-full h-full bg-white relative" style={{ scrollbarGutter: 'stable' }}>
            {/* Table Loading Overlay */}
            {(isVoiding || isRestoring || isDeleting) && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex items-center justify-center transition-all duration-300 animate-in fade-in">
                <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white shadow-xl border border-slate-100 scale-in-95 animate-in">
                  <div className="relative">
                    <div className="h-12 w-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                    <Loader2 className="absolute inset-0 m-auto h-5 w-5 text-indigo-600 animate-pulse" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      {isVoiding ? 'Voiding Transaction...' : isRestoring ? 'Restoring Transaction...' : 'Deleting Permanently...'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Processing Database</span>
                  </div>
                </div>
              </div>
            )}
            <table
              className="w-full caption-bottom text-sm border-collapse min-w-[800px] lg:min-w-0"
              onMouseUp={handleCellMouseUp}
              onMouseLeave={handleCellMouseUp}
            >
              <TableHeader className="sticky top-0 z-50 bg-gradient-to-b from-slate-50 to-white backdrop-blur-sm border-b-2 border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                <TableRow className="hover:bg-transparent border-0">
                  {displayedColumns.map(col => {
                    const stickyStyle: React.CSSProperties = { width: columnWidths[col.key] };

                    const isMobileCategoryDate = isMobile && col.key === 'category'
                    const columnLabel = isMobileCategoryDate ? 'Category / Date' : col.label

                    // Check if any sort is active
                    const isSorted = sortState.key !== 'date' || sortState.dir !== 'desc'

                    return (
                      <TableHead
                        key={col.key}
                        className={cn(
                          "border-r border-slate-400 bg-transparent text-slate-700 whitespace-nowrap font-semibold h-11",
                          // Removed sticky top-0 as requested
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
                            <CustomTooltip
                              content={sortState.key === 'date' ? (sortState.dir === 'asc' ? 'Sorted: Oldest to Newest' : 'Sorted: Newest to Oldest') : 'Click to sort'}
                              side="top"
                            >
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
                            </CustomTooltip>
                            {/* Clear Sort Button */}
                            {isSorted && (
                              <CustomTooltip content="Clear sort (reset to default)" side="top">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSortState({ key: 'date', dir: 'desc' })
                                  }}
                                  className="ml-1 p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                                  title="Clear sort"
                                >
                                  <Undo2 className="h-3 w-3" />
                                </button>
                              </CustomTooltip>
                            )}
                          </div>
                        ) : col.key === 'amount' ? (
                          <CustomTooltip
                            content={sortState.key === 'amount' ? (sortState.dir === 'asc' ? 'Sorted: Low to High' : 'Sorted: High to Low') : 'Click to sort'}
                            side="top"
                          >
                            <button
                              className="flex items-center gap-1 group w-full justify-end"
                              onClick={() => {
                                const nextDir =
                                  sortState.key === 'amount' ? (sortState.dir === 'asc' ? 'desc' : 'asc') : 'desc'
                                setSortState({ key: 'amount', dir: nextDir })
                              }}
                            >
                              {columnLabel}
                              {sortState.key === 'amount' ? (
                                sortState.dir === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-blue-600" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400" />
                              )}
                            </button>
                          </CustomTooltip>
                        ) : col.key === 'final_price' ? (
                          <span>{columnLabel}</span>
                        ) : col.key === 'actions' ? (
                          <div className="flex items-center justify-center w-full relative group">
                            <span className="mr-6">{columnLabel}</span>
                            <CustomTooltip content="Customize Columns" side="top">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setIsColumnCustomizerOpen(true)
                                }}
                                className="absolute right-0 p-1.5 hover:bg-slate-300 rounded-md transition-colors text-slate-600"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </CustomTooltip>
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
                {paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={displayedColumns.length} className="h-[400px] text-center">
                      <EmptyState
                        title="No transactions found"
                        description="Try adjusting your filters or search criteria"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map(txn => {
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
                      rowBgColor = "opacity-80 bg-gray-50 scale-[0.99] border-dashed"
                    } else {
                      const refundSeqCheck = (txn.metadata as any)?.refund_sequence || 0
                      if (txn.is_installment || txn.installment_plan_id) rowBgColor = "bg-amber-50"
                      else if (refundSeqCheck > 0) rowBgColor = "bg-purple-50" // Refund shading
                      else if (txn.type === 'repayment') rowBgColor = "bg-slate-50"
                      else if (effectiveStatus === 'pending' || effectiveStatus === 'waiting_refund') rowBgColor = "bg-emerald-50/50"
                    }

                    const renderCell = (key: ColumnKey) => {
                      const refundAccount = accounts.find(a => a.id === txn.account_id); // Lifted up for Category case availability
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
                          const isUpdating = updatingTxnIds.has(txn.id) || loadingIds?.has(txn.id);
                          return (
                            <div className="flex items-center justify-end w-full pr-1">
                              {isUpdating ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100/80 animate-pulse">
                                  <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Updating</span>
                                </div>
                              ) : (
                                renderRowActions(txn, isVoided)
                              )}
                            </div>
                          )
                        }
                        case "actual_cashback": {
                          const amountAbs = Math.abs(txn.amount);

                          // EXCLUSION LOGIC:
                          const status = String(txn?.status || '').toLowerCase();
                          if (status === 'void') return <span className="text-slate-300">-</span>;

                          const isIncome = txn.type === 'income';
                          const isTransfer = txn.type === 'transfer';
                          const isRepayment = txn.type === 'repayment';
                          const note = String(txn?.note || '').toLowerCase();
                          const isCreateInitial = note.includes('create initial') ||
                            note.includes('số dư đầu') ||
                            note.includes('opening balance') ||
                            note.includes('rollover');

                          if (isIncome || isTransfer || isRepayment || isCreateInitial) {
                            return <span className="text-slate-300">-</span>;
                          }

                          const account = accounts.find(a => a.id === txn.account_id);
                          if (!account || account.type !== 'credit_card') return <span className="text-slate-300">-</span>;

                          const policy = resolveCashbackPolicy({
                            account: account as any,
                            categoryId: txn.category_id,
                            amount: amountAbs,
                            categoryName: txn.category_name,
                            cycleTotals: { spent: 0 }
                          });

                          const policyRate = policy?.rate ?? 0;
                          const baseVal = amountAbs * policyRate;
                          const val = (policy?.maxReward !== undefined && policy.maxReward !== null)
                            ? Math.min(baseVal, policy.maxReward)
                            : baseVal;

                          if (val === 0) return <span className="text-slate-300">-</span>;

                          const effectiveRate = amountAbs > 0 ? (val / amountAbs) : 0;
                          const isCapped = policy?.maxReward !== undefined && policy.maxReward !== null && baseVal > policy.maxReward;

                          return (
                            <CustomTooltip content={
                              <div className="text-xs space-y-1.5">
                                <div className="font-bold">Est. Cashback (Calculated)</div>
                                <div className="text-slate-400">
                                  {numberFormatter.format(amountAbs)} × {(policyRate * 100).toFixed(policyRate * 100 % 1 === 0 ? 0 : 2)}% = {numberFormatter.format(baseVal)}
                                </div>
                                {isCapped && (
                                  <div className="text-rose-400 font-bold border-t border-white/10 pt-1">
                                    Config card max = {numberFormatter.format(policy.maxReward || 0)}
                                  </div>
                                )}
                                {policy?.metadata?.reason && (
                                  <div className="text-[10px] italic border-t border-white/5 pt-1 mt-1 text-slate-500">
                                    Rule: {policy.metadata.reason}
                                  </div>
                                )}
                              </div>
                            }>
                              <span className={cn(
                                "font-medium cursor-help border-b border-dotted",
                                isCapped ? "text-amber-600 border-amber-200" : "text-emerald-600 border-emerald-200"
                              )}>
                                {numberFormatter.format(val)}
                              </span>
                            </CustomTooltip>
                          );
                        }
                        case "est_share": {
                          // EXCLUSION LOGIC:
                          const status = String(txn?.status || '').toLowerCase();
                          if (status === 'void') return <span className="text-slate-300">-</span>;

                          const isIncome = txn.type === 'income';
                          const isTransfer = txn.type === 'transfer';
                          const note = String(txn?.note || '').toLowerCase();
                          const isCreateInitial = note.includes('create initial') ||
                            note.includes('số dư đầu') ||
                            note.includes('opening balance') ||
                            note.includes('rollover');

                          if (isIncome || isTransfer || isCreateInitial) {
                            return <span className="text-slate-300">-</span>;
                          }

                          const val = txn.cashback_share_amount ?? 0;
                          if (val === 0) return <span className="text-slate-300">-</span>;

                          const shareFixed = txn.cashback_share_fixed ?? 0;
                          const shareRate = txn.cashback_share_percent ?? 0;
                          const amountAbs = Math.abs(txn.amount);

                          return (
                            <CustomTooltip content={
                              <div className="text-xs space-y-1">
                                <div className="font-bold text-orange-400">Cashback Shared</div>
                                <div className="text-slate-400">
                                  {shareRate > 0 && (
                                    <span>{numberFormatter.format(amountAbs)} × {(shareRate * 100).toFixed(shareRate * 100 % 1 === 0 ? 0 : 2)}%</span>
                                  )}
                                  {shareRate > 0 && shareFixed > 0 && <span> + </span>}
                                  {shareFixed > 0 && (
                                    <span>{numberFormatter.format(shareFixed)} (fixed)</span>
                                  )}
                                  <span> = {numberFormatter.format(val)}</span>
                                </div>
                              </div>
                            }>
                              <span className="text-orange-600 cursor-help border-b border-dotted border-orange-200">
                                {numberFormatter.format(val)}
                              </span>
                            </CustomTooltip>
                          );
                        }
                        case "net_profit": {
                          // EXCLUSION LOGIC:
                          const status = String(txn?.status || '').toLowerCase();
                          if (status === 'void') return <span className="text-slate-300">-</span>;

                          const isIncome = txn.type === 'income';
                          const isTransfer = txn.type === 'transfer';
                          const isRepayment = txn.type === 'repayment';
                          const note = String(txn?.note || '').toLowerCase();
                          const isCreateInitial = note.includes('create initial') ||
                            note.includes('số dư đầu') ||
                            note.includes('opening balance') ||
                            note.includes('rollover');

                          if (isIncome || isTransfer || isRepayment || isCreateInitial) {
                            return <span className="text-slate-300">-</span>;
                          }

                          const amountAbs = Math.abs(txn.amount);
                          const account = accounts.find(a => a.id === txn.account_id);

                          // Use same re-calculation logic as actual_cashback
                          const policy = account?.type === 'credit_card' ? resolveCashbackPolicy({
                            account: account as any,
                            categoryId: txn.category_id,
                            amount: amountAbs,
                            categoryName: txn.category_name,
                            cycleTotals: { spent: 0 }
                          }) : null;

                          const policyRate = policy?.rate ?? 0;
                          const baseBankBack = amountAbs * policyRate;
                          const bankBack = (policy?.maxReward !== undefined && policy.maxReward !== null)
                            ? Math.min(baseBankBack, policy.maxReward)
                            : baseBankBack;

                          const share = txn.cashback_share_amount ?? 0;
                          const profit = bankBack - share;

                          if (profit === 0 && bankBack === 0 && share === 0) return <span className="text-slate-300">-</span>;

                          return (
                            <CustomTooltip content={
                              <div className="text-xs space-y-1">
                                <div className="font-bold text-indigo-400">Profit Calculation</div>
                                <div className="text-slate-400">
                                  {numberFormatter.format(bankBack)} (est) - {numberFormatter.format(share)} (share) = <span className={profit > 0 ? "text-emerald-400" : "text-rose-400"}>{numberFormatter.format(profit)}</span>
                                </div>
                              </div>
                            }>
                              <span className={cn(
                                profit > 0 ? "text-emerald-700 font-black" : profit < 0 ? "text-rose-500 font-bold" : "text-slate-500",
                                "cursor-help border-b border-dotted border-slate-300"
                              )}>
                                {numberFormatter.format(profit)}
                              </span>
                            </CustomTooltip>
                          );

                        }
                        // Note: 'type' column was removed - it's now merged into the 'date' column



                        case "shop": {
                          let shopLogo = txn.shop_image_url;

                          // ROLLOVER IMAGE OVERRIDE: If category is Rollover, use Category Image (takes precedence over Shop/Bank)
                          if (txn.category_name === 'Rollover' || txn.category_id === '71e71711-83e5-47ba-8ff5-85590f45a70c') {
                            const rolloverCat = categories.find(c => c.id === '71e71711-83e5-47ba-8ff5-85590f45a70c');
                            if (rolloverCat?.image_url) {
                              shopLogo = rolloverCat.image_url;
                            }
                          }

                          // Check if Shop Image is MISSING. If so, attempt to use Target Bank Image for relevant types.
                          if (!shopLogo) {
                            if (txn.type === 'repayment' || txn.type === 'transfer') {
                              // Target is Destination
                              const destId = (txn as any).destination_account_id || (txn as any).target_account_id;
                              const destAccount = accounts.find(a => a.id === destId);
                              if (destAccount?.image_url) {
                                shopLogo = destAccount.image_url;
                              }
                            } else if (txn.type === 'income') {
                              // Target is Account (Receiver)
                              const targetAccount = accounts.find(a => a.id === txn.account_id);
                              if (targetAccount?.image_url) {
                                shopLogo = targetAccount.image_url;
                              }
                            }
                          }

                          // Original Fallback Logic (modified to respect new target logic if set)
                          if (!shopLogo && (txn.type === 'repayment' || txn.type === 'income')) {
                            const repaymentAccount = txnSourceId ? accounts.find(account => account.id === txnSourceId) : null;
                            const repaymentLogo = txn.source_image ?? repaymentAccount?.image_url ?? null;
                            shopLogo = repaymentLogo;
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
                          const badgeBaseClass = "inline-flex items-center gap-1.5 px-2 h-[22px] min-w-[70px] justify-center rounded-full border text-[10px] font-bold whitespace-nowrap transition-all duration-200 shadow-sm";

                          if (showHourglass) {
                            refundBadge = (
                              <CustomTooltip content="Refund Requested - Waiting for Confirmation">
                                <div className={cn(badgeBaseClass, "bg-amber-50 text-amber-600 border-amber-200")}>
                                  <Clock className="h-3 w-3" />
                                  <span>WAIT</span>
                                </div>
                              </CustomTooltip>
                            );
                          } else if (showReversed) {
                            refundBadge = (
                              <CustomTooltip content="Refund Completed">
                                <div className={cn(badgeBaseClass, "bg-slate-50 text-slate-500 border-slate-200")}>
                                  <Undo2 className="h-3 w-3" />
                                  <span>REFUNDED</span>
                                </div>
                              </CustomTooltip>
                            );
                          } else if (showCheck) {
                            refundBadge = (
                              <CustomTooltip content="Refund Confirmed">
                                <div className={cn(badgeBaseClass, "bg-emerald-50 text-emerald-600 border-emerald-200")}>
                                  <Check className="h-3 w-3" />
                                  <span>DONE</span>
                                </div>
                              </CustomTooltip>
                            );
                          } else if (showOK) {
                            refundBadge = (
                              <CustomTooltip content="Refund Received (OK)">
                                <div className={cn(badgeBaseClass, "bg-indigo-50 text-indigo-600 border-indigo-200")}>
                                  <CheckCheck className="h-3 w-3" />
                                  <span>OK</span>
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
                                className="flex items-center justify-center rounded-full bg-emerald-500 text-white px-2.5 h-[22px] shrink-0 transition-all hover:bg-emerald-600 hover:shadow-md cursor-pointer ml-1 shadow-sm text-[10px] font-bold"
                              >
                                <CheckCheck className="h-3 w-3" />
                                <span className="ml-1">Confirm</span>
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
                                  <img src={shopLogo} alt="" className="h-8 w-8 object-contain shrink-0 rounded-none border-none ring-0 outline-none" />
                                </>
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center bg-slate-50 rounded-none shrink-0">
                                  {txn.type === 'repayment' ? (
                                    <Wallet className="h-4 w-4 text-orange-600" />
                                  ) : (
                                    <ShoppingBasket className="h-4 w-4 text-slate-500" />
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-2 min-w-0 flex-1 justify-between">
                                {/* Left: ID Badge + Note */}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <CustomTooltip content={`Click to copy: ${txnIdFull}`}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(txn.id).then((ok) => {
                                          if (!ok) return
                                          setCopiedId(txn.id);
                                          setTimeout(() => setCopiedId(null), 2000);
                                        })
                                      }}
                                      className={cn(
                                        "p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-slate-600 transition-colors shrink-0",
                                        copiedId === txn.id && "text-emerald-500"
                                      )}
                                      title={`Copy Transaction ID: ${txn.id}`}
                                    >
                                      {copiedId === txn.id ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    </button>
                                  </CustomTooltip>

                                  {txn.note ? (
                                    <CustomTooltip content={txn.note}>
                                      <span
                                        className="text-slate-900 font-black truncate cursor-help block flex-1"
                                        style={{ fontSize: `1.15em` }}
                                      >
                                        {txn.note}
                                      </span>
                                    </CustomTooltip>
                                  ) : (
                                    <span className="text-slate-400 italic text-[0.9em]">No note</span>
                                  )}
                                </div>

                                {/* Right: All Badges in Single Row */}
                                {(() => {
                                  const metadata = (typeof txn.metadata === 'string' ? JSON.parse(txn.metadata) : txn.metadata) as any;
                                  const isSplitParent = metadata?.is_split_bill === true || metadata?.is_split_bill_base === true;
                                  const isSplitChild = !!(metadata?.parent_transaction_id || metadata?.split_parent_id);
                                  const splitGroupName = metadata?.split_group_name;

                                  let splitBadge = null;
                                  if (isSplitParent || isSplitChild) {
                                    const badgeText = isSplitParent ? "SPLIT" : "SHARE";
                                    const badgeColor = isSplitParent
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200";

                                    const tooltipText = isSplitParent
                                      ? (splitGroupName ? `Split Bill Parent - Group: ${splitGroupName}` : "Split Bill Parent (Total)")
                                      : "Split Bill Share (Linked)";

                                    splitBadge = (
                                      <CustomTooltip content={tooltipText}>
                                        <span className={cn(
                                          "inline-flex items-center gap-1.5 px-2 h-[22px] min-w-[70px] justify-center rounded-full border text-[10px] font-bold whitespace-nowrap transition-all duration-200 shadow-sm",
                                          badgeColor
                                        )}>
                                          {isSplitParent ? "⚡" : "🔗"} {badgeText}
                                        </span>
                                      </CustomTooltip>
                                    );
                                  }

                                  const duplicatedFromId = metadata?.duplicated_from_id;
                                  let duplicationBadge = null;
                                  if (duplicatedFromId) {
                                    duplicationBadge = (
                                      <CustomTooltip content={`Duplicated from ID: ${duplicatedFromId}`}>
                                        <span className="inline-flex items-center gap-1.5 px-2 h-[22px] min-w-[70px] justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-200 text-[10px] font-bold whitespace-nowrap transition-all duration-200 shadow-sm hover:text-slate-600 hover:border-slate-300">
                                          <Files className="h-3 w-3" />
                                          CLONE {String(duplicatedFromId).slice(0, 4)}
                                        </span>
                                      </CustomTooltip>
                                    );
                                  }

                                  const hasBulkDebts = (metadata?.bulk_allocation?.debts?.length > 0) || (metadata?.bulkAllocation?.debts?.length > 0);
                                  const currentInstallmentBadge = (txn.is_installment || txn.installment_plan_id) ? (
                                    <CustomTooltip content="Trả góp - Click để xem">
                                      <Link
                                        href={`/installments?tab=active&highlight=${txn.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 px-2 h-[22px] min-w-[70px] justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold whitespace-nowrap transition-all duration-200 shadow-sm hover:bg-amber-100"
                                      >
                                        <CreditCard className="h-3 w-3" />
                                        PLAN
                                      </Link>
                                    </CustomTooltip>
                                  ) : null;

                                  const showBadges = currentInstallmentBadge || refundBadge || confirmRefundBadge || splitBadge || duplicationBadge || hasBulkDebts;

                                  if (!showBadges) return null;

                                  return (
                                    <div className="flex items-center gap-1 ml-auto">
                                      {currentInstallmentBadge}
                                      {refundBadge}
                                      {confirmRefundBadge}
                                      {splitBadge}
                                      {duplicationBadge}
                                      {hasBulkDebts && (() => {
                                        const bulkAllocation = metadata?.bulk_allocation || metadata?.bulkAllocation;

                                        if (bulkAllocation?.debts && bulkAllocation.debts.length > 0) {
                                          const debts = bulkAllocation.debts as { id: string, amount: number, tag?: string, note?: string }[];
                                          const count = debts.length;
                                          if (count <= 1) return null;

                                          return (
                                            <CustomTooltip
                                              content={
                                                <div className="flex flex-col gap-1">
                                                  <span className="font-semibold border-b border-slate-600 pb-1 mb-1">Repayment for {count} items:</span>
                                                  {debts.map((d, i) => (
                                                    <div key={i} className="flex justify-between gap-4 text-xs">
                                                      <span>{d.tag || 'Unknown Period'}:</span>
                                                      <span className="font-bold">{numberFormatter.format(d.amount)}</span>
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
                            <div className="flex items-center gap-2 max-w-[250px] group/note justify-between w-full">
                              {/* Left: Note + Linked ID */}
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {linkedIdForCopy && linkedIdForCopy !== txn.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(linkedIdForCopy).then((ok) => {
                                        if (!ok) return
                                        setCopiedId(`linked-${txn.id}`);
                                        setTimeout(() => setCopiedId(null), 2000);
                                      })
                                    }}
                                    className={cn(
                                      "opacity-0 group-hover/note:opacity-100 transition-opacity p-0.5 hover:bg-blue-50 rounded text-blue-400 hover:text-blue-600 shrink-0",
                                      copiedId === `linked-${txn.id}` && "opacity-100 text-emerald-500"
                                    )}
                                    title={`Copy Linked ID: ${linkedIdForCopy}`}
                                  >
                                    {copiedId === `linked-${txn.id}` ? <CheckCheck className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                                  </button>
                                )}

                                <span
                                  className="text-slate-900 font-bold truncate cursor-help block flex-1"
                                  style={{ fontSize: `0.9em` }}
                                >
                                  {txn.note}
                                </span>

                                {txn.note && (
                                  <CustomTooltip content={<div className="max-w-[300px] whitespace-normal break-words">{txn.note}</div>}>
                                    <Info className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                  </CustomTooltip>
                                )}
                              </div>

                              {/* Right: Copy Icon Only */}
                              <div className="flex items-center gap-1 ml-auto shrink-0">
                                {/* Transaction ID Copy */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(txn.id).then((ok) => {
                                      if (!ok) return
                                      setCopiedId(txn.id);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    })
                                  }}
                                  className={cn(
                                    "p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-slate-600 transition-colors shrink-0",
                                    copiedId === txn.id && "text-emerald-500"
                                  )}
                                  title={`Copy Transaction ID: ${txn.id}`}
                                >
                                  {copiedId === txn.id ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        case "category": {
                          const actualCategory = categories.find(c => c.id === txn.category_id) || null;
                          const displayCategory = actualCategory?.name || txn.category_name || "Uncategorized";

                          const categoryImage = (actualCategory as any)?.image_url || actualCategory?.image_url || txn.category_image_url || null;
                          const categoryIcon = (actualCategory as any)?.icon || txn.category_icon || null;

                          // Internal vs External Logic
                          const isInternal = actualCategory?.kind === 'internal';
                          const kindLabel = isInternal ? 'internal' : 'external';
                          const KindIcon = isInternal ? User : Users2;

                          return (
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Icon Container (Square as per rules) */}
                              <div className="shrink-0 h-8 w-8 rounded-none border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm">
                                {categoryImage ? (
                                  <img src={categoryImage} alt={displayCategory} className="h-full w-full object-contain" />
                                ) : categoryIcon ? (
                                  <span className="text-sm">{categoryIcon}</span>
                                ) : (
                                  <Book className="h-4 w-4 text-slate-400" />
                                )}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-slate-900 truncate leading-tight" title={displayCategory}>
                                  {displayCategory}
                                </span>
                                <div className={cn(
                                  "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest leading-none mt-0.5",
                                  isInternal ? "text-indigo-600" : "text-slate-500"
                                )}>
                                  <KindIcon className="h-2.5 w-2.5" />
                                  <span>{kindLabel}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        case "account": {
                          // FLOW COLUMN WITH CYCLE BADGES
                          // ==============================
                          // Extract data
                          const sourceName = txn.source_name || txn.account_name || 'Unknown'
                          const sourceIcon = txn.source_image
                          const sourceId = txnSourceId

                          const personId = (txn as any).person_id
                          const personName = (txn as any).person_name
                          const personImage = (txn as any).person_image_url

                          const destName = destNameRaw
                          const destIcon = txn.destination_image
                          const destId = txnDestId

                          // Determine what to display
                          const hasPerson = !!personId
                          const hasTarget = !!destId

                          // Get cycle tags
                          const cycleTag = normalizeMonthTag((txn as any).persisted_cycle_tag) ?? (txn as any).persisted_cycle_tag
                          const debtTag = personId ? (normalizeMonthTag(txn.tag) ?? txn.tag) : null

                          // Get source account for cycle badge
                          const sourceAccount = accounts.find(a => a.id === sourceId)
                          const destAccount = accounts.find(a => a.id === destId)

                          // Type icon
                          let typeIcon: React.ReactNode = null
                          if (txn.type === 'expense') {
                            typeIcon = <CustomTooltip content="Expense"><ArrowUpRight className="h-4 w-4 text-red-600" /></CustomTooltip>
                          } else if (txn.type === 'income') {
                            typeIcon = <CustomTooltip content="Income"><ArrowDownLeft className="h-4 w-4 text-emerald-600" /></CustomTooltip>
                          } else if (txn.type === 'transfer') {
                            typeIcon = <CustomTooltip content="Transfer"><ArrowRightLeft className="h-4 w-4 text-blue-600" /></CustomTooltip>
                          } else if (txn.type === 'debt' || txn.type === 'loan') {
                            typeIcon = <CustomTooltip content="Debt"><UserMinus className="h-4 w-4 text-amber-600" /></CustomTooltip>
                          } else if (txn.type === 'repayment') {
                            typeIcon = <CustomTooltip content="Repayment"><UserPlus className="h-4 w-4 text-purple-600" /></CustomTooltip>
                          }

                          // Wrapper for Type Icon with border as requested for alignment check
                          const borderedTypeIconWide = (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-slate-100 bg-white shadow-sm">
                              {typeIcon}
                            </div>
                          )

                          // Cycle badge for source (only credit_card with cashback_config)
                          const sourceCycleBadge = sourceAccount && sourceAccount.type === 'credit_card' && sourceAccount.cashback_config ? (
                            <CycleBadge
                              key={`cycle-source-${txn.id}`}
                              account={sourceAccount}
                              cycleTag={cycleTag}
                              txnDate={txn.occurred_at || txn.created_at}
                              entityName={sourceName}
                            />
                          ) : null

                          // People debt tag badge with click/hover logic
                          const person = people.find(p => p.id === personId);
                          const cycleSheet = person?.cycle_sheets?.find(s => s.cycle_tag === debtTag);
                          const sheetUrl = cycleSheet?.sheet_url || person?.google_sheet_url || person?.sheet_link;

                          const peopleDebtTag = personId && debtTag ? (
                            <div key={`debt-tag-${txn.id}`} className="flex items-center gap-1.5 shrink-0">
                              {sheetUrl && (
                                <CustomTooltip content={`Open Tracking Sheet for ${personName} (${debtTag})`}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(sheetUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                    className="inline-flex items-center justify-center gap-1 rounded-[4px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 h-6 text-[9px] font-black uppercase tracking-tighter cursor-pointer hover:bg-emerald-100 transition-colors shadow-sm"
                                  >
                                    <FileText className="h-3 w-3" />
                                    SHEET
                                  </button>
                                </CustomTooltip>
                              )}
                              <CustomTooltip content={`Open details for ${personName} in new tab filtered by cycle ${debtTag}`}>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    window.open(`/people/${personId}?tag=${debtTag}`, '_blank', 'noopener,noreferrer')
                                  }}
                                  className="inline-flex items-center justify-center gap-1 rounded-[4px] bg-blue-50 border border-blue-200 text-blue-700 px-2 h-6 text-[10px] font-extrabold whitespace-nowrap min-w-[110px] cursor-pointer hover:bg-blue-100 transition-colors shadow-sm"
                                >
                                  <User className="h-3 w-3" />
                                  {debtTag}
                                </span>
                              </CustomTooltip>
                            </div>
                          ) : null

                          // CONTEXT HIDING LOGIC
                          // Determine transparency based on context to simplify view
                          const isPersonContext = hasPerson && personId === contextId
                          const isSourceContext = sourceId === contextId
                          const isDestContext = destId === contextId

                          // Should we use Single Flow Mode?
                          // Yes if:
                          // 1. Pure Single (No target/person)
                          // 2. Or Context matches one side (so we hide that side and show the other in single mode)
                          const showSingleFlow = (!hasTarget && !hasPerson) || isPersonContext || (hasPerson && isSourceContext) || (hasTarget && isDestContext) || (hasTarget && isSourceContext)

                          if (showSingleFlow) {
                            // Determine WHICH entity to show
                            let entityToShow: 'source' | 'person' | 'dest' = 'source'
                            let flowBadgeType: 'FROM' | 'TO' | null = null; // New variable

                            if (isSourceContext) {
                              // Viewing Account. Show where money went/came from.
                              entityToShow = hasPerson ? 'person' : 'dest'
                              // If account received money (income/repayment), it came FROM the other side.
                              flowBadgeType = visualType === 'income' ? 'FROM' : 'TO'
                            }
                            else if (isDestContext || isPersonContext) {
                              // Viewing Person/Target. Show the Source Account involved.
                              entityToShow = 'source'
                              // If account received money (income/repayment), money went TO the account.
                              flowBadgeType = visualType === 'income' ? 'TO' : 'FROM'
                            }
                            else {
                              // Default if somehow showSingleFlow is true but context not matched
                              // (e.g. general view for simple single transactions)
                              entityToShow = 'dest'
                              flowBadgeType = visualType === 'income' ? 'FROM' : 'TO'
                            }

                            let displayName = sourceName
                            let displayImage = sourceIcon
                            let displayLink = sourceId ? `/accounts/${sourceId}` : null
                            let badgeToDisplay = sourceCycleBadge
                            let isCycleBadge = true

                            if (entityToShow === 'person') {
                              displayName = personName
                              displayImage = personImage
                              displayLink = `/people/${personId}`
                              badgeToDisplay = peopleDebtTag
                              isCycleBadge = false
                            } else if (entityToShow === 'dest') {
                              displayName = destName
                              displayImage = destIcon
                              displayLink = destId ? `/accounts/${destId}` : null
                              // Destination usually no badge unless debt, but for account transfer no badge currently
                              badgeToDisplay = null
                              isCycleBadge = false

                              // Fallback to Category/Shop for simple transactions
                              if (displayName === 'Unknown' && !hasPerson && !hasTarget) {
                                const cat = categories.find(c => c.id === txn.category_id)
                                displayName = cat?.name || txn.category_name || 'General'
                                displayImage = cat?.image_url || null
                                displayLink = null
                              }
                            }

                            // Universal fallback for Unknown in Single Flow
                            if (displayName === 'Unknown' && !hasPerson && !hasTarget) {
                              const cat = categories.find(c => c.id === txn.category_id)
                              displayName = cat?.name || txn.category_name || 'General'
                              displayImage = cat?.image_url || null
                              displayLink = null
                              badgeToDisplay = null
                              isCycleBadge = false
                            }

                            // If showing Source, ensure badge is set (cycle badge)
                            // If showing Source but simple expense, badge is sourceCycleBadge

                            return (
                              <div className="flex items-center gap-1.5 w-full min-w-0 h-9">
                                {borderedTypeIconWide}

                                <div
                                  className="flex-1 min-w-0 max-w-[calc(88%+15px)] h-9 px-1.5 py-1 rounded-md bg-slate-50 border border-slate-200 flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors group/pill shadow-sm"
                                >
                                  {/* Flow Badge */}
                                  {flowBadgeType && (
                                    <span className={cn(
                                      "inline-flex items-center justify-center rounded-[4px] h-6 text-[10px] font-extrabold whitespace-nowrap shrink-0 w-11 shadow-sm transition-all group-hover/pill:scale-105",
                                      flowBadgeType === 'FROM' ? "bg-orange-50 border border-orange-200 text-orange-700" : "bg-sky-50 border border-sky-200 text-sky-700"
                                    )}>
                                      {flowBadgeType}
                                    </span>
                                  )}

                                  {/* Avatar + Name Area with its own tooltip */}
                                  <CustomTooltip content={`Open ${displayName} in new tab`}>
                                    <div
                                      className="flex-1 min-w-0 flex items-center gap-2 h-full"
                                      onClick={(e) => {
                                        if (displayLink) {
                                          e.stopPropagation()
                                          window.open(displayLink, '_blank', 'noopener,noreferrer')
                                        }
                                      }}
                                    >
                                      <div className="shrink-0 h-7 w-7 flex items-center justify-center">
                                        {displayImage ? (
                                          <img src={displayImage} alt="" className="h-full w-full object-contain rounded-none" />
                                        ) : (
                                          <div className="h-full w-full flex items-center justify-center border border-slate-100 rounded-none bg-white">
                                            <Wallet className="h-4 w-4 text-slate-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm font-bold text-slate-700 truncate group-hover/pill:text-blue-600 transition-colors">
                                          {displayName}
                                        </span>
                                      </div>
                                    </div>
                                  </CustomTooltip>

                                  {/* Badge area */}
                                  {badgeToDisplay && (
                                    <div className="shrink-0">
                                      {isCycleBadge ? (
                                        <CustomTooltip content={`Open details for ${displayName} in new tab filtered by cycle ${cycleTag || ''}`}>
                                          {badgeToDisplay}
                                        </CustomTooltip>
                                      ) : (
                                        // If debt tag (it manages its own tooltip inside the component)
                                        badgeToDisplay
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          }

                          // CASE 2: Dual flow - source LEFT, target RIGHT (includes Account → Person)

                          const sourceBadges = [sourceCycleBadge].filter(Boolean)

                          // Target badges - debt tag for people OR nothing for accounts
                          const targetBadges: React.ReactNode[] = hasPerson ? [peopleDebtTag].filter(Boolean) : []

                          // Repayment swap logic: if repayment + person, swap display
                          const isRepayment = txn.type === 'repayment'
                          const shouldSwap = isRepayment && hasPerson

                          // Build entity objects
                          const sourceEntity = { name: sourceName, icon: sourceIcon, link: sourceId ? `/accounts/${sourceId}` : null, isAccount: true }
                          const targetEntity = {
                            name: hasPerson ? personName : destName,
                            icon: hasPerson ? personImage : destIcon,
                            link: hasPerson ? `/people/${personId}` : (destId ? `/accounts/${destId}` : null),
                            isAccount: !hasPerson
                          }

                          // Swap if repayment with person
                          const [displayLeft, displayRight] = shouldSwap
                            ? [targetEntity, sourceEntity]
                            : [sourceEntity, targetEntity]

                          const [leftBadges, rightBadges] = shouldSwap
                            ? [targetBadges, sourceBadges]
                            : [sourceBadges, targetBadges]

                          // Helper to render entity with badge
                          const renderFlowEntity = (entity: typeof sourceEntity, badges: React.ReactNode[], isTarget: boolean) => (
                            <div
                              className="flex-1 min-w-0 max-w-[44%] h-9 px-1.5 py-1 rounded-md bg-slate-50 border border-slate-200 flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors group/pill shadow-sm"
                            >
                              {/* Avatar + Name area */}
                              <CustomTooltip content={`Open ${entity.name} in new tab`}>
                                <div
                                  className="flex-1 min-w-0 flex items-center gap-2 h-full"
                                  onClick={(e) => {
                                    if (entity.link) {
                                      e.stopPropagation()
                                      window.open(entity.link, '_blank', 'noopener,noreferrer')
                                    }
                                  }}
                                >
                                  <div className="shrink-0 h-7 w-7 flex items-center justify-center">
                                    {entity.icon ? (
                                      <img src={entity.icon} alt="" className="h-full w-full object-contain rounded-none" />
                                    ) : (
                                      <div className={cn("h-full w-full flex items-center justify-center border border-slate-100 bg-white rounded-none")}>
                                        {entity.isAccount ? <Wallet className="h-4 w-4 text-slate-400" /> : <User className="h-4 w-4 text-slate-400" />}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-bold text-slate-700 truncate group-hover/pill:text-blue-600 transition-colors">
                                      {entity.name}
                                    </span>
                                  </div>
                                </div>
                              </CustomTooltip>

                              {/* Badges area */}
                              {badges.length > 0 && (
                                <div className="shrink-0 flex items-center gap-1">
                                  {badges.map((badge, idx) => (
                                    <React.Fragment key={idx}>
                                      {badge}
                                    </React.Fragment>
                                  ))}
                                </div>
                              )}
                            </div>
                          )

                          return (
                            <div className="flex items-center gap-1.5 w-full min-w-0 h-9">
                              {borderedTypeIconWide}
                              {renderFlowEntity(displayLeft, leftBadges, false)}
                              <span className="text-slate-300 font-light shrink-0">|</span>
                              {renderFlowEntity(displayRight, rightBadges, true)}
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
                                <span className="font-bold">{numberFormatter.format(Math.abs(originalAmount))}</span>
                              </div>
                              {percentDisp > 0 && (
                                <div className="flex justify-between gap-4 text-emerald-600">
                                  <span>Discount ({percentDisp > 1 ? percentDisp : percentDisp * 100}%):</span>
                                  <span className="font-bold">-{numberFormatter.format(Math.abs(originalAmount) * rate)}</span>
                                </div>
                              )}
                              {fixedDisp > 0 && (
                                <div className="flex justify-between gap-4 text-emerald-600">
                                  <span>Fixed Discount:</span>
                                  <span className="font-bold">-{numberFormatter.format(fixedDisp)}</span>
                                </div>
                              )}
                              <div className="flex justify-between gap-4 font-bold border-t border-slate-200 pt-1 mt-1">
                                <span>Final Price:</span>
                                <span className="font-bold">{numberFormatter.format(finalDisp)}</span>
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
                              <CustomTooltip
                                content={
                                  <div className="text-xs space-y-1">
                                    <div className="font-semibold border-b border-slate-200 pb-1 mb-1">💰 Net Value Formula</div>
                                    <div className="flex justify-between gap-4">
                                      <span>Base Amount:</span>
                                      <span className="font-bold">{numberFormatter.format(baseAmount)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4 text-emerald-600">
                                      <span>Est. Refund/Bank Reward:</span>
                                      <span className="font-bold">{numberFormatter.format(cashbackAmount)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4 font-bold border-t border-slate-200 pt-1 mt-1">
                                      <span>Net Result:</span>
                                      <span className="font-bold">{numberFormatter.format(finalDisp)}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 italic pt-1">
                                      Formula: Base - (Rate% × Base)
                                    </div>
                                  </div>
                                }
                                side="bottom"
                              >
                                <div className="flex items-center gap-1.5 justify-end cursor-help">
                                  {percentDisp > 0 && !visibleColumns.total_back && (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">
                                      -{(percentDisp > 1 ? percentDisp : percentDisp * 100).toFixed(0)}%
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
                              </CustomTooltip>
                            </div>
                          )
                        }
                        case "total_back": {
                          const amount = typeof txn.amount === "number" ? txn.amount : 0
                          const originalAmount = typeof txn.original_amount === "number" ? txn.original_amount : amount
                          const baseAmount = Math.abs(Number(originalAmount ?? 0));

                          const percentDisp = Number(txn.cashback_share_percent ?? 0)
                          const fixedDisp = Number(txn.cashback_share_fixed ?? 0)
                          const rate = percentDisp > 1 ? percentDisp / 100 : percentDisp
                          const cashbackCalc = (baseAmount * rate) + fixedDisp
                          const cashbackAmount = txn.cashback_share_amount ?? (cashbackCalc > 0 ? cashbackCalc : 0);

                          if (cashbackAmount === 0 && !percentDisp && !fixedDisp) return <span className="text-slate-300">-</span>;

                          const effectivePercent = baseAmount > 0 ? (cashbackAmount / baseAmount) * 100 : 0;

                          return (
                            <div className="flex flex-col items-end gap-0.5 w-full">
                              <CustomTooltip
                                content={
                                  <div className="text-xs space-y-1">
                                    <div className="font-semibold border-b border-slate-200 pb-1 mb-1">💰 Total Back Details</div>
                                    <div className="flex justify-between gap-4">
                                      <span>Base:</span>
                                      <span className="font-bold">{numberFormatter.format(baseAmount)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4 text-emerald-600">
                                      <span>Back:</span>
                                      <span className="font-bold">{numberFormatter.format(cashbackAmount)}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 italic pt-1 text-right">
                                      ~ {effectivePercent.toFixed(2)}%
                                    </div>
                                  </div>
                                }
                              >
                                <div className="flex items-baseline gap-1.5 justify-end cursor-help">
                                  <span className="text-[10px] font-bold text-emerald-600">
                                    -{effectivePercent.toFixed(0)}% =
                                  </span>
                                  <span className="font-black text-emerald-700 tabular-nums">
                                    {numberFormatter.format(cashbackAmount)}
                                  </span>
                                </div>
                              </CustomTooltip>
                            </div>
                          )
                        }
                        case "back_info": {
                          const cashbackAmount = Number(txn.bank_back ?? 0) + Number(txn.cashback_share_amount ?? 0)
                          const pRaw = Number(txn.cashback_share_percent ?? 0)
                          const fRaw = Number(txn.cashback_share_fixed ?? 0)
                          if (!pRaw && !fRaw && typeof txn.profit !== 'number') return <span className="text-slate-300">-</span>
                          return (
                            <div className="flex flex-col text-[1em]">
                              {(pRaw || fRaw) && (
                                <span className="text-[0.7em] text-slate-500 mb-0.5">
                                  {pRaw ? `${(pRaw * 100).toFixed(2)}%` : ''}
                                  {pRaw && fRaw ? ' + ' : ''}
                                  {fRaw ? numberFormatter.format(fRaw) : ''}
                                </span>
                              )}
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
                        case "id":
                          const isCopied = copiedId === txn.id
                          return (
                            <CustomTooltip content={isCopied ? 'Copied!' : txn.id}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(txn.id).then((ok) => {
                                    if (!ok) return
                                    setCopiedId(txn.id);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  })
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-slate-600 transition-colors shrink-0"
                                title="Copy ID"
                              >
                                {isCopied ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                              </button>
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
                          "border-b border-slate-200 transition-colors text-base relative",
                          isMenuOpen ? "bg-blue-50" : rowBgColor,
                          !isExcelMode && "hover:bg-slate-50/50",
                          (updatingTxnIds.has(txn.id) || loadingIds?.has(txn.id)) && "opacity-70 animate-pulse bg-slate-50",
                          successTxnIds.has(txn.id) && "bg-emerald-50/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]"
                        )}
                      >
                        {/* Processing Overlay for Row */}

                        {displayedColumns.map(col => {
                          const allowOverflow = col.key === "date"
                          const stickyStyle: React.CSSProperties = {
                            width: columnWidths[col.key],
                            maxWidth: col.key === 'account' ? 'none' : columnWidths[col.key],
                            overflow: allowOverflow ? 'visible' : 'hidden',
                            whiteSpace: allowOverflow ? 'nowrap' : 'nowrap'
                          };
                          return (
                            <TableCell
                              key={`${txn.id}-${col.key}`}
                              onMouseDown={(e) => handleCellMouseDown(txn.id, col.key, e)}
                              onMouseEnter={() => handleCellMouseEnter(txn.id, col.key)}
                              className={cn(
                                `border-r border-slate-200 ${col.key === "amount" ? "text-right" : ""} ${col.key === "amount" ? "font-bold" : ""
                                } ${col.key === "amount" ? amountClass : ""} ${voidedTextClass} truncate`,
                                col.key === "date" && "p-1",
                                col.key === "date" && "relative overflow-visible",
                                isExcelMode && "select-none cursor-crosshair active:cursor-crosshair",
                                isExcelMode && selectedCells.has(txn.id) && col.key === 'amount' && "bg-blue-100 ring-2 ring-inset ring-blue-500 z-10"
                              )}
                              style={stickyStyle}
                            >
                              {renderCell(col.key)}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
              {selection.size > 0 && paginatedTransactions.length > 0 && (
                <tfoot className="sticky bottom-0 z-40 bg-slate-900 text-white font-black shadow-[0_-4px_12px_rgba(0,0,0,0.2)] border-t-2 border-slate-700">
                  <TableRow className="hover:bg-slate-900 border-0">
                    {displayedColumns.map((col, idx) => {
                      const width = columnWidths[col.key];
                      const isFirst = idx === 0;

                      let content: React.ReactNode = null;
                      if (isFirst) {
                        content = <span className="text-[10px] uppercase tracking-widest opacity-60 ml-8">Total Rows</span>;
                      } else if (col.key === 'amount') {
                        content = numberFormatter.format(tableTotals.base);
                      } else if (col.key === 'total_back') {
                        content = numberFormatter.format(tableTotals.back);
                      } else if (col.key === 'final_price') {
                        content = numberFormatter.format(tableTotals.net);
                      } else if (col.key === 'actual_cashback') {
                        content = numberFormatter.format(tableTotals.estCb);
                      } else if (col.key === 'est_share') {
                        content = numberFormatter.format(tableTotals.shared);
                      } else if (col.key === 'net_profit') {
                        content = numberFormatter.format(tableTotals.profit);
                      }

                      return (
                        <TableCell
                          key={`total-${col.key}`}
                          className={cn(
                            "py-2.5 px-3 whitespace-nowrap border-r border-slate-800",
                            (col.key === 'amount' || col.key === 'total_back' || col.key === 'final_price' || col.key === 'actual_cashback' || col.key === 'est_share' || col.key === 'net_profit') && "text-right tabular-nums"
                          )}
                          style={{ width, maxWidth: width }}
                        >
                          {content}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </tfoot>
              )}
            </table>
          </div>
        )}

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
                      {currentPage} <span className="text-slate-400">/ {calculatedTotalPages}</span>
                    </div>
                    <button
                      onClick={() => setCurrentPage(Math.min(calculatedTotalPages, currentPage + 1))}
                      disabled={currentPage >= calculatedTotalPages}
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
                    <span className="hidden sm:inline">Page </span>{currentPage} <span className="text-slate-400">/ {calculatedTotalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(calculatedTotalPages, currentPage + 1))}
                    disabled={currentPage >= calculatedTotalPages}
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
            <TransactionSlideV2
              open={!!editingTxn}
              onOpenChange={(open) => {
                if (!open) setEditingTxn(null)
              }}
              mode="single"
              operationMode={operationMode}
              editingId={operationMode === 'edit' ? editingTxn.id : undefined}
              initialData={editingInitialValues as any}
              accounts={accounts}
              categories={categories}
              people={people}
              shops={shops}
              onSubmissionStart={() => {
                // IMMEDIATE CLOSE - for performance and feel
                setEditingTxn(null);

                // Show processing spinner on the row if we have an ID
                if (editingTxn?.id) {
                  setUpdatingTxnIds(prev => new Set(prev).add(editingTxn.id));
                }
              }}
              onSuccess={async (txn) => {
                // If we have a txn being updated, show processing effect
                if (txn?.id) {
                  // Ensure ID is in updating state (in case onSubmissionStart missed it or it's a new ID)
                  setUpdatingTxnIds(prev => new Set(prev).add(txn.id));

                  // Optimistic update
                  handleOptimisticUpdate(txn);

                  // Simulate revalidation wait or wait for router refresh
                  setTimeout(() => {
                    setUpdatingTxnIds(prev => {
                      const next = new Set(prev);
                      next.delete(txn.id);
                      return next;
                    });
                    setSuccessTxnIds(prev => new Set(prev).add(txn.id));
                    setTimeout(() => {
                      setSuccessTxnIds(prev => {
                        const next = new Set(prev);
                        next.delete(txn.id);
                        return next;
                      });
                    }, 2000);
                  }, 1500);
                } else {
                  // If no specific txn (like bulk), refresh everything
                  router.refresh();
                }
              }}
              onSubmissionEnd={() => {
                // Optional: ensure global busy states are cleared
              }}
            />
          )
        }

        {
          confirmVoidTarget && createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
              onClick={closeVoidDialog}
            >
              <div
                className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
                onClick={event => event.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-slate-900">Void transaction?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This transaction will be marked as <span className="font-bold text-rose-600">VOID</span>. It will not be deleted, but it will be hidden from default views and excluded from calculations.
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
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
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
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
              onClick={() => setConfirmDeletingTarget(null)}
            >
              <div
                className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
                onClick={event => event.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-slate-900 text-rose-600">Delete Forever?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This will <span className="font-black text-rose-600 underline">PERMANENTLY remove</span> this data from the database. This action <span className="font-bold italic">CANNOT be undone</span> and will affect your reports.
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
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
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
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
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
        {
          confirmRefundTxn && (
            <ConfirmRefundDialogV2
              open={!!confirmRefundTxn}
              onOpenChange={(open) => {
                if (!open) setConfirmRefundTxn(null)
              }}
              transaction={confirmRefundTxn}
              accounts={accounts}
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
        {
          refundTarget && (
            <RequestRefundDialog
              open={isRefundOpen}
              onOpenChange={setIsRefundOpen}
              transaction={refundTarget}
              type={refundType}
            />
          )
        }

        {/* Floating Bulk Action Toolbar */}
        {!isExcelMode && selection.size > 0 && typeof document !== 'undefined' && createPortal(
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
            {/* Totals Summary Card */}
            {showTotals && (
              <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                  {[
                    { label: 'BASE', value: tableTotals.base, color: 'text-slate-200' },
                    { label: 'NET', value: tableTotals.net, color: 'text-blue-400' },
                    { label: 'BACK', value: tableTotals.back, color: 'text-emerald-400' },
                    { label: 'EST. CASHBACK', value: tableTotals.estCb, color: 'text-emerald-500' },
                    { label: 'C. SHARED', value: tableTotals.shared, color: 'text-amber-400' },
                    { label: 'PROFIT', value: tableTotals.profit, color: tableTotals.profit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5 min-w-[80px]">
                      <span className="text-[9px] font-black text-slate-500 tracking-tighter uppercase">{item.label}</span>
                      <span className={cn("text-xs font-black tabular-nums tracking-tighter", item.color)}>
                        {numberFormatter.format(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Action Bar */}
            <div className="flex items-center gap-2 rounded-2xl bg-slate-900/95 border border-slate-800 p-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-8 duration-300 pointer-events-auto">
              <div className="flex items-center gap-2 px-3 border-r border-slate-700 mr-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                  {selection.size}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Selected</span>
              </div>

              <div className="flex items-center gap-1">
                {currentTab === 'void' ? (
                  <button
                    onClick={handleBulkRestore}
                    disabled={isRestoring}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    RESTORE
                  </button>
                ) : (
                  <button
                    onClick={handleBulkVoid}
                    disabled={isVoiding}
                    className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-500 transition-all disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    VOID
                  </button>
                )}

                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-500 transition-all disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  DELETE
                </button>

                <div className="h-8 w-px bg-slate-700 mx-2" />

                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer select-none",
                    showSelectedOnly ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                  )}
                  onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                >
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
                    showSelectedOnly ? "bg-blue-500 border-blue-400" : "border-slate-500"
                  )}>
                    {showSelectedOnly && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight">Show Selected</span>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer select-none",
                    showTotals ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                  )}
                  onClick={() => setShowTotals(!showTotals)}
                >
                  <Sigma className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-tight">Totals</span>
                </div>

                <button
                  onClick={() => updateSelection(new Set())}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 transition-colors"
                  title="Clear Selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>,
          document.body
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
              total_back: false,
              final_price: true,
              id: false,
              actions: true,
              actual_cashback: false,
              est_share: false,
              net_profit: false,
              back_info: false,
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
    </div>
  );
});
