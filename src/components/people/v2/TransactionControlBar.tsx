import { Search, RotateCcw, UserMinus, Plus, Check, ChevronDown, FileText, RefreshCw, Settings, Sheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DebtCycle } from '@/hooks/use-person-details'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RolloverDebtDialog } from '@/components/people/rollover-debt-dialog'

import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import { Person, Account, Category, Shop } from '@/types/moneyflow.types'

interface TransactionControlBarProps {
    person: Person
    activeCycle: DebtCycle
    allCycles: DebtCycle[]
    onCycleChange: (tag: string) => void
    transactionCount: number
    searchTerm: string
    onSearchChange: (value: string) => void
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
    searchTerm,
    onSearchChange,
    accounts,
    categories,
    shops,
    onAddTransaction,
    currentCycleTag,
}: TransactionControlBarProps) {
    const isSettled = Math.abs(activeCycle.remains) < 100
    const isCurrentCycle = activeCycle.tag === currentCycleTag

    return (
        <div className="flex flex-col gap-4 p-4 pb-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">

                {/* LEFT GROUP */}
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                    {/* Title + Count */}
                    <div className="flex items-center gap-2 pr-2 border-r border-slate-100 flex-shrink-0">
                        <span className="font-bold text-slate-900 text-sm">Transactions</span>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {transactionCount}
                        </span>
                    </div>

                    {/* Status Action: Rollover OR Settled Badge */}
                    <div className="flex-shrink-0">
                        {!isSettled ? (
                            <RolloverDebtDialog
                                personId={person.id}
                                currentCycle={activeCycle.tag}
                                remains={activeCycle.remains}
                                trigger={
                                    <button className="flex items-center gap-1.5 h-8 px-3 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 rounded-lg text-xs font-bold transition-colors">
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Rollover
                                    </button>
                                }
                            />
                        ) : (
                            <div className="flex items-center gap-1.5 h-8 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                                <Check className="h-3.5 w-3.5" />
                                SETTLED
                            </div>
                        )}
                    </div>

                    {/* Month Selector */}
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

                    {/* Quick Actions (V2) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            onClick={() => onAddTransaction('debt')}
                            className="flex items-center gap-1.5 h-8 px-3 bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 hover:border-rose-400 rounded-lg text-xs font-bold transition-colors"
                        >
                            <UserMinus className="h-3.5 w-3.5" />
                            Debt
                        </button>

                        <button
                            onClick={() => onAddTransaction('repayment')}
                            className="flex items-center gap-1.5 h-8 px-3 bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400 rounded-lg text-xs font-bold transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Repay
                        </button>
                    </div>
                </div>

                {/* RIGHT GROUP */}
                <div className="flex items-center gap-2 w-full md:w-auto min-w-0">
                    {/* Search Bar */}
                    <div className="relative flex-1 md:w-64 md:flex-none">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search note, entity, ID..."
                            className="h-9 pl-8 pr-8 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
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

                    {/* Utility Cluster */}
                    <div className="flex items-center flex-shrink-0">
                        <ManageSheetButton
                            personId={person.id}
                            cycleTag={activeCycle.tag}
                            scriptLink={person.sheet_link}
                            googleSheetUrl={person.google_sheet_url}
                            sheetFullImg={person.sheet_full_img}
                            showBankAccount={person.sheet_show_bank_account ?? false}
                            showQrImage={person.sheet_show_qr_image ?? false}
                            size="sm"
                            buttonClassName="h-9 px-3 gap-1.5 text-xs text-slate-700 hover:bg-slate-50 border-slate-200"
                            linkedLabel={activeCycle.tag}
                            unlinkedLabel="No Sheet"
                            splitMode={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
