"use client"

import { useMemo, useState } from "react"
import { Ban, Loader2, MoreHorizontal, Pencil, RotateCcw, SlidersHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Account, Category, Person, TransactionWithDetails, TransactionWithLineRelations } from "@/types/moneyflow.types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { TransactionForm, TransactionFormValues } from "./transaction-form"
import { restoreTransaction, voidTransaction } from "@/services/transaction.service"
import { generateTag } from "@/lib/tag"

type ColumnKey =
  | "date"
  | "note"
  | "category"
  | "account"
  | "tag"
  | "cycle"
  | "percent"
  | "fixed"
  | "sumBack"
  | "amount"
  | "finalPrice"
  | "people"
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
  const derivedType: TransactionFormValues["type"] =
    personLine?.person_id
      ? "debt"
      : categoryLine
        ? ((txn.type ?? "expense") as TransactionFormValues["type"])
        : "transfer";
  const destinationAccountId =
    derivedType === "transfer" || derivedType === "debt"
      ? debitLine?.account_id ?? undefined
      : undefined;

  return {
    occurred_at: txn.occurred_at ? new Date(txn.occurred_at) : new Date(),
    type: derivedType,
    amount: Math.abs(baseAmount ?? 0),
    note: txn.note ?? "",
    tag: txn.tag ?? generateTag(new Date()),
    source_account_id: creditLine?.account_id ?? debitLine?.account_id ?? undefined,
    category_id: categoryLine?.category_id ?? undefined,
    person_id: personLine?.person_id ?? undefined,
    debt_account_id: destinationAccountId,
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

interface RecentTransactionsProps {
  transactions: TransactionWithDetails[]
  accountType?: Account['type']
  selectedTxnIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  accounts?: Account[]
  categories?: Category[]
  people?: Person[]
}

const defaultColumns: ColumnConfig[] = [
  { key: "date", label: "Date", defaultWidth: 120, minWidth: 100 },
  { key: "note", label: "Note", defaultWidth: 200, minWidth: 140 },
  { key: "category", label: "Category", defaultWidth: 140 },
  { key: "account", label: "Account", defaultWidth: 140 },
  { key: "tag", label: "Tag", defaultWidth: 100, minWidth: 90 },
  { key: "cycle", label: "Cycle", defaultWidth: 120 },
  { key: "percent", label: "% Back", defaultWidth: 110 },
  { key: "fixed", label: "Fix Back", defaultWidth: 110 },
  { key: "sumBack", label: "Sum Back", defaultWidth: 120 },
  { key: "amount", label: "Amount", defaultWidth: 120 },
  { key: "finalPrice", label: "Final Price", defaultWidth: 130 },
  { key: "people", label: "People", defaultWidth: 140 },
  { key: "task", label: "", defaultWidth: 56, minWidth: 48 },
]

export function RecentTransactions({
  transactions,
  accountType,
  selectedTxnIds,
  onSelectionChange,
  accounts = [],
  categories = [],
  people = [],
}: RecentTransactionsProps) {
  const router = useRouter()
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    const map: Record<ColumnKey, boolean> = {
      date: true,
      note: true,
      category: true,
      account: true,
      people: true,
      tag: true,
      cycle: true,
      percent: true,
      fixed: true,
      sumBack: true,
      amount: true,
      finalPrice: true,
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
  const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TransactionWithDetails['status']>>({})
  const editingInitialValues = useMemo(
    () => (editingTxn ? buildEditInitialValues(editingTxn) : null),
    [editingTxn]
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
      note: true,
      category: true,
      account: true,
      people: true,
      tag: true,
      cycle: true,
      percent: true,
      fixed: true,
      sumBack: true,
      amount: true,
      finalPrice: true,
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
          setVoidError('Không thể khôi phục giao dịch. Vui lòng thử lại.')
          return
        }
        setActionMenuOpen(null)
        setVoidError(null)
        setStatusOverrides(prev => ({ ...prev, [txn.id]: 'posted' }))
        router.refresh()
      })
      .catch(err => {
        console.error('Failed to restore transaction:', err)
        setVoidError('Không thể khôi phục giao dịch. Vui lòng thử lại.')
      })
      .finally(() => setIsRestoring(false))
  }

  const handleVoidConfirm = () => {
    if (!confirmVoidTarget) return
    setVoidError(null)
    setIsVoiding(true)
    void voidTransaction(confirmVoidTarget.id)
      .then(ok => {
        if (!ok) {
          setVoidError('Không thể hủy giao dịch. Vui lòng thử lại.')
          return
        }
        setStatusOverrides(prev => ({ ...prev, [confirmVoidTarget.id]: 'void' }))
        closeVoidDialog()
        router.refresh()
      })
      .catch(err => {
        console.error('Failed to void transaction:', err)
        setVoidError('Không thể hủy giao dịch. Vui lòng thử lại.')
      })
      .finally(() => setIsVoiding(false))
  }

  const handleEditSuccess = () => {
    setEditingTxn(null)
    router.refresh()
  }

  const displayedTransactions = useMemo(() => {
    if (showSelectedOnly) {
      return transactions.filter(txn => selection.has(txn.id))
    }
    return transactions
  }, [transactions, selection, showSelectedOnly])

  const getCycleLabel = (txn: TransactionWithDetails) => {
    const persisted = txn.persisted_cycle_tag ?? txn.tag
    const normalize = (value: string | null | undefined) => {
      if (!value) return "-"
      const yMonth = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
      if (yMonth) {
        return value
      }
      const abbrev = value.slice(0, 3).toLowerCase()
      const map: Record<string, string> = {
        jan: "January", feb: "February", mar: "March", apr: "April", may: "May", jun: "June",
        jul: "July", aug: "August", sep: "September", oct: "October", nov: "November", dec: "December",
      }
      if (map[abbrev]) return map[abbrev]
      return value
    }
    if (accountType === "credit_card") {
      if (persisted) return normalize(persisted)
      const rawDate = txn.occurred_at ?? (txn as { created_at?: string }).created_at
      const parsed = rawDate ? new Date(rawDate) : null
      if (parsed && !Number.isNaN(parsed.getTime())) {
        const month = String(parsed.getMonth() + 1).padStart(2, "0")
        return normalize(`${parsed.getFullYear()}-${month}`)
      }
    }
    return normalize(txn.tag ?? "-")
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


  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>No transactions yet.</p>
        <p className="text-sm mt-2">Add your first transaction to get started.</p>
      </div>
    );
  }

  const isAllSelected = selection.size > 0 && selection.size === displayedTransactions.length
  const displayedColumns = defaultColumns.filter(col => visibleColumns[col.key])

  return (
    <div className="relative">
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

            const taskCell = (
              <div className="relative flex justify-end">
                <button
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-slate-600 shadow-sm transition hover:bg-slate-50"
                  title="Thao tác"
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
                      <span>Chỉnh sửa</span>
                    </button>
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
                        <span>{isRestoring ? 'Đang khôi phục...' : 'Khôi phục'}</span>
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
                      <span>Hủy giao dịch</span>
                    </button>
                  </div>
                )}
              </div>
            )

            const renderCell = (key: ColumnKey) => {
              switch (key) {
                case "date":
                  return formattedDate(txn.occurred_at)
                case "note":
                  return txn.note
                case "category":
                  return txn.category_name || "-"
                case "account":
                  return txn.account_name || "-"
                case "people": {
                  const personName = (txn as any).person_name ?? txn.person_name ?? null
                  return personName || "-"
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

            const voidedTextClass = isVoided ? "opacity-60 line-through text-gray-400" : ""

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
          className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 px-4 py-10"
          onClick={() => setEditingTxn(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Chỉnh sửa giao dịch</h3>
              <button
                className="rounded px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                onClick={() => setEditingTxn(null)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <TransactionForm
              accounts={accounts}
              categories={categories}
              people={people}
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
            <h3 className="text-lg font-semibold text-slate-900">Hủy giao dịch?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Hành động này sẽ chuyển trạng thái giao dịch thành void và cập nhật số dư.
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
                Giữ lại
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleVoidConfirm}
                disabled={isVoiding}
              >
                {isVoiding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hủy giao dịch
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
