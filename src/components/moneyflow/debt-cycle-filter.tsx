'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTagFilter } from '@/context/tag-filter-context'
import { SettleDebtDialog } from './settle-debt-dialog'
import { TransactionForm } from './transaction-form'
import { Account, Category, DebtAccount } from '@/types/moneyflow.types'
import type { DebtByTagAggregatedResult } from '@/services/debt.service'

type DebtCycle = DebtByTagAggregatedResult

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
    return currencyFormatter.format(value)
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
    const tagLabel = cycle.tag === 'UNTAGGED' ? 'No tag' : cycle.tag
    const badgeLabel = cycle.tag === 'UNTAGGED' ? '-' : cycle.tag

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
        className={`w-full rounded-xl border p-4 shadow-sm transition ${
            isSettled ? 'bg-slate-50' : 'bg-white'
        } cursor-pointer`}
    >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="flex items-center gap-2"
                        onClick={event => {
                            event.stopPropagation()
                            setSelectedTag(cycle.tag === selectedTag ? null : cycle.tag)
                        }}
                    >
                        <span
                            className={`flex h-10 w-10 items-center justify-center rounded-lg border bg-slate-50 text-xs font-semibold tracking-tight uppercase ${isSettled ? 'border-gray-200 text-gray-500' : 'border-slate-300 text-slate-700'}`}
                            title={tagLabel}
                        >
                            {badgeLabel}
                        </span>
                        <span className={`text-sm font-semibold ${cycle.tag === 'UNTAGGED' ? 'text-gray-500' : 'text-slate-700'}`}>
                            {tagLabel}
                        </span>
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:flex-row">
                    <button
                        type="button"
                        onClick={event => {
                            event.stopPropagation()
                            onQuickAdd(cycle)
                        }}
                        className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 whitespace-nowrap"
                    >
                        <span className="text-base leading-none">+</span>
                        <span>Quick add debt</span>
                    </button>
                    <button
                        type="button"
                        onClick={event => {
                            event.stopPropagation()
                            onSettle(cycle)
                        }}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 whitespace-nowrap"
                    >
                        Settle
                    </button>
                </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
                <p className={`text-3xl font-bold ${amountColor}`}>
                    {formatCurrency(cycle.netBalance)}
                </p>
                <span
                    className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${
                        isSettled
                            ? 'bg-gray-200 text-gray-600'
                            : cycle.netBalance > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                    }`}
                >
                    {isSettled ? 'Settled' : cycle.netBalance > 0 ? 'They owe me' : 'I owe them'}
                </span>
                <p className="text-xs text-gray-600">
                    <span>Goc: {formatCurrency(Math.abs(cycle.originalPrincipal))}</span>
                    <span className="mx-1 text-slate-400">|</span>
                    <span className="text-amber-600">Back: {formatCurrency(Math.abs(cycle.totalBack ?? 0))}</span>
                </p>
            </div>
        </div>
    )
}

export function DebtCycleFilter({
    allCycles,
    debtAccount,
    accounts,
    categories,
}: {
    allCycles: DebtCycle[]
    debtAccount: DebtAccount
    accounts: Account[]
    categories: Category[]
}) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'all' | 'tagged' | 'untagged'>('all')
    const [isExpanded, setIsExpanded] = useState(false)
    const [selectedCycle, setSelectedCycle] = useState<DebtCycle | null>(null)
    const [quickAddCycle, setQuickAddCycle] = useState<DebtCycle | null>(null)

    const taggedCycles = allCycles.filter(cycle => cycle.tag && cycle.tag !== 'UNTAGGED')
    const untaggedCycles = allCycles.filter(cycle => !cycle.tag || cycle.tag === 'UNTAGGED')

    let displayedCycles = allCycles
    if (activeTab === 'tagged') {
        displayedCycles = taggedCycles
    } else if (activeTab === 'untagged') {
        displayedCycles = untaggedCycles
    }

    if (selectedTag) {
        displayedCycles = displayedCycles.filter(cycle => cycle.tag === selectedTag)
    }

    const clearTagSelection = () => setSelectedTag(null)
    const handleTabClick = (tab: 'all' | 'tagged' | 'untagged') => {
        const nextExpanded = activeTab === tab ? !isExpanded : true
        setActiveTab(tab)
        setIsExpanded(nextExpanded)
        clearTagSelection()
    }
    const openSettleDialog = (cycle: DebtCycle) => setSelectedCycle(cycle)
    const closeSettleDialog = () => setSelectedCycle(null)
    const openQuickAdd = (cycle: DebtCycle) => setQuickAddCycle(cycle)
    const closeQuickAdd = () => setQuickAddCycle(null)
    const handleQuickAddSuccess = () => {
        closeQuickAdd()
        router.refresh()
    }
    const toggleExpand = () => setIsExpanded(prev => !prev)

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            activeTab === 'all'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => handleTabClick('all')}
                    >
                        All ({allCycles.length})
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            activeTab === 'tagged'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => handleTabClick('tagged')}
                    >
                        Tagged ({taggedCycles.length})
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            activeTab === 'untagged'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => handleTabClick('untagged')}
                    >
                        No tag ({untaggedCycles.length})
                    </button>

                    {selectedTag && (
                        <button
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                            onClick={clearTagSelection}
                        >
                            Viewing: {selectedTag} (Show all)
                        </button>
                    )}

                    <button
                        className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
                        onClick={toggleExpand}
                    >
                        {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                </div>

                {isExpanded && (
                    <>
                        {displayedCycles && displayedCycles.length > 0 ? (
                            <div className="grid grid-cols-2 justify-items-center gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {displayedCycles.map(cycle => (
                                    <DebtCycleCard key={cycle.tag} cycle={cycle} onSettle={openSettleDialog} onQuickAdd={openQuickAdd} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center rounded-lg bg-white py-8 px-4 shadow">
                                <p className="text-gray-500">Kh?ng c? k? n? n?o du?c ghi nh?n.</p>
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
                                <p className="text-xs font-semibold uppercase text-slate-500">Them no nhanh</p>
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
                            onSuccess={handleQuickAddSuccess}
                            defaultTag={quickAddCycle.tag === 'UNTAGGED' ? undefined : quickAddCycle.tag}
                            defaultPersonId={debtAccount.id}
                            defaultType="debt"
                        />
                    </div>
                </div>
            )}

            {selectedCycle && (
                <SettleDebtDialog
                    debt={debtAccount}
                    accounts={accounts}
                    onClose={closeSettleDialog}
                    defaultTag={selectedCycle.tag === 'UNTAGGED' ? undefined : selectedCycle.tag}
                    defaultAmount={Math.abs(selectedCycle.netBalance)}
                />
            )}
        </>
    )
}
