'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { LayoutDashboard, Link as LinkIcon, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account, Category, Person, PersonCycleSheet, Shop } from '@/types/moneyflow.types'
import { SmartFilterBar } from '@/components/moneyflow/smart-filter-bar'
import { DebtCycleList } from '@/components/moneyflow/debt-cycle-list'
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

    // Resolve the active tab, defaulting to 'details'
    const resolveTab = (value: string | null) => {
        if (value === 'sheet' || value === 'history') {
            return value
        }
        return 'details'
    }

    const initialTab = useMemo(() => resolveTab(searchParams.get('tab')), [searchParams])
    const [activeTab, setActiveTab] = useState<'details' | 'sheet' | 'history'>(initialTab)
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer'>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Effect to update tab from URL, but enforce 'details' logic if needed
    // The user requested: "mở page people details people/ids cần phải mở tab details (luôn luôn) không bao giờ được mở tab History"
    // This implies that on initial load, or if the URL implies history without explicit intent, we should default properly.
    // The current logic `resolveTab` already defaults to 'details' if `tab` param is missing or invalid.
    // However, if the user specifically asked "never open history" tab on load, maybe they mean even if ?tab=history is present?
    // "mở page people details people/ids cần phải mở tab details (luôn luôn)" => This likely refers to specific navigation paths or just the default.
    // If I interpret "never be History" strictly:

    // Let's refine based on "luôn luôn" (always).
    // If the URL is just `/people/[id]`, it opens 'details'.
    // If the previous code opened 'history' by default, that would be the bug.
    // The previous code was:
    /*
      const resolveTab = (value: string | null) => {
        if (value === 'sheet' || value === 'history' || value === 'details') {
            return value
        }
        return 'details'
      }
    */
    // If the user navigates to `/people/[id]`, value is null, so it becomes 'details'.
    // So if the user is seeing 'History' by default, maybe they are clicking a link that includes `?tab=history`?
    // OR maybe they want to FORCE 'details' even if `?tab=history` is present?
    // "không bao giờ được mở tab History" translates to "Never allowed to open History tab". 
    // This sounds like they want to disable the History tab or at least ensure it's never the default active one.

    // However, given the context of "mở page people details", it sounds like the default landing experience.
    // I will enforce that `initialTab` ignores 'history' from URL if strictly followed, OR ensure that links in the app don't point to it.
    // But since I can't control all external links, I will modify `resolveTab` to prefer 'details' unless explicitly 'sheet'. 
    // Wait, if I change `resolveTab` to not accept 'history', then the user can never click the History tab? No, `setActiveTab` is local state.
    // The `useEffect` syncs with URL.

    // Let's assume the user means "Default to Details". The current code does that.
    // Maybe there was a previous state persistence or something? No.
    // Let's check if `initialTab` logic is sound. It seems sound.

    // Re-reading user request: "mở page people details people/ids cần phải mở tab details (luôn luôn) không bao giờ được mở tab History"
    // Valid interpretation: Ensure the default state is ALWAYS details.

    // IF the user is complaining, it might be because some navigation (like clicking a row in the People table) sends them to `?tab=history`.
    // I will check `components/people/people-list.tsx` later if needed.
    // For now, I will modify `resolveTab` to STRICTLY prohibit 'history' as an initial state derived from URL if that is what they want, 
    // OR just ensure the default catch-all is 'details'.

    // Actually, looking at the previous file content, `resolveTab` WAS accepting 'history'.
    // If I remove 'history' from `resolveTab`, then even if URL has `?tab=history`, it will default to 'details'.
    // This effectively satisfies "never open tab History" (on load). User can still click the tab manually.

    const resolveTabStrict = (value: string | null) => {
        if (value === 'sheet') {
            return 'sheet'
        }
        // If value is 'history' or anything else, force 'details'
        return 'details'
    }

    // We use the strict resolver for initialization to ensure we land on details.
    // But if we want to allow deep linking to 'sheet', we keep that.
    // We explicitly exclude 'history' from the allowed initial tabs.

    const initialTabStrict = useMemo(() => resolveTabStrict(searchParams.get('tab')), [searchParams])
    const [activeTabStrict, setActiveTabStrict] = useState<'details' | 'sheet' | 'history'>(initialTabStrict)

    useEffect(() => {
        // Update state when URL changes, but applying the same strict rule? 
        // If the user clicks the "History" tab, we usually use `setActiveTab` which updates local state. 
        // We might NOT be updating the URL.
        // If we update URL, `useEffect` triggers.
        // Let's check if the tabs update the URL. Currently they DO NOT (buttons just call `setActiveTab`).
        // So `useEffect` only listens to browser navigation (back/forward or external links).

        const nextTab = resolveTabStrict(searchParams.get('tab'))
        setActiveTabStrict(nextTab)
    }, [searchParams])

    const tabs = [
        { id: 'details' as const, label: 'Details', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'history' as const, label: 'History', icon: <History className="h-4 w-4" /> },
        { id: 'sheet' as const, label: 'Sheet Link', icon: <LinkIcon className="h-4 w-4" /> },
    ]

    return (
        <div className="flex flex-col w-full">
            {/* Tab Headers */}
            <div className="flex-none flex border-b border-slate-200 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTabStrict(tab.id)}
                        className={cn(
                            "flex items-center gap-2 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px md:px-4 md:text-sm",
                            activeTabStrict === tab.id
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
            <div className="py-3 md:py-4">
                {activeTabStrict === 'details' && (
                    <div className="flex flex-col space-y-4">
                        {/* Header Area: Search + Smart Filters */}
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

                        {/* Accordion View (Multiple Tables) */}
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

                {activeTabStrict === 'history' && (
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

                {activeTabStrict === 'sheet' && (
                    <div>
                        <SheetSyncControls
                            personId={sheetProfileId}
                            sheetLink={sheetLink}
                            googleSheetUrl={googleSheetUrl}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
