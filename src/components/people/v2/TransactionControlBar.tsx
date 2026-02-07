import { Search, RotateCcw, UserMinus, Plus, Check, ChevronDown, RefreshCw, RefreshCcw, X, Clipboard, Info } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { DebtCycle } from '@/hooks/use-person-details'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import { RolloverDebtDialog } from '@/components/people/rollover-debt-dialog'
import { TypeFilterDropdown, FilterType } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusDropdown, StatusFilter } from '@/components/transactions-v2/header/StatusDropdown'
import { QuickFilterDropdown } from '@/components/transactions-v2/header/QuickFilterDropdown'
import { toast } from 'sonner'

import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import { Person, Account, Category, Shop } from '@/types/moneyflow.types'

interface PaidCounterProps {
    paidCount: number
    onViewPaid: () => void
}

interface TransactionControlBarProps {
    person: Person
    activeCycle: DebtCycle
    allCycles: DebtCycle[]
    onCycleChange: (tag: string) => void
    availableYears: string[]
    selectedYear: string | null
    onYearChange: (year: string | null) => void
    transactionCount: number
    paidCount: number
    onViewPaid: () => void
    searchTerm: string
    onSearchChange: (value: string) => void
    filterType: FilterType
    onFilterTypeChange: (value: FilterType) => void
    statusFilter: StatusFilter
    onStatusChange: (value: StatusFilter) => void
    selectedAccountId?: string
    onAccountChange: (value?: string) => void
    accountItems: { id: string; name: string; image_url?: string | null }[]
    accounts: Account[]
    categories: Category[]
    shops: Shop[]
    onAddTransaction: (type: string) => void
    currentCycleTag: string
    isPending?: boolean
}

import { useRouter } from 'next/navigation'

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

function getMonthDisplayName(tag: string) {
    if (!tag.includes('-')) return tag
    const [year, month] = tag.split('-')
    return `${month}/${year}`
}

export function TransactionControlBar({
    person,
    activeCycle,
    allCycles,
    onCycleChange,
    availableYears,
    selectedYear,
    onYearChange,
    transactionCount,
    paidCount,
    onViewPaid,
    searchTerm,
    onSearchChange,
    filterType,
    onFilterTypeChange,
    statusFilter,
    onStatusChange,
    selectedAccountId,
    onAccountChange,
    accountItems,
    accounts,
    categories,
    shops,
    onAddTransaction,
    currentCycleTag,
    isPending: isPendingProp,
}: TransactionControlBarProps) {
    const [popoverOpen, setPopoverOpen] = useState(false)
    const isSettled = Math.abs(activeCycle.remains) < 100
    const isCurrentCycle = activeCycle.tag === currentCycleTag
    const isAllHistory = selectedYear === null
    const cycleLabel = isAllHistory ? 'All History' : activeCycle.tag

    const handleCycleChange = (tag: string) => {
        onCycleChange(tag)
    }

    const handleYearChange = (year: string | null) => {
        onYearChange(year)
    }

    const isPending = isPendingProp

    const handlePasteSearch = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (text) onSearchChange(text)
        } catch (err) {
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                toast.error('Clipboard access denied. Please allow clipboard permission.')
                return
            }
            toast.error('Unable to read clipboard.')
        }
    }

    return (
        <div className="flex flex-col gap-2 p-4 pb-0 relative">
            {isPending && (
                <div className="absolute inset-0 bg-white/40 z-50 flex items-center justify-center rounded-xl backdrop-blur-[1px] animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-2xl shadow-xl border border-slate-200/50">
                        <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                        <span className="text-[11px] font-bold text-slate-600 tracking-tight uppercase">Syncing...</span>
                    </div>
                </div>
            )}
            {/* Single Row: Status + Paid + Cycle Selector + Filters + Sheet */}
            <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">

                {/* 1. Status Text with Tooltip */}
                {!isSettled ? (
                    <RolloverDebtDialog
                        personId={person.id}
                        currentCycle={activeCycle.tag}
                        remains={activeCycle.remains}
                        trigger={
                            <span
                                className="flex items-center gap-1.5 h-8 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold flex-shrink-0 cursor-pointer hover:bg-amber-100 transition-colors"
                                title="Click to rollover outstanding debt to next cycle"
                            >
                                <RefreshCcw className="h-3.5 w-3.5" />
                                ROLLOVER
                            </span>
                        }
                    />
                ) : (
                    <div className="flex items-center gap-1.5 h-8 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex-shrink-0">
                        <Check className="h-3.5 w-3.5" />
                        SETTLED
                    </div>
                )}

                {/* 4. Paid Count Button */}
                {paidCount > 0 && (
                    <button
                        onClick={onViewPaid}
                        className="flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors flex-shrink-0"
                    >
                        <Check className="h-3.5 w-3.5" />
                        +{paidCount} paid
                    </button>
                )}

                {/* 5. Cycle Dropdown with Year Filter & All History */}
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger
                        asChild
                        onMouseEnter={() => setPopoverOpen(true)}
                        onMouseLeave={() => { }}
                    >
                        <button className="flex items-center gap-2 h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-xs transition-colors flex-shrink-0 group">
                            <span className={cn("font-bold text-slate-700", !isCurrentCycle && !isAllHistory && "text-indigo-600")}>
                                {cycleLabel}
                            </span>
                            <div className="flex items-center gap-2 min-w-[92px] justify-end border-l border-slate-200 pl-2">
                                {isAllHistory ? (
                                    <span className="text-amber-700 font-bold">All</span>
                                ) : isSettled ? (
                                    <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide">Settled</span>
                                ) : (
                                    <span className="font-bold text-rose-600">
                                        {numberFormatter.format(activeCycle.remains)}
                                    </span>
                                )}
                            </div>
                            {isPending ? (
                                <RefreshCw className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-72 p-1"
                        align="start"
                        onMouseEnter={() => setPopoverOpen(true)}
                        onMouseLeave={() => setPopoverOpen(false)}
                    >
                        <div className="max-h-[400px] overflow-y-auto">
                            {/* All History Option - Context Aware */}
                            <button
                                onClick={() => {
                                    if (selectedYear) {
                                        // If a year is selected, 'All History' means 'All [Year]'
                                        onCycleChange('all')
                                    } else {
                                        // If no year, it means 'All Time'
                                        handleYearChange(null)
                                        onCycleChange('all')
                                    }
                                    setPopoverOpen(false)
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-xs mb-1",
                                    (selectedYear === null || activeCycle.tag === 'all') ? "bg-amber-50 text-amber-700" : "hover:bg-slate-50"
                                )}
                            >
                                <span className={cn("font-bold flex items-center gap-2", (selectedYear === null || activeCycle.tag === 'all') ? "text-amber-900" : "text-slate-600")}>
                                    <RefreshCcw className="w-3 h-3" />
                                    {selectedYear ? `All ${selectedYear}` : 'All History'}
                                </span>
                            </button>

                            {!isCurrentCycle && (
                                <button
                                    onClick={() => {
                                        handleCycleChange(currentCycleTag)
                                        setPopoverOpen(false)
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-xs mb-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                >
                                    <span className="font-bold flex items-center gap-2">
                                        <RotateCcw className="w-3 h-3" />
                                        Back to Current ({getMonthDisplayName(currentCycleTag)})
                                    </span>
                                </button>
                            )}

                            {/* Year Divider */}
                            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                By Year
                            </div>

                            {/* Year Buttons */}
                            {availableYears.map(year => (
                                <div key={year} className="mb-1">
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-500 bg-slate-50">{year}</div>
                                    {allCycles
                                        .filter(c => c.tag.startsWith(year))
                                        .map(cycle => {
                                            const cycleSettled = Math.abs(cycle.remains) < 100
                                            return (
                                                <button
                                                    key={cycle.tag}
                                                    onClick={() => {
                                                        handleCycleChange(cycle.tag)
                                                        onYearChange(year)
                                                        setPopoverOpen(false)
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-xs mb-0.5",
                                                        activeCycle.tag === cycle.tag ? "bg-slate-100" : "hover:bg-slate-50"
                                                    )}
                                                >
                                                    <span className={cn("font-bold", activeCycle.tag === cycle.tag ? "text-slate-900" : "text-slate-600")}>
                                                        {getMonthDisplayName(cycle.tag)}
                                                    </span>
                                                    <div className="flex items-center gap-2 min-w-[96px] justify-end">
                                                        {!cycleSettled ? (
                                                            <span className="font-bold text-rose-600">
                                                                {numberFormatter.format(cycle.remains)}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide">Settled</span>
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 flex-shrink-0 hidden md:block" />

                {/* 6. Type Filter */}
                <TypeFilterDropdown
                    value={filterType}
                    onChange={onFilterTypeChange}
                    allowedTypes={['all', 'lend', 'repay', 'cashback']}
                />

                {/* 7. Status Filter */}
                <StatusDropdown value={statusFilter} onChange={onStatusChange} />

                {/* 8. Account Filter */}
                <div className="min-w-[160px]">
                    <QuickFilterDropdown
                        items={accountItems.map(account => ({
                            id: account.id,
                            name: account.name,
                            image: account.image_url || undefined,
                            type: 'account' as const
                        }))}
                        value={selectedAccountId}
                        onValueChange={onAccountChange}
                        placeholder="Accounts"
                        fullWidth
                        emptyText="No accounts"
                    />
                </div>

                {/* 9. Search Bar */}
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <button
                        type="button"
                        onClick={handlePasteSearch}
                        className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Paste"
                    >
                        <Clipboard className="h-3.5 w-3.5" />
                    </button>
                    <Input
                        placeholder="Search note, entity, ID..."
                        className="h-9 pl-12 pr-8 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* 10. Sheet Functions */}
                <ManageSheetButton
                    personId={person.id}
                    cycleTag={activeCycle.tag}
                    scriptLink={person.sheet_link}
                    googleSheetUrl={person.google_sheet_url}
                    sheetFullImg={person.sheet_full_img}
                    showBankAccount={person.sheet_show_bank_account ?? false}
                    sheetLinkedBankId={person.sheet_linked_bank_id || null}
                    showQrImage={person.sheet_show_qr_image ?? false}
                    accounts={accounts}
                    size="sm"
                    buttonClassName="h-9 px-3 gap-1.5 text-xs text-slate-700 hover:bg-slate-50 border-slate-200 flex-shrink-0"
                    linkedLabel={activeCycle.tag}
                    unlinkedLabel="No Sheet"
                    splitMode={true}
                />

                {/* 11. Add Menu (Hover to open) */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            onMouseEnter={(e) => {
                                const btn = e.currentTarget
                                btn.click()
                            }}
                            className="flex items-center gap-2 h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end">
                        <div className="space-y-0.5">
                            <button
                                onClick={() => onAddTransaction('debt')}
                                className="w-full flex items-center gap-2 px-2 py-2 rounded-sm text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                                <UserMinus className="h-3.5 w-3.5" />
                                Lend
                            </button>
                            <button
                                onClick={() => onAddTransaction('repayment')}
                                className="w-full flex items-center gap-2 px-2 py-2 rounded-sm text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Repay
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}
