'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { LayoutDashboard, Link as LinkIcon, History, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account, Category, Person, PersonCycleSheet, Shop } from '@/types/moneyflow.types'
import { SmartFilterBar } from '@/components/moneyflow/smart-filter-bar'
import { DebtCycleList } from '@/components/moneyflow/debt-cycle-list'
import { SplitBillManager } from '@/components/people/split-bill-manager'
import { SheetSyncControls } from '@/components/people/sheet-sync-controls'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'

interface PersonDetailTabsProps {
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
    sheetProfileId: string
    sheetLink?: string | null
    googleSheetUrl?: string | null
    transactions: any[]
    cycleSheets?: PersonCycleSheet[]
}

export function PersonDetailTabs({
    accounts,
    categories,
    people,
    shops,
    personId,
    sheetProfileId,
    sheetLink,
    googleSheetUrl,
    transactions,
    cycleSheets = [],
}: PersonDetailTabsProps) {
    const searchParams = useSearchParams()

    const resolveTab = (value: string | null) => {
        if (value === 'sheet' || value === 'details' || value === 'split-bill') {
            return value
        }
        return 'details'
    }

    const initialTab = useMemo(() => resolveTab(searchParams.get('tab')), [searchParams])
    const [activeTab, setActiveTab] = useState<'details' | 'sheet' | 'history' | 'split-bill'>(initialTab)
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer'>('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        setActiveTab(resolveTab(searchParams.get('tab')))
    }, [searchParams])

    const tabs = [
        { id: 'details' as const, label: 'Details', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'history' as const, label: 'History', icon: <History className="h-4 w-4" /> },
        { id: 'sheet' as const, label: 'Sheet Link', icon: <LinkIcon className="h-4 w-4" /> },
        { id: 'split-bill' as const, label: 'Split Bill', icon: <DollarSign className="h-4 w-4" /> },
    ]

    return (
        <div className="flex flex-col w-full">
            <div className="flex-none flex border-b border-slate-200 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px md:px-4 md:text-sm",
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

            <div className="py-3 md:py-4">
                {activeTab === 'details' && (
                    <div className="flex flex-col space-y-4">
                        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center md:px-1">
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
                            <div className="w-full overflow-x-auto md:overflow-visible">
                                <SmartFilterBar
                                    transactions={transactions}
                                    selectedType={filterType}
                                    onSelectType={setFilterType}
                                    className="min-w-max flex-nowrap"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 md:p-4">
                            <DebtCycleList
                                transactions={transactions}
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                personId={personId}
                                sheetProfileId={sheetProfileId}
                                cycleSheets={cycleSheets}
                                filterType={filterType}
                                searchTerm={searchTerm}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <UnifiedTransactionTable
                            transactions={transactions}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            context="person"
                            contextId={personId}
                            showPagination={true}
                            pageSize={20}
                        />
                    </div>
                )}

                {activeTab === 'sheet' && (
                    <div>
                        <SheetSyncControls
                            personId={sheetProfileId}
                            sheetLink={sheetLink}
                            googleSheetUrl={googleSheetUrl}
                        />
                    </div>
                )}

                {activeTab === 'split-bill' && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-4">
                        <SplitBillManager
                            transactions={transactions}
                            personId={personId}
                            people={people}
                            accounts={accounts}
                            categories={categories}
                            shops={shops}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
