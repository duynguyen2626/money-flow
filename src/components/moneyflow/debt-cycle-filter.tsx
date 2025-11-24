'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTagFilter } from '@/context/tag-filter-context'
import { SettleDebtDialog } from './settle-debt-dialog'
import { TransactionForm } from './transaction-form'
import { Account, Category, DebtAccount, Person, Shop } from '@/types/moneyflow.types'
import type { DebtByTagAggregatedResult } from '@/services/debt.service'

type DebtCycle = DebtByTagAggregatedResult

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
    return numberFormatter.format(value)
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
        className={`w-full rounded-lg border p-3 shadow-sm transition ${
            isSettled ? 'bg-slate-50' : 'bg-white'
        } cursor-pointer`}
    >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                            className={`flex h-8 w-8 items-center justify-center rounded-md border bg-slate-50 text-[10px] font-semibold tracking-tight uppercase ${isSettled ? 'border-gray-200 text-gray-500' : 'border-slate-300 text-slate-700'}`}
                            title={tagLabel}
                        >
                            {badgeLabel}
                        </span>
                        <span className={`text-xs font-semibold ${cycle.tag === 'UNTAGGED' ? 'text-gray-500' : 'text-slate-700'}`}>
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
                        className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 whitespace-nowrap"
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
                        className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 whitespace-nowrap"
                    >
                        Settle
                    </button>
                </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
                <p className={`text-2xl font-bold ${amountColor}`}>
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
                <p className="text-[11px] text-gray-600">
                    <span>Principal: {formatCurrency(Math.abs(cycle.originalPrincipal))}</span>
                    <span className="mx-1 text-slate-400">|</span>
                    <span className="text-amber-600">Cashback: {formatCurrency(Math.abs(cycle.totalBack ?? 0))}</span>
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

    const openSettleDialog = (cycle: DebtCycle) => setSelectedCycle(cycle)
    const closeSettleDialog = () => setSelectedCycle(null)
    const openQuickAdd = (cycle: DebtCycle) => setQuickAddCycle(cycle)
    const closeQuickAdd = () => setQuickAddCycle(null)
    const handleQuickAddSuccess = async () => {
        closeQuickAdd()
        if (onQuickAddSuccess) {
            await onQuickAddSuccess()
        } else {
            router.refresh()
        }
    }

    const handleSettleSuccess = async () => {
        closeSettleDialog()
        if (onSettleSuccess) {
            await onSettleSuccess()
        } else {
            router.refresh()
        }
    }

    return (
        <>
            <div className="space-y-4">
                {isExpanded && (
                    <>
                        {displayedCycles && displayedCycles.length > 0 ? (
                            <div className="grid grid-cols-1 justify-items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {displayedCycles.map(cycle => (
                                    <DebtCycleCard key={cycle.tag} cycle={cycle} onSettle={openSettleDialog} onQuickAdd={openQuickAdd} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center rounded-lg bg-white py-8 px-4 shadow">
                                <p className="text-gray-500">No debt cycles recorded.</p>
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
                <SettleDebtDialog
                    debt={debtAccount}
                    accounts={accounts}
                    onClose={closeSettleDialog}
                    onSuccess={handleSettleSuccess}
                    defaultTag={selectedCycle.tag === 'UNTAGGED' ? undefined : selectedCycle.tag}
                    defaultAmount={Math.abs(selectedCycle.netBalance)}
                />
            )}
        </>
    )
}
