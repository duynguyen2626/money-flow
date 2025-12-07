'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, History, Loader2, ArrowRight, AlertCircle, Edit, Ban } from 'lucide-react'
import { getTransactionHistory, TransactionHistoryWithDiff, HistoryDiff } from '@/actions/history-actions'
import { cn } from '@/lib/utils'

type TransactionHistoryModalProps = {
    transactionId: string
    transactionNote?: string | null
    isOpen: boolean
    onClose: () => void
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'number') return numberFormatter.format(value)
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'string') {
        // Try to parse as date
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            try {
                const d = new Date(value)
                return new Intl.DateTimeFormat('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }).format(d)
            } catch {
                return value
            }
        }
        return value
    }
    return String(value)
}

function formatTimestamp(isoString: string): string {
    try {
        const d = new Date(isoString)
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(d)
    } catch {
        return isoString
    }
}

function DiffItem({ diff }: { diff: HistoryDiff }) {
    return (
        <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-xs font-semibold text-slate-500 min-w-[100px] shrink-0">
                {diff.field}:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap text-sm">
                <span className="text-red-600 line-through bg-red-50 px-1.5 py-0.5 rounded">
                    {formatValue(diff.oldValue)}
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                    {formatValue(diff.newValue)}
                </span>
            </div>
        </div>
    )
}

function HistoryEntry({ entry, index }: { entry: TransactionHistoryWithDiff; index: number }) {
    const isVoid = entry.change_type === 'void'

    return (
        <div className={cn(
            "rounded-lg border p-4",
            isVoid ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                        isVoid ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                    )}>
                        {isVoid ? (
                            <>
                                <Ban className="h-3 w-3" />
                                Voided
                            </>
                        ) : (
                            <>
                                <Edit className="h-3 w-3" />
                                Edited
                            </>
                        )}
                    </span>
                    <span className="text-xs text-slate-500">
                        #{index + 1}
                    </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs font-medium text-slate-700">
                        {formatTimestamp(entry.created_at)}
                    </span>
                    {entry.changed_by_email && (
                        <span className="text-[10px] text-slate-400">
                            by {entry.changed_by_email}
                        </span>
                    )}
                </div>
            </div>

            {/* Diffs */}
            {entry.diffs.length > 0 ? (
                <div className="space-y-0">
                    {entry.diffs.map((diff, i) => (
                        <DiffItem key={i} diff={diff} />
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-500 italic">
                    {isVoid ? 'Transaction was voided' : 'No field changes detected'}
                </p>
            )}
        </div>
    )
}

export function TransactionHistoryModal({
    transactionId,
    transactionNote,
    isOpen,
    onClose,
}: TransactionHistoryModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [history, setHistory] = useState<TransactionHistoryWithDiff[]>([])

    useEffect(() => {
        if (!isOpen) return

        const fetchHistory = async () => {
            setLoading(true)
            setError(null)

            const result = await getTransactionHistory(transactionId)

            if (result.success && result.data) {
                setHistory(result.data)
            } else {
                setError(result.error || 'Failed to load history')
            }

            setLoading(false)
        }

        fetchHistory()
    }, [isOpen, transactionId])

    if (!isOpen) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[80vh] rounded-xl bg-white shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <History className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
                            {transactionNote && (
                                <p className="text-sm text-slate-500 truncate max-w-[300px]" title={transactionNote}>
                                    {transactionNote}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin mb-3" />
                            <p className="text-sm">Loading history...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-red-500">
                            <AlertCircle className="h-8 w-8 mb-3" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <History className="h-8 w-8 mb-3 opacity-50" />
                            <p className="text-sm font-medium">No history recorded</p>
                            <p className="text-xs text-slate-400 mt-1">
                                This transaction has not been modified since creation.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 mb-4">
                                Showing {history.length} change{history.length !== 1 ? 's' : ''} (newest first)
                            </p>
                            {history.map((entry, index) => (
                                <HistoryEntry key={entry.id} entry={entry} index={index} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 rounded-b-xl">
                    <p className="text-xs text-slate-400 text-center">
                        Transaction ID: {transactionId.slice(0, 8)}...{transactionId.slice(-4)}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    )
}
