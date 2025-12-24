'use client'

import { useMemo } from 'react'
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer'

interface SmartFilterBarProps {
    transactions: TransactionWithDetails[]
    selectedType: FilterType
    onSelectType: (type: FilterType) => void
    className?: string
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function SmartFilterBar({
    transactions,
    selectedType,
    onSelectType,
    className,
}: SmartFilterBarProps) {
    const totals = useMemo(() => {
        return transactions.reduce(
            (acc, txn) => {
                const type = txn.type
                const amount = txn.amount ?? 0
                const absAmount = Math.abs(amount)
                const isDebt = type === 'debt'
                const isRepayment = type === 'repayment'
                // Check for "implied" debt/repayment (e.g. income/expense with person_id)
                // For simplicity in this specific "Smart Filter", we'll stick to core types + sign + person context if needed.
                // The prompt asked for: Lend (Debt < 0), Repay (Debt > 0).

                // Debt < 0 => Lend (You lent money / They owe you)
                // Debt > 0 => Borrow (You borrowed / You owe them) - Wait, "Repay" in Money Flow 3 usually means "Settlement" or "Repayment" type.
                // Let's follow requirement: "Lend: (Debt < 0)", "Repay: (Debt > 0)"?
                // Actually, in many systems:
                // Debt (Negative) -> You gave money (Lend)
                // Debt (Positive) -> You received money (Borrow)
                // Repayment -> Settle.
                // Let's stick to the prompt's explicit instruction:
                // "Lend: {amount}"
                // "Repay: {amount}"
                // And Prompt Logic says: "Lend (Debt < 0), Repay (Debt > 0)". This implies Repay covers Positive Debt transactions (which might be "Debt" type with positive amount, or "Repayment").

                // Let's adhere to the definition:
                // Lend = All negative values that are debt-related.
                // Repay = All positive values that are debt-related or repayments.

                // NOTE: In Money Flow, "Repayment" type is usually positive.

                const isLend = (isDebt && amount < 0) || (type === 'expense' && !!txn.person_id)
                const isRepay = (isDebt && amount > 0) || type === 'repayment' || (type === 'income' && !!txn.person_id)

                if (isLend) {
                    acc.lend += absAmount
                } else if (isRepay) {
                    acc.repay += absAmount
                } else if (type === 'income') {
                    acc.income += absAmount
                } else if (type === 'expense') {
                    acc.expense += absAmount
                }

                return acc
            },
            { income: 0, expense: 0, lend: 0, repay: 0 }
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
    ] as const

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {filters.map((filter) => {
                if (!filter.show) return null
                const isActive = selectedType === filter.id
                return (
                    <button
                        key={filter.id}
                        onClick={() => onSelectType(filter.id as FilterType)}
                        className={cn(
                            "rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                            isActive
                                ? (filter.activeClass || 'bg-slate-100 border-slate-300 text-slate-900 font-semibold')
                                : cn("bg-white border-slate-200 text-slate-500", filter.inactiveClass || 'hover:bg-slate-50 hover:text-slate-900')
                        )}
                    >
                        {filter.label}
                    </button>
                )
            })}
        </div>
    )
}
