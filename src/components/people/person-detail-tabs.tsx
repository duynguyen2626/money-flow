'use client'

import { useState } from 'react'
import { LayoutDashboard, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { DebtCycleTabs } from '@/components/moneyflow/debt-cycle-tabs'
import { SheetSyncControls } from '@/components/people/sheet-sync-controls'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'

interface DebtCycle {
    tag: string
    balance: number
    status: string
    last_activity: string
    total_debt?: number
    total_repaid?: number
}

interface PersonDetailTabsProps {
    debtCycles: DebtCycle[]
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
    debtCycles,
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

    const tabs = [
        { id: 'details' as const, label: 'Details', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'sheet' as const, label: 'Sheet Link', icon: <LinkIcon className="h-4 w-4" /> },
    ]

    return (
        <div className="mt-4">
            {/* Tab Headers */}
            <div className="flex border-b border-slate-200">
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
                    <div className="space-y-6">
                        {/* Debt Cycles */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Debt Cycles</h3>
                            <DebtCycleTabs
                                allCycles={debtCycles}
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                personId={personId}
                            />
                        </div>

                        {/* Transactions */}
                        <div>
                            <FilterableTransactions
                                transactions={transactions}
                                categories={categories}
                                accounts={accounts}
                                people={people}
                                shops={shops}
                                accountId={personId}
                                accountType="debt"
                                hidePeopleColumn
                                context="person"
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
