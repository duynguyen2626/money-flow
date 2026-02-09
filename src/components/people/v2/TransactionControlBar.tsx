import { Search, RotateCcw, UserMinus, Plus, Check, ChevronDown, RefreshCw, RefreshCcw, X, Clipboard, Info, ArrowUpRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
    onCycleSelect?: (tag: string, year: string | null) => void
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
    initialSheetUrl?: string | null
    onRefresh?: () => void
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
    onCycleSelect,
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
    initialSheetUrl,
    onRefresh,
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

                {/* 1. Primary Actions: Add + Sync Controller */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Add Menu */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                onMouseEnter={(e) => {
                                    const btn = e.currentTarget
                                    btn.click()
                                }}
                                className="flex items-center gap-2 h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0 shadow-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Add
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="start">
                            <div className="space-y-0.5">
                                <button
                                    onClick={() => onAddTransaction('debt')}
                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-sm text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                    <UserMinus className="h-4 w-4" />
                                    Lend
                                </button>
                                <button
                                    onClick={() => onAddTransaction('repayment')}
                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-sm text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    Repay
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Integrated Sync & Cycle Controller */}
                    <ManageSheetButton
                        personId={person.id}
                        cycleTag={activeCycle.tag}
                        initialSheetUrl={initialSheetUrl}
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

                        // Pass history props
                        allCycles={allCycles}
                        availableYears={availableYears}
                        selectedYear={selectedYear}
                        onCycleChange={onCycleChange}
                        onYearChange={onYearChange}
                        currentCycleTag={currentCycleTag}
                        isSettled={isSettled}
                        activeCycleRemains={activeCycle.remains}
                        isPending={isPending}
                    />
                </div>

                <div className="h-6 w-px bg-slate-200 hidden md:block" />

                {/* 2. Basic Filters Group */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <TypeFilterDropdown
                        value={filterType}
                        onChange={onFilterTypeChange}
                        allowedTypes={['all', 'lend', 'repay', 'cashback']}
                    />

                    <StatusDropdown value={statusFilter} onChange={onStatusChange} />

                    <div className="min-w-[140px]">
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
                </div>

                {/* 3. Dynamic Search Bar (Stretches to fill gap) */}
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <button
                        type="button"
                        onClick={handlePasteSearch}
                        className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Paste"
                    >
                        <Clipboard className="h-3.5 w-3.5" />
                    </button>
                    <Input
                        placeholder="Search transactions..."
                        className="h-9 pl-12 pr-8 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors w-full"
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

                <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <TooltipProvider delayDuration={100}>
                        {!isSettled ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div> {/* Wrapper for PopoverTrigger inside Tooltip */}
                                        <RolloverDebtDialog
                                            personId={person.id}
                                            currentCycle={activeCycle.tag}
                                            remains={activeCycle.remains}
                                            trigger={
                                                <button
                                                    className="flex items-center gap-1.5 h-9 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-100 transition-colors"
                                                >
                                                    <ArrowUpRight className="h-4 w-4" />
                                                    Rollover
                                                </button>
                                            }
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="center" className="z-[100]">
                                    <p>Forward outstanding debt to current cycle</p>
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <div className="flex items-center gap-1.5 h-9 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                <Check className="h-4 w-4" />
                                Settled
                            </div>
                        )}

                        {paidCount > 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onViewPaid}
                                        className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-700 transition-colors uppercase tracking-wider"
                                    >
                                        <Check className="h-4 w-4" />
                                        +{paidCount} paid
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="center" className="z-[100]">
                                    <p>View recently paid transactions</p>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {onRefresh && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onRefresh}
                                        className="flex items-center justify-center h-9 w-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors flex-shrink-0 shadow-sm"
                                    >
                                        <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="end" className="z-[100]">
                                    <p>Refresh table data</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </TooltipProvider>
                </div>
            </div>
        </div>
    )
}
