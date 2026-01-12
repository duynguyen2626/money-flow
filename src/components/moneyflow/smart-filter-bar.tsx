'use client'

import { useMemo } from 'react'
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'

interface SmartFilterBarProps {
    transactions: TransactionWithDetails[]
    selectedType: FilterType
    onSelectType: (type: FilterType) => void
    statusFilter?: 'active' | 'void'
    onStatusFilterChange?: (status: 'active' | 'void') => void
    onPaidClick?: () => void
    className?: string
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function SmartFilterBar({
    transactions,
    selectedType,
    onSelectType,
    statusFilter,
    onStatusFilterChange,
    onPaidClick,
    className,
}: SmartFilterBarProps) {
    const totals = useMemo(() => {
        return transactions.reduce(
            (acc, txn) => {
                const type = txn.type
                const amount = Number(txn.amount) || 0
                const absAmount = Math.abs(amount)
                const isDebt = type === 'debt'

                // Aligning with DebtCycleList logic
                const isLend = (isDebt && amount < 0) || (type === 'expense' && !!txn.person_id)
                const isRepay = (isDebt && amount > 0) || type === 'repayment' || (type === 'income' && !!txn.person_id)
                // New: Cashback Calculation
                // Cashback is the difference between original amount and final price if set
                // Or explicitly defined in cashback fields
                // Usually for expenses where person benefited from cashback
                let cashback = 0
                if (txn.final_price !== null && txn.final_price !== undefined) {
                    const effectiveFinal = Math.abs(Number(txn.final_price))
                    if (absAmount > effectiveFinal) {
                        cashback = absAmount - effectiveFinal
                    }
                } else if (txn.cashback_share_amount) {
                    cashback = Number(txn.cashback_share_amount)
                } else if (txn.cashback_share_percent && txn.cashback_share_percent > 0) {
                    cashback = absAmount * txn.cashback_share_percent
                }

                // Paid: Count settled/paid transactions (Repayments Only)
                // We only count money RECEIVED (repayment or income), not debts settled by others
                const isPaid = (type === 'repayment' || type === 'income') && (txn.metadata?.is_settled === true || txn.metadata?.paid_at !== null)

                if (isPaid) {
                    acc.paidCount += 1
                }

                if (isLend) {
                    // Use final price for Lend total if available (Net Lend)
                    const effectiveLend = txn.final_price !== null && txn.final_price !== undefined
                        ? Math.abs(Number(txn.final_price))
                        : absAmount
                    acc.lend += effectiveLend
                } else if (isRepay) {
                    acc.repay += absAmount
                } else if (type === 'income') {
                    acc.income += absAmount
                } else if (type === 'expense') {
                    acc.expense += absAmount
                }

                if (cashback > 0) {
                    acc.cashback += cashback
                }

                return acc
            },
            { income: 0, expense: 0, lend: 0, repay: 0, cashback: 0, paidCount: 0 }
        )
    }, [transactions])

    const filters = [
        { id: 'all', label: 'All Types', show: true, activeClass: undefined, inactiveClass: undefined },
        {
            id: 'income',
            label: `My Income: ${numberFormatter.format(totals.income)}`,
            show: totals.income > 0,
            activeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold',
            inactiveClass: 'hover:bg-emerald-50 hover:text-emerald-700',
        },
        {
            id: 'expense',
            label: `My Expenses: ${numberFormatter.format(totals.expense)}`,
            show: totals.expense > 0,
            activeClass: 'bg-rose-50 border-rose-200 text-rose-700 font-semibold',
            inactiveClass: 'hover:bg-rose-50 hover:text-rose-700',
        },
        {
            id: 'lend',
            label: `Lend: ${numberFormatter.format(totals.lend)}`,
            show: true, // Always show debt related controls in People view
            activeClass: 'bg-amber-50 border-amber-200 text-amber-700 font-semibold',
            inactiveClass: 'hover:bg-amber-50 hover:text-amber-700',
        },
        {
            id: 'repay',
            label: `Repay: ${numberFormatter.format(totals.repay)}`,
            show: true, // Always show debt related controls in People view
            activeClass: 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold',
            inactiveClass: 'hover:bg-indigo-50 hover:text-indigo-700',
        },
        {
            id: 'cashback',
            label: `Cashback: ${numberFormatter.format(totals.cashback)}`,
            show: totals.cashback > 0,
            activeClass: 'bg-orange-50 border-orange-200 text-orange-700 font-semibold',
            inactiveClass: 'hover:bg-orange-50 hover:text-orange-700',
        },
        {
            id: 'paid',
            label: `Paid: +${totals.paidCount}`,
            show: totals.paidCount > 0,
            activeClass: 'bg-purple-50 border-purple-200 text-purple-700 font-semibold',
            inactiveClass: 'hover:bg-purple-50 hover:text-purple-700',
        }
    ] as const

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {filters.map((filter) => {
                if (!filter.show) return null
                const isActive = selectedType === filter.id
                const isPaidFilter = filter.id === 'paid'

                return (
                    <button
                        key={filter.id}
                        onClick={() => {
                            if (isPaidFilter && onPaidClick) {
                                onPaidClick()
                            } else {
                                onSelectType(filter.id as FilterType)
                            }
                        }}
                        className={cn(
                            "h-9 rounded-full border px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap shadow-sm flex items-center gap-1 cursor-pointer",
                            isActive
                                ? (filter.activeClass || 'bg-slate-900 border-slate-900 text-white shadow-md transform scale-105')
                                : cn(
                                    "bg-white border-slate-200 text-slate-600",
                                    filter.inactiveClass || 'hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                                )
                        )}
                    >
                        {filter.label}
                    </button>
                )
            })}

            {/* Status Filters (Separator) */}
            <div className="h-6 w-px bg-border/50 mx-1 shrink-0" />

            {['active', 'void'].map(status => (
                <button
                    key={status}
                    onClick={() => onStatusFilterChange?.(status as 'active' | 'void')}
                    className={cn(
                        "h-8 rounded-lg px-3 text-[11px] font-semibold transition-all uppercase tracking-wider shrink-0",
                        statusFilter === status
                            ? "bg-slate-800 text-white shadow-md"
                            : "bg-transparent text-muted-foreground hover:bg-slate-100/50 hover:text-slate-700"
                    )}
                >
                    {status}
                </button>
            ))}
        </div>
    )
}
