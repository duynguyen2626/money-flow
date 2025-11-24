'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTagFilter } from '@/context/tag-filter-context'
import { TransactionForm } from './transaction-form'
import { Account, Category, DebtAccount, Person, Shop } from '@/types/moneyflow.types'
import type { DebtByTagAggregatedResult } from '@/services/debt.service'
import { Check, Plus } from 'lucide-react'

type DebtCycle = DebtByTagAggregatedResult

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
    return numberFormatter.format(Math.abs(value))
}

function getYearFromTag(tag: string | null): number {
    if (!tag || tag === 'UNTAGGED') return new Date().getFullYear();
    const match = tag.match(/(\d{2})$/);
    if (match) {
        return 2000 + parseInt(match[1], 10);
    }
    // Try to parse YYYY if possible, though format is mostly MMMyy
    const matchFull = tag.match(/(\d{4})$/);
    if (matchFull) {
        return parseInt(matchFull[1], 10);
    }
    return new Date().getFullYear();
}

function DebtCycleCard({
    cycle,
    onSettle,
    onQuickAdd,
}: {
    cycle: DebtCycle;
    onSettle: (cycle: DebtCycle) => void;
    onQuickAdd: (cycle: DebtCycle) => void;
}) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const isSettled = cycle.status === 'settled'
    const amountColor = isSettled
        ? 'text-emerald-700'
        : cycle.netBalance >= 0
            ? 'text-emerald-700'
            : 'text-red-600'
    const badgeLabel = cycle.tag === 'UNTAGGED' ? 'No tag' : cycle.tag

    const toggleTagFilter = () => {
        setSelectedTag(cycle.tag === selectedTag ? null : cycle.tag)
    }

    return (
        <div
            role="button"
            tabIndex={0}
        onClick={() => setSelectedTag(cycle.tag === selectedTag ? null : cycle.tag)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            toggleTagFilter()
          }
        }}
        className={`w-full rounded-lg border p-3 shadow-sm transition ${
            isSettled ? 'bg-slate-50' : 'bg-white'
        } cursor-pointer`}
    >
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                     <span
                        className={`inline-flex items-center justify-center rounded-md border bg-slate-50 px-2 py-1 text-[10px] font-semibold tracking-tight uppercase ${isSettled ? 'border-gray-200 text-gray-500' : 'border-slate-300 text-slate-700'}`}
                        title={badgeLabel}
                    >
                        {badgeLabel}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={event => {
                                event.stopPropagation()
                                onQuickAdd(cycle)
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                            title="Add Debt"
                        >
                           <Plus className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={event => {
                                event.stopPropagation()
                                onSettle(cycle)
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                            title="Settle"
                        >
                            <Check className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-0.5">
                    <p className={`text-xl font-bold ${amountColor}`}>
                        {formatCurrency(cycle.netBalance)}
                    </p>
                    <span
                        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            isSettled
                                ? 'bg-gray-200 text-gray-600'
                                : cycle.netBalance > 0
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                        }`}
                    >
                        {isSettled ? 'Settled' : cycle.netBalance > 0 ? 'They owe me' : 'I owe them'}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">
                        <span>P: {formatCurrency(Math.abs(cycle.originalPrincipal))}</span>
                        <span className="mx-1 text-slate-300">|</span>
                        <span className="text-amber-600">CB: {formatCurrency(Math.abs(cycle.totalBack ?? 0))}</span>
                    </p>
                </div>
            </div>
        </div>
    )
}

export function DebtCycleFilter({
    allCycles,
    debtAccount,
    accounts,
    categories,
    people,
    displayedCycles,
    isExpanded,
    onQuickAddSuccess,
    onSettleSuccess,
    shops,
}: {
    allCycles: DebtCycle[]
    debtAccount: DebtAccount
    accounts: Account[]
    categories: Category[]
    people: Person[]
    displayedCycles: DebtCycle[]
    isExpanded: boolean
    shops: Shop[]
    onQuickAddSuccess?: () => Promise<void> | void
    onSettleSuccess?: () => Promise<void> | void
}) {
    const router = useRouter()
    const [selectedCycle, setSelectedCycle] = useState<DebtCycle | null>(null)
    const [quickAddCycle, setQuickAddCycle] = useState<DebtCycle | null>(null)
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

    const years = useMemo(() => {
        const uniqueYears = Array.from(new Set(allCycles.map(c => getYearFromTag(c.tag)))).sort((a, b) => b - a);
        if (!uniqueYears.includes(new Date().getFullYear())) {
            uniqueYears.unshift(new Date().getFullYear());
        }
        return uniqueYears;
    }, [allCycles]);

    const filteredCycles = useMemo(() => {
        return displayedCycles.filter(cycle => getYearFromTag(cycle.tag) === selectedYear);
    }, [displayedCycles, selectedYear]);

    const openSettleDialog = (cycle: DebtCycle) => setSelectedCycle(cycle)
    const closeSettleDialog = () => setSelectedCycle(null)
    const openQuickAdd = (cycle: DebtCycle) => setQuickAddCycle(cycle)
    const closeQuickAdd = () => setQuickAddCycle(null)
    const handleQuickAddSuccess = async () => {
        closeQuickAdd()
        if (onQuickAddSuccess) {
            await onQuickAddSuccess()
        }
        router.refresh()
    }

    const handleSettleSuccess = async () => {
        closeSettleDialog()
        if (onSettleSuccess) {
            await onSettleSuccess()
        }
        router.refresh()
    }

    return (
        <>
            <div className="space-y-4">
                 {isExpanded && years.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap ${
                                    selectedYear === year
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                )}

                {isExpanded && (
                    <>
                        {filteredCycles && filteredCycles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {filteredCycles.map(cycle => (
                                    <DebtCycleCard key={cycle.tag} cycle={cycle} onSettle={openSettleDialog} onQuickAdd={openQuickAdd} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center rounded-lg bg-white py-8 px-4 shadow">
                                <p className="text-gray-500">No debt cycles found for {selectedYear}.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {quickAddCycle && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
                    onClick={closeQuickAdd}
                >
                    <div
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500">Quick Add Debt</p>
                                <p className="text-lg font-semibold text-slate-800">
                                    {quickAddCycle.tag === 'UNTAGGED' ? 'No tag' : quickAddCycle.tag}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded p-1 text-gray-500 transition hover:text-gray-800"
                                onClick={closeQuickAdd}
                                aria-label="Close quick add"
                            >
                                X
                            </button>
                        </div>
                        <TransactionForm
                            key={`${quickAddCycle.tag}-${debtAccount.id}`}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            onSuccess={handleQuickAddSuccess}
                            defaultTag={quickAddCycle.tag === 'UNTAGGED' ? undefined : quickAddCycle.tag}
                            defaultPersonId={debtAccount.owner_id ?? debtAccount.id}
                            defaultType="debt"
                        />
                    </div>
                </div>
            )}

            {selectedCycle && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
                    onClick={closeSettleDialog}
                >
                    <div
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500">Repay / Settle</p>
                                <p className="text-lg font-semibold text-slate-800">
                                    {selectedCycle.tag === 'UNTAGGED' ? 'No tag' : selectedCycle.tag}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded p-1 text-gray-500 transition hover:text-gray-800"
                                onClick={closeSettleDialog}
                                aria-label="Close settle dialog"
                            >
                                X
                            </button>
                        </div>
                        <TransactionForm
                            key={`settle-${selectedCycle.tag}-${debtAccount.id}`}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            onSuccess={handleSettleSuccess}
                            defaultTag={selectedCycle.tag === 'UNTAGGED' ? undefined : selectedCycle.tag}
                            defaultPersonId={debtAccount.owner_id ?? debtAccount.id}
                            defaultType={selectedCycle.netBalance > 0 ? 'repayment' : 'debt'}
                            initialValues={{ amount: Math.abs(selectedCycle.netBalance) }}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
