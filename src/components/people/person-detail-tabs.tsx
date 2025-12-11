'use client'

import { useState, useMemo } from 'react'
import { LayoutDashboard, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { SmartFilterBar } from '@/components/moneyflow/smart-filter-bar'
import { DebtCycleList } from '@/components/moneyflow/debt-cycle-list'
import { SheetSyncControls } from '@/components/people/sheet-sync-controls'

interface PersonDetailTabsProps {
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
    sheetProfileId: string
    sheetLink?: string | null
    transactions: any[]
}

export function PersonDetailTabs({
    accounts,
    categories,
    people,
    shops,
    personId,
    sheetProfileId,
    sheetLink,
    transactions,
}: PersonDetailTabsProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'sheet'>('details')
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'lend' | 'repay'>('all')
    const [searchTerm, setSearchTerm] = useState('')

    const tabs = [
        { id: 'details' as const, label: 'Details', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'sheet' as const, label: 'Sheet Link', icon: <LinkIcon className="h-4 w-4" /> },
    ]

    return (
        <div className="flex flex-col w-full">
            {/* Tab Headers */}
            <div className="flex-none flex border-b border-slate-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                            activeTab === tab.id
                                ? "text-blue-600 border-blue-600"
                                : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="py-4">
                {activeTab === 'details' && (
                    <div className="flex flex-col space-y-4">
                        {/* Header Area: Search + Smart Filters */}
                        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center px-1">
                            <div className="relative w-full md:w-64 shrink-0">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full rounded-md border border-slate-300 pl-3 pr-8 py-1.5 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <span className="sr-only">Clear</span>
                                        &times;
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <SmartFilterBar
                                    transactions={transactions}
                                    selectedType={filterType}
                                    onSelectType={setFilterType}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Accordion View (Multiple Tables) */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                            <DebtCycleList
                                transactions={transactions}
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                personId={personId}
                                filterType={filterType}
                                searchTerm={searchTerm}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'sheet' && (
                    <div>
                        <SheetSyncControls personId={sheetProfileId} sheetLink={sheetLink} />
                    </div>
                )}
            </div>
        </div>
    )
}

