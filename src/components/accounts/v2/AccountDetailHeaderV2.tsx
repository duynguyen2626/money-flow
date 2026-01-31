"use client"

import React from 'react'
import Link from 'next/link'
import {
    ChevronLeft,
    ChevronDown,
    Settings,
    CreditCard,
    Wallet,
    Landmark,
    CircleDollarSign,
    History,
    TrendingDown,
    TrendingUp,
    LineChart,
    Edit,
    ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getAccountTypeLabel } from '@/lib/account-utils'
import { getCreditCardAvailableBalance } from '@/lib/account-balance'
import { AccountSlideV2 } from './AccountSlideV2'
import { formatCycleTag, formatCycleTagWithYear } from '@/lib/cycle-utils'
import { Calendar } from 'lucide-react'

interface AccountDetailHeaderV2Props {
    account: Account
    allAccounts: Account[]
    cashbackStats: AccountSpendingStats | null
    activeTab: 'transactions' | 'cashback'
    onTabChange: (tab: 'transactions' | 'cashback') => void
    selectedYear: string | null
    availableYears: string[]
    onYearChange: (year: string | null) => void
    selectedCycle?: string // For dynamic cashback badge display
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function AccountDetailHeaderV2({
    account,
    allAccounts,
    cashbackStats,
    activeTab,
    onTabChange,
    selectedYear,
    availableYears,
    onYearChange,
    selectedCycle,
}: AccountDetailHeaderV2Props) {
    const [isSlideOpen, setIsSlideOpen] = React.useState(false)
    const [dynamicCashbackStats, setDynamicCashbackStats] = React.useState<AccountSpendingStats | null>(cashbackStats)
    const [isCashbackLoading, setIsCashbackLoading] = React.useState(false)

    const isCreditCard = account.type === 'credit_card'
    const availableBalance = isCreditCard ? getCreditCardAvailableBalance(account) : account.current_balance ?? 0
    const outstandingBalance = isCreditCard ? Math.abs(account.current_balance ?? 0) : 0

    const typeLabel = getAccountTypeLabel(account.type)

    // Recalculate cashback stats when selectedCycle changes
    React.useEffect(() => {
        if (!selectedCycle || !isCreditCard) {
            // Reset to initial stats if no cycle selected
            setDynamicCashbackStats(cashbackStats)
            return
        }

        const fetchCashbackStats = async () => {
            setIsCashbackLoading(true)
            try {
                // Convert cycle tag (YYYY-MM) to a date in the middle of that cycle
                // Cycle format: 25.01 - 24.02 means Jan 25 to Feb 24
                // So for cycle tag "2025-02", we want a date in Feb (e.g., Feb 10)
                const [yearStr, monthStr] = selectedCycle.split('-')
                const year = parseInt(yearStr, 10)
                const month = parseInt(monthStr, 10)
                // Use the 10th of the cycle's end month as reference
                const cycleDate = new Date(year, month - 1, 10)
                
                const response = await fetch(`/api/cashback/stats?accountId=${account.id}&date=${cycleDate.toISOString()}`)
                if (response.ok) {
                    const data = await response.json()
                    setDynamicCashbackStats(data)
                }
            } catch (error) {
                console.error('Failed to fetch cashback stats:', error)
                // Fall back to initial stats on error
                setDynamicCashbackStats(cashbackStats)
            } finally {
                setIsCashbackLoading(false)
            }
        }

        fetchCashbackStats()
    }, [selectedCycle, account.id, isCreditCard, cashbackStats])

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between sticky top-0 z-20 shadow-sm">
            <AccountSlideV2
                open={isSlideOpen}
                onOpenChange={setIsSlideOpen}
                account={account}
            />

            {/* Left: Account Info */}
            <div className="flex items-center gap-3">
                <Link
                    href="/accounts"
                    className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Link>

                <div className="relative">
                    <div className="w-10 h-10 overflow-hidden flex items-center justify-center">
                        {account.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={account.image_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-lg font-bold text-slate-400 capitalize">{account.name.charAt(0)}</div>
                        )}
                    </div>
                    {account.type === 'credit_card' && (
                        <div className="absolute -top-1 -right-1 bg-indigo-500 text-white p-0.5 rounded-full border border-white shadow-sm">
                            <CreditCard className="w-2.5 h-2.5" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 leading-none">{account.name}</h1>
                        <span className={cn(
                            "text-[9px] uppercase font-black px-1.5 py-0.5 rounded border leading-none tracking-wider",
                            isCreditCard
                                ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        )}>
                            {typeLabel}
                        </span>
                    </div>
                    {account.account_number && (
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {account.account_number}
                        </span>
                    )}
                </div>
            </div>

            {/* Center: Main Stats */}
            <div className="flex items-center gap-6 px-6 border-l border-r border-slate-100 mx-4 hidden lg:flex">
                {isCreditCard ? (
                    <>
                        {/* Section 1: Limit Progress Bar (Outstanding / Limit) */}
                        <div className="flex flex-col gap-1 min-w-[240px]">
                            {/* Line 1: Outstanding Amount with Limit */}
                            <div className="flex items-center justify-between px-0.5 min-h-[17px]">
                                <span className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest leading-none">
                                    Outstanding
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black text-rose-600 leading-none">
                                        {numberFormatter.format(outstandingBalance)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 leading-none">/</span>
                                    <span className="text-[10px] font-bold text-slate-500 leading-none">
                                        {numberFormatter.format(account.credit_limit || 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Line 2: Progress Bar */}
                            {(() => {
                                const limit = account.credit_limit || 0
                                const usage = limit > 0 ? Math.min((outstandingBalance / limit) * 100, 100) : 0
                                const isDanger = usage > 90
                                const isWarning = usage > 70 && usage <= 90

                                return (
                                    <div className="relative h-6 w-full cursor-help group border border-slate-200 rounded-md bg-slate-50 hover:border-indigo-300 transition-all overflow-hidden">
                                        {/* Progress Fill */}
                                        <div
                                            className={cn(
                                                "absolute inset-0 h-full transition-all duration-500 ease-out opacity-20 group-hover:opacity-30",
                                                isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-indigo-500"
                                            )}
                                            style={{ width: `${usage}%` }}
                                        />
                                        {/* Progress Line at bottom */}
                                        <div
                                            className={cn(
                                                "absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-out",
                                                isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-indigo-500"
                                            )}
                                            style={{ width: `${usage}%` }}
                                        />

                                        {/* Embedded Text */}
                                        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                                            <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                                {limit > 0 ? numberFormatter.format(limit) : '—'}
                                            </span>
                                            <span className={cn(
                                                "text-[10px] font-bold tabular-nums",
                                                isDanger ? "text-rose-600" : isWarning ? "text-amber-600" : "text-indigo-600"
                                            )}>
                                                {usage.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Divider */}
                        {dynamicCashbackStats && <div className="h-12 w-px bg-slate-200" />}

                        {/* Section 3: Cashback Progress (if available) */}
                        {dynamicCashbackStats && (
                            <div className="flex flex-col gap-1 min-w-[280px]">
                                {/* Line 1: Status + Need to Spend Text */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        {/* Status Badge + Need Amount */}
                                        {(() => {
                                            const spendProgress = dynamicCashbackStats.currentSpend || 0
                                            const spendTarget = dynamicCashbackStats.minSpend || 0
                                            const remainingSpend = Math.max(0, spendTarget - spendProgress)
                                            const isMet = spendTarget > 0 && spendProgress >= spendTarget

                                            if (!isMet && spendTarget > 0) {
                                                return (
                                                    <div className="flex items-center gap-1">
                                                        <div className="h-3.5 px-1.5 flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 rounded-[3px] text-[8px] font-black uppercase tracking-tight leading-none">
                                                            PENDING
                                                        </div>
                                                        <span className="text-[11px] font-black text-rose-600 flex items-center gap-1 leading-none">
                                                            <span className="text-xs">⚠️</span>
                                                            Needs {numberFormatter.format(remainingSpend)}
                                                        </span>
                                                    </div>
                                                )
                                            } else if (isMet) {
                                                return (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-3.5 px-1.5 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-[3px] text-[8px] font-black uppercase tracking-tight leading-none">
                                                            MET
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            Rewards
                                                        </span>
                                                    </div>
                                                )
                                            } else {
                                                return (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-3.5 px-1.5 flex items-center justify-center bg-slate-50 text-slate-600 border border-slate-100 rounded-[3px] text-[8px] font-black uppercase tracking-tight leading-none">
                                                            CASHBACK
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            Rewards
                                                        </span>
                                                    </div>
                                                )
                                            }
                                        })()}
                                    </div>

                                    {/* Cycle Badge */}
                                    {(() => {
                                        // Show selected cycle if available, otherwise show current cycle
                                        const displayCycle = selectedCycle || dynamicCashbackStats?.cycle?.tag
                                        const displayLabel = selectedCycle 
                                            ? (dynamicCashbackStats?.cycle?.tag === selectedCycle 
                                                ? dynamicCashbackStats.cycle.label 
                                                : formatCycleTag(selectedCycle) || selectedCycle)
                                            : dynamicCashbackStats?.cycle?.label
                                        
                                        if (!displayCycle) return null
                                        
                                        const isCurrent = displayCycle === dynamicCashbackStats?.cycle?.tag
                                        
                                        return (
                                            <TooltipProvider>
                                                <Tooltip delayDuration={200}>
                                                    <TooltipTrigger asChild>
                                                        <div className={cn(
                                                            "flex items-center gap-1 px-2 py-1 border rounded cursor-help transition-colors",
                                                            isCurrent 
                                                                ? "bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
                                                                : "bg-slate-50 hover:bg-slate-100 border-slate-300"
                                                        )}>
                                                            <Calendar className={cn(
                                                                "h-3 w-3",
                                                                isCurrent ? "text-indigo-500" : "text-slate-500"
                                                            )} />
                                                            <span className={cn(
                                                                "text-[9px] font-bold uppercase tracking-wide",
                                                                isCurrent ? "text-indigo-600" : "text-slate-600"
                                                            )}>
                                                                {displayLabel}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="text-xs">
                                                            <div className="font-semibold mb-1">
                                                                {isCurrent ? 'Current Billing Cycle' : 'Selected Cycle'}
                                                            </div>
                                                            <div className="text-slate-400">
                                                                {formatCycleTagWithYear(displayCycle)}
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )
                                    })()}
                                </div>

                                {/* Line 2: Progress Bar */}
                                {(() => {
                                    const spendProgress = dynamicCashbackStats.currentSpend || 0
                                    const spendTarget = dynamicCashbackStats.minSpend || 0
                                    const percentage = spendTarget > 0 ? Math.min((spendProgress / spendTarget) * 100, 100) : 0

                                    return (
                                        <div className="relative w-full h-6 bg-slate-50 rounded-md border border-slate-200 overflow-hidden group">
                                            {/* Progress Fill */}
                                            <div
                                                className="absolute inset-0 h-full transition-all duration-500 ease-out bg-indigo-500 opacity-20 group-hover:opacity-30"
                                                style={{ width: `${percentage}%` }}
                                            />
                                            {/* Bottom Line */}
                                            <div
                                                className="absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-out bg-indigo-500"
                                                style={{ width: `${percentage}%` }}
                                            />

                                            {/* Embedded Text */}
                                            <div className="absolute inset-0 flex items-center justify-end px-2 pointer-events-none">
                                                <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                                                    {spendTarget > 0 ? (
                                                        <>
                                                            {numberFormatter.format(spendProgress)} <span className="text-slate-400 mx-0.5">/</span> {percentage.toFixed(0)}%
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">No target set</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Non-Credit Card: Balance */}
                        <div className="flex flex-col min-w-[100px]">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 text-center lg:text-left">
                                Balance
                            </span>
                            <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-emerald-500" />
                                <span className={cn(
                                    "text-lg font-black tracking-tight leading-none",
                                    availableBalance < 0 ? "text-rose-600" : "text-slate-900"
                                )}>
                                    {numberFormatter.format(availableBalance)}
                                </span>
                            </div>
                        </div>

                        {/* Account Type */}
                        <div className="flex flex-col min-w-[100px]">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 text-center lg:text-left">
                                Type
                            </span>
                            <div className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-600 capitalize leading-none">
                                    {account.type.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Right: Tools & Actions */}
            <div className="flex items-center gap-2 ml-auto">
                {/* Cycle Date Range Display - Only for credit cards with selected cycle */}
                {isCreditCard && selectedCycle ? (
                    <div className="h-9 px-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-md text-xs font-medium">
                        <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="font-bold text-indigo-700">
                            {formatCycleTagWithYear(selectedCycle)}
                        </span>
                    </div>
                ) : !isCreditCard && availableYears.length > 0 ? (
                    /* Year Filter - Only for non-credit accounts */
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="h-9 px-3 flex items-center gap-2 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors text-xs font-medium shadow-sm">
                                <span className="font-bold">{selectedYear || availableYears[0]}</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-32 p-1" align="end">
                            {availableYears.map(year => (
                                <button
                                    key={year}
                                    onClick={() => onYearChange(year)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-sm text-xs",
                                        selectedYear === year ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50"
                                    )}
                                >
                                    {year}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>
                ) : null}

                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

                {/* Tab Actions */}
                <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => onTabChange('transactions')}
                        className={cn(
                            "h-7 px-3 flex items-center gap-1.5 rounded-md text-[10px] font-black uppercase transition-all",
                            activeTab === 'transactions'
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <History className="h-3 w-3" />
                        History
                    </button>
                    {isCreditCard && (
                        <button
                            onClick={() => onTabChange('cashback')}
                            className={cn(
                                "h-7 px-3 flex items-center gap-1.5 rounded-md text-[10px] font-black uppercase transition-all",
                                activeTab === 'cashback'
                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <LineChart className="h-3 w-3" />
                            Cashback
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setIsSlideOpen(true)}
                    className="h-9 px-3 flex items-center gap-1.5 border border-slate-200 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                >
                    <Settings className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Settings</span>
                </button>
            </div>
        </div >
    )
}
