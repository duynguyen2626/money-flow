'use client'

import { useState } from 'react'
import { Plus, CheckCheck, Check } from 'lucide-react'
import { useTagFilter } from '@/context/tag-filter-context'
import { cn } from '@/lib/utils'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

interface DebtCycle {
    tag: string
    balance: number
    status: string
    last_activity: string
}

interface DebtCycleTabsProps {
    allCycles: DebtCycle[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
}

export function DebtCycleTabs({
    allCycles,
    accounts,
    categories,
    people,
    shops,
    personId
}: DebtCycleTabsProps) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const [activeTab, setActiveTab] = useState<'all' | 'tagged' | 'untagged'>('all')

    // Phân loại debt cycles
    const taggedCycles = allCycles.filter(cycle => cycle.tag !== 'UNTAGGED')
    const untaggedCycles = allCycles.filter(cycle => cycle.tag === 'UNTAGGED')

    // Xác định cycles để hiển thị dựa trên tab đang chọn
    const displayedCycles =
        activeTab === 'all' ? allCycles :
            activeTab === 'tagged' ? taggedCycles :
                untaggedCycles

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <button
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        activeTab === 'all' ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                    onClick={() => setActiveTab('all')}
                >
                    All ({allCycles.length})
                </button>
                <button
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        activeTab === 'tagged' ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                    onClick={() => setActiveTab('tagged')}
                >
                    Tagged ({taggedCycles.length})
                </button>
                <button
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        activeTab === 'untagged' ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                    onClick={() => setActiveTab('untagged')}
                >
                    Untagged ({untaggedCycles.length})
                </button>
            </div>

            {displayedCycles && displayedCycles.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {displayedCycles.map((cycle) => {
                        const isSelected = selectedTag === cycle.tag
                        return (
                            <div
                                key={cycle.tag}
                                onClick={() => setSelectedTag(isSelected ? null : cycle.tag)}
                                className={cn(
                                    "group relative flex flex-col justify-between rounded-xl border bg-white transition-all hover:shadow-md cursor-pointer overflow-hidden",
                                    isSelected ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/10" : "border-slate-200",
                                    "p-3 gap-3"
                                )}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-bold text-slate-900 text-sm truncate leading-tight" title={cycle.tag}>
                                            {cycle.tag === 'UNTAGGED' ? 'No tag' : cycle.tag}
                                        </h3>
                                        {isSelected && (
                                            <div className="h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                                <Check className="h-2.5 w-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-2">
                                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Balance</span>
                                        <p className={cn(
                                            "text-lg font-bold tracking-tight",
                                            cycle.status === 'settled' ? "text-slate-400" : (cycle.balance > 0 ? "text-emerald-600" : "text-red-600")
                                        )}>
                                            {numberFormatter.format(Math.abs(cycle.balance))}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                    <AddTransactionDialog
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        defaultType="debt"
                                        defaultPersonId={personId}
                                        defaultTag={cycle.tag === 'UNTAGGED' ? undefined : cycle.tag}
                                        triggerContent={
                                            <button className="flex w-full items-center justify-center gap-1 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                                                <Plus className="h-3 w-3" /> Debt
                                            </button>
                                        }
                                    />
                                    <AddTransactionDialog
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        defaultType="repayment"
                                        defaultPersonId={personId}
                                        defaultTag={cycle.tag === 'UNTAGGED' ? undefined : cycle.tag}
                                        defaultAmount={Math.abs(cycle.balance)}
                                        triggerContent={
                                            <button className="flex w-full items-center justify-center gap-1 rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                                                <CheckCheck className="h-3 w-3" /> Settle
                                            </button>
                                        }
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-8 px-4 bg-white rounded-lg shadow">
                    <p className="text-gray-500">No debt cycles recorded.</p>
                </div>
            )}
        </div>
    )
}
