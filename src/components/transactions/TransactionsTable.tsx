
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { TransactionRow } from './TransactionRow'
import { useState } from 'react'

interface TransactionsTableProps {
    transactions: TransactionWithDetails[]
    onEdit?: (t: TransactionWithDetails) => void
    onRefund?: (t: TransactionWithDetails) => void
    onVoid?: (t: TransactionWithDetails) => void
    selectedIds?: Set<string>
    onSelect?: (id: string) => void
}

export function TransactionsTable({
    transactions,
    onEdit,
    onRefund,
    onVoid,
    selectedIds,
    onSelect
}: TransactionsTableProps) {
    // Parent handles filtering now

    return (
        <div className="h-full flex flex-col relative bg-muted/20"> {/* Subtle background for float feel */}

            {/* Float Header */}
            {/* "align header: chuyển thành float header ... match style với rows cards" */}
            <div className="hidden md:flex items-center gap-4 px-4 py-3 mx-4 mt-4 bg-background/80 backdrop-blur-md border rounded-xl shadow-sm sticky top-4 z-20 text-xs font-semibold text-muted-foreground transition-all">
                <div className="w-[100px] shrink-0">Date</div>
                <div className="w-[380px] shrink-0">Details</div>
                <div className="flex-1 min-w-[200px]">Flow (Source &rarr; Target)</div>
                <div className="w-[300px] shrink-0 text-right pr-12">Amount</div>
                <div className="w-[100px] text-right">Actions</div>
            </div>

            {/* Card List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent px-4 pt-4">
                <div className="flex flex-col gap-2 pb-32"> {/* Big padding bottom for bulk bar */}
                    {transactions.map((transaction) => (
                        <TransactionRow
                            key={transaction.id}
                            transaction={transaction}
                            isSelected={selectedIds?.has(transaction.id)}
                            onSelect={onSelect}
                            onEdit={onEdit}
                            onRefund={onRefund}
                            onVoid={onVoid}
                            onDuplicate={onEdit} // Placeholder to prevent crash if not passed, logic handled in row
                        />
                    ))}
                    {transactions.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">
                            No transactions found
                        </div>
                    )}
                </div>
            </div>

            {/* Float Bulk Action Bar */}
            {selectedIds && selectedIds.size > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[600px] px-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="bg-foreground text-background rounded-full shadow-xl px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="font-bold whitespace-nowrap">{selectedIds.size} selected</span>
                            <div className="h-4 w-px bg-background/20" />
                            <button className="text-sm font-medium hover:text-primary/90 underline" onClick={() => onSelect?.('ALL_CLEAR' as any)}>
                                Deselect all
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Actions placeholder */}
                            <button className="bg-background/20 hover:bg-background/30 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">
                                Void Selected
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
