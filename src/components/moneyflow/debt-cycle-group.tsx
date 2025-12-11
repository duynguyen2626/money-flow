'use client'

import { useState, useRef } from 'react'
import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { CheckCircle2, ChevronDown, ChevronRight, Clock, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { UnifiedTransactionTable } from './unified-transaction-table'
import { AddTransactionDialog } from './add-transaction-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DebtCycleGroupProps {
    tag: string
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
    isExpanded: boolean
    onToggleExpand: () => void
}

export function DebtCycleGroup({
    tag,
    transactions,
    accounts,
    categories,
    people,
    shops,
    personId,
    isExpanded,
    onToggleExpand,
}: DebtCycleGroupProps) {
    const [isExcelMode, setIsExcelMode] = useState(false)
    // Local filter state for this card
    const [localFilter, setLocalFilter] = useState<'all' | 'lend' | 'repay'>('all')
    const containerRef = useRef<HTMLDivElement>(null)

    // Effect: scroll into view when expanded
    // Note: If parent reorders, this item becomes first. We might essentially want to scroll to it.
    // Ideally parent handles "Move to Top".
    // But we keep this for visual feedback if reordering doesn't auto-scroll.
    /*
    useEffect(() => {
        if (isExpanded) {
             setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 150)
        }
    }, [isExpanded])
    */
    // User requirement: "move lên trên cùng". Parent will handle order.

    // Calculate detailed stats...

    // Calculate detailed stats for this cycle (Client-side Aggregation)
    const stats = transactions.reduce(
        (acc, txn) => {
            const amount = Math.abs(Number(txn.amount) || 0)
            const finalPrice = Math.abs(Number(txn.final_price) || amount) // Fallback to amount if final_price is null/0? No, if it's 0 it means free? Usually final_price is set. If not set, use amount.
            const type = txn.type

            // Only count "Outbound" debts for the main Loan stats
            const isOutboundDebt = (type === 'debt' && (Number(txn.amount) || 0) < 0) || (type === 'expense' && !!txn.person_id)

            if (isOutboundDebt) {
                acc.initial += amount
                // Lend should be Final Price (actual money out)
                // Note: Logic check. If amount is negative, final_price should also be treated as magnitude.
                // We use Math.abs(final_price) to be safe assuming final_price tracks the cost.
                const effectiveFinal = txn.final_price !== null && txn.final_price !== undefined ? Math.abs(Number(txn.final_price)) : amount
                acc.lend += effectiveFinal
            }

            // Repay: Sum of Repayments (or positive debts/incomes from person)
            if (type === 'repayment') {
                acc.repay += amount
            } else if (type === 'debt' && (Number(txn.amount) || 0) > 0) {
                acc.repay += amount
            } else if (type === 'income' && !!txn.person_id) {
                acc.repay += amount
            }

            return acc
        },
        { initial: 0, lend: 0, repay: 0 }
    )

    // Back = Initial - Lend
    const back = stats.initial - stats.lend

    // Remains: Lend - Repay (User Req: "Remains cũng phải là tính theo Final Price")
    const remains = stats.lend - stats.repay

    // Small tolerance for float math
    const isSettled = Math.abs(remains) < 100
    const statusColor = isSettled ? 'text-emerald-600' : 'text-amber-600'
    const statusBg = isSettled ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'

    const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

    const filteredTxns = transactions.filter(txn => {
        if (localFilter === 'all') return true
        const type = txn.type
        const amount = Number(txn.amount) || 0
        const isDebt = type === 'debt'

        if (localFilter === 'lend') {
            return (isDebt && amount < 0) || (type === 'expense' && !!txn.person_id)
        }
        if (localFilter === 'repay') {
            return (isDebt && amount > 0) || type === 'repayment' || (type === 'income' && !!txn.person_id)
        }
        return true
    })

    return (
        <div ref={containerRef} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200">
            {/* Header (Detailed Card) */}
            <div
                className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3",
                    isExpanded ? "bg-slate-50 border-b border-slate-200" : "hover:bg-slate-50"
                )}
            >
                <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={onToggleExpand}
                >
                    <button className="text-slate-400">
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>

                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-lg font-bold text-slate-900">{tag || 'Untagged History'}</span>
                            <span className="text-xs text-slate-400 font-normal">({transactions.length})</span>

                            {/* Stats Badges */}
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <div
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium cursor-pointer hover:bg-slate-200 transition-colors",
                                        localFilter === 'all' && "ring-2 ring-slate-400 bg-slate-200"
                                    )}
                                    onClick={() => setLocalFilter('all')}
                                >
                                    <span className="uppercase text-[10px] text-slate-400">Initial:</span>
                                    <span>{formatter.format(stats.initial)}</span>
                                </div>
                                <div
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-700 font-medium cursor-pointer hover:bg-rose-100 transition-colors",
                                        localFilter === 'lend' && "ring-2 ring-rose-400 bg-rose-100"
                                    )}
                                    onClick={() => setLocalFilter('lend')}
                                >
                                    <span className="uppercase text-[10px] text-rose-400">Lend:</span>
                                    <span>{formatter.format(stats.lend)}</span>
                                </div>
                                <div
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium"
                                >
                                    <span className="uppercase text-[10px] text-emerald-400">Back:</span>
                                    <span>{formatter.format(back)}</span>
                                </div>
                                <div
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 font-medium cursor-pointer hover:bg-blue-100 transition-colors",
                                        localFilter === 'repay' && "ring-2 ring-blue-400 bg-blue-100"
                                    )}
                                    onClick={() => setLocalFilter('repay')}
                                >
                                    <span className="uppercase text-[10px] text-blue-400">Repay:</span>
                                    <span>{formatter.format(stats.repay)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Remains + Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0 border-t sm:border-0 pt-2 sm:pt-0">
                    <div className="flex flex-col items-end mr-2">
                        <span className="text-[10px] uppercase text-slate-500 font-bold">Remains</span>
                        <span className={cn("text-xl font-bold tabular-nums", statusColor)}>
                            {formatter.format(Math.max(0, remains))}
                        </span>
                    </div>

                    {/* Quick Repay & Excel Actions */}
                    <div className="flex items-center gap-2">
                        {!isSettled && (
                            <AddTransactionDialog
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                buttonText="" // Content inside triggerContent
                                defaultType="repayment"
                                defaultPersonId={personId}
                                defaultAmount={remains}
                                defaultTag={tag}
                                buttonClassName=""
                                asChild
                                triggerContent={
                                    <Button variant="default" size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                        Quick Repay
                                    </Button>
                                }
                            />
                        )}

                        <Button
                            variant={isExcelMode ? "secondary" : "outline"}
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExcelMode(!isExcelMode);
                            }}
                            className={cn(
                                "h-8 text-xs border-slate-200",
                                isExcelMode && "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:text-green-800"
                            )}
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                            Excel Mode
                        </Button>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="relative w-full overflow-auto max-h-[60vh] border-t border-b bg-background">
                    <UnifiedTransactionTable
                        transactions={filteredTxns}
                        accountType="debt" // Treat as debt view
                        accountId={personId}
                        contextId={personId}
                        context="person"
                        isExcelMode={isExcelMode}
                        accounts={accounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                    />
                </div>
            )}
        </div>
    )
}
