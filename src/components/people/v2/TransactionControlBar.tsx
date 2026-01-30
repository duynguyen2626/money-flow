import { Search, RotateCcw, UserMinus, Plus, Check, ChevronDown, RefreshCw, History, X, Clipboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DebtCycle } from '@/hooks/use-person-details'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
}

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
}: TransactionControlBarProps) {
    const isSettled = Math.abs(activeCycle.remains) < 100
    const isCurrentCycle = activeCycle.tag === currentCycleTag

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
        <div className="flex flex-col gap-2 p-4 pb-0">
            {/* Single Row: Status + Paid + Cycle Selector + Filters + Sheet */}
            <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                
                {/* 1. Title */}
                <span className="font-bold text-slate-900 text-sm flex-shrink-0">Transactions</span>
                
                {/* 2. Status Badge */}
                {!isSettled ? (
                    <div className="flex items-center gap-1.5 h-8 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold flex-shrink-0">
                        <History className="h-3.5 w-3.5" />
                        OUTSTANDING
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 h-8 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex-shrink-0">
                        <Check className="h-3.5 w-3.5" />
                        SETTLED
                    </div>
                )}
                
                {/* 3. Rollover Button (if not settled) */}
                {!isSettled && (
                    <RolloverDebtDialog
                        personId={person.id}
                        currentCycle={activeCycle.tag}
                        remains={activeCycle.remains}
                        trigger={
                            <button className="flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-amber-700 transition-colors flex-shrink-0">
                                <RefreshCw className="h-3.5 w-3.5" />
                                Rollover
                            </button>
                        }
                    />
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
                
                {/* 5. Cycle Dropdown */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-xs transition-colors flex-shrink-0 group">
                            <span className={cn("font-bold text-slate-700", !isCurrentCycle && "text-indigo-600")}>
                                {activeCycle.tag}
                            </span>
                            {!isSettled && (
                                <span className="font-bold text-rose-600 border-l border-slate-200 pl-2">
                                    {numberFormatter.format(activeCycle.remains)}
                                </span>
                            )}
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-1" align="start">
                        <div className="max-h-[300px] overflow-y-auto">
                            {!isCurrentCycle && (
                                <button
                                    onClick={() => onCycleChange(currentCycleTag)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-xs mb-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                >
                                    <span className="font-bold flex items-center gap-2">
                                        <RotateCcw className="w-3 h-3" />
                                        Back to Current ({getMonthDisplayName(currentCycleTag)})
                                    </span>
                                </button>
                            )}
                            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                History
                            </div>
                            {allCycles.map(cycle => {
                                const cycleSettled = Math.abs(cycle.remains) < 100
                                return (
                                    <button
                                        key={cycle.tag}
                                        onClick={() => onCycleChange(cycle.tag)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-xs mb-0.5",
                                            activeCycle.tag === cycle.tag ? "bg-slate-100" : "hover:bg-slate-50"
                                        )}
                                    >
                                        <span className={cn("font-bold", activeCycle.tag === cycle.tag ? "text-slate-900" : "text-slate-600")}>
                                            {getMonthDisplayName(cycle.tag)}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            {!cycleSettled ? (
                                                <span className="font-bold text-rose-600">
                                                    {numberFormatter.format(cycle.remains)}
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase">Settled</span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 flex-shrink-0 hidden md:block" />
                
                {/* 6. Type Filter */}
                <TypeFilterDropdown value={filterType} onChange={onFilterTypeChange} />
                
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
                
                {/* 11. Add Menu */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0">
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
