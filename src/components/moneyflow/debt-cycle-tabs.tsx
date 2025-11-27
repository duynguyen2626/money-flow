'use client'

import { useState } from 'react'
import { Plus, CheckCheck } from 'lucide-react'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'

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
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    onClick={() => setActiveTab('all')}
                >
                    All ({allCycles.length})
                </button>
                <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'tagged'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    onClick={() => setActiveTab('tagged')}
                >
                    Tagged ({taggedCycles.length})
                </button>
                <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'untagged'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    onClick={() => setActiveTab('untagged')}
                >
                    Untagged ({untaggedCycles.length})
                </button>
            </div>

            {displayedCycles && displayedCycles.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {displayedCycles.map((cycle) => (
                        <div key={cycle.tag} className="flex flex-col justify-between p-3 rounded-lg shadow-sm border bg-white">
                            <div>
                                <div className="flex items-start justify-between">
                                    <h3 className="font-semibold text-gray-800 truncate text-sm" title={cycle.tag}>
                                        {cycle.tag === 'UNTAGGED' ? 'No tag' : cycle.tag}
                                    </h3>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${cycle.status === 'settled'
                                            ? 'bg-gray-200 text-gray-600'
                                            : cycle.balance > 0
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                        {cycle.status === 'settled'
                                            ? 'Settled'
                                            : cycle.balance > 0
                                                ? 'Owes'
                                                : 'Owe'}
                                    </span>
                                </div>
                                <p className={`mt-1 text-lg font-bold ${cycle.status === 'settled'
                                        ? 'text-gray-400'
                                        : cycle.balance > 0
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                    }`}>
                                    {new Intl.NumberFormat('en-US', {
                                        maximumFractionDigits: 0,
                                        notation: 'compact'
                                    }).format(Math.abs(cycle.balance))}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 mt-2">
                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={people}
                                    shops={shops}
                                    defaultType="debt"
                                    defaultPersonId={personId}
                                    defaultTag={cycle.tag === 'UNTAGGED' ? undefined : cycle.tag}
                                    triggerContent={
                                        <div className="flex flex-col items-center justify-center gap-0.5 w-full p-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer">
                                            <Plus className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-medium">Debt</span>
                                        </div>
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
                                        <div className="flex flex-col items-center justify-center gap-0.5 w-full p-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer">
                                            <CheckCheck className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-medium">Settle</span>
                                        </div>
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 px-4 bg-white rounded-lg shadow">
                    <p className="text-gray-500">No debt cycles recorded.</p>
                </div>
            )}
        </div>
    )
}
