'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TransactionWithDetails, Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { CheckCircle2 } from 'lucide-react'

interface PaidTransactionsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transactions: TransactionWithDetails[]
    personId: string
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function PaidTransactionsModal({
    open,
    onOpenChange,
    transactions,
    personId,
    accounts,
    categories,
    people,
    shops,
}: PaidTransactionsModalProps) {
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)

    // Filter to get paid/settled transactions (Strictly Repayments/Income)
    const paidTransactions = useMemo(() => {
        return transactions.filter(txn => {
            // Must be repayment or income (money in)
            if (txn.type !== 'repayment' && txn.type !== 'income') return false

            const metadata = txn.metadata as any
            return metadata?.is_settled === true || metadata?.paid_at !== null
        }).sort((a, b) => {
            const dateA = new Date(a.occurred_at || a.created_at).getTime()
            const dateB = new Date(b.occurred_at || b.created_at).getTime()
            return dateB - dateA // Most recent first
        })
    }, [transactions])

    // Group transactions by bulk settlement
    const groupedTransactions = useMemo(() => {
        const groups: Array<{
            type: 'bulk' | 'single'
            settlement?: TransactionWithDetails
            originalTransactions?: TransactionWithDetails[]
            transaction?: TransactionWithDetails
        }> = []

        const processedIds = new Set<string>()

        paidTransactions.forEach(txn => {
            if (processedIds.has(txn.id)) return

            const metadata = txn.metadata as any
            const settledIds = metadata?.settled_transaction_ids || []

            if (settledIds.length > 0) {
                // This is a bulk settlement
                const originalTxns = transactions.filter(t => settledIds.includes(t.id))
                groups.push({
                    type: 'bulk',
                    settlement: txn,
                    originalTransactions: originalTxns,
                })
                processedIds.add(txn.id)
                originalTxns.forEach(t => processedIds.add(t.id))
            } else {
                // Single settled transaction
                groups.push({
                    type: 'single',
                    transaction: txn,
                })
                processedIds.add(txn.id)
            }
        })

        return groups
    }, [paidTransactions, transactions])

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-purple-600" />
                            Paid Transactions ({paidTransactions.length})
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {groupedTransactions.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No paid transactions found
                            </div>
                        ) : (
                            groupedTransactions.map((group, idx) => (
                                <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-white">
                                    {group.type === 'bulk' && group.settlement && group.originalTransactions ? (
                                        <div className="space-y-3">
                                            {/* Bulk Settlement Header */}
                                            <div className="flex items-center justify-between pb-2 border-b">
                                                <div>
                                                    <div className="text-sm font-bold text-purple-700">Bulk Settlement</div>
                                                    <div className="text-xs text-slate-500">
                                                        {format(new Date(group.settlement.occurred_at || group.settlement.created_at), 'MMM dd, yyyy')}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-emerald-600">
                                                        {numberFormatter.format(Math.abs(Number(group.settlement.amount)))}đ
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {group.originalTransactions.length} transactions
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Original Transactions */}
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Original Transactions:</div>
                                                {group.originalTransactions.map(txn => (
                                                    <button
                                                        key={txn.id}
                                                        onClick={() => setEditingTransactionId(txn.id)}
                                                        className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                                                                {txn.note || 'No description'}
                                                                {(txn.metadata as any)?.parent_transaction_id && (
                                                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 flex-shrink-0">
                                                                        ↳ Linked
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {format(new Date(txn.occurred_at || txn.created_at), 'MMM dd, yyyy')}
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "text-sm font-bold tabular-nums",
                                                            Number(txn.amount) < 0 ? "text-rose-600" : "text-emerald-600"
                                                        )}>
                                                            {numberFormatter.format(Math.abs(Number(txn.amount)))}đ
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : group.transaction ? (
                                        <button
                                            onClick={() => setEditingTransactionId(group.transaction!.id)}
                                            className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors text-left rounded p-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                                                    {group.transaction.note || 'No description'}
                                                    {(group.transaction.metadata as any)?.parent_transaction_id && (
                                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 flex-shrink-0">
                                                            ↳ Linked
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {format(new Date(group.transaction.occurred_at || group.transaction.created_at), 'MMM dd, yyyy')}
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "text-sm font-bold tabular-nums",
                                                Number(group.transaction.amount) < 0 ? "text-rose-600" : "text-emerald-600"
                                            )}>
                                                {numberFormatter.format(Math.abs(Number(group.transaction.amount)))}đ
                                            </div>
                                        </button>
                                    ) : null}
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Transaction Dialog */}
            {editingTransactionId && (
                <AddTransactionDialog
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    transactionId={editingTransactionId}
                    mode="edit"
                    isOpen={!!editingTransactionId}
                    onOpenChange={(open) => {
                        if (!open) setEditingTransactionId(null)
                    }}
                />
            )}
        </>
    )
}
