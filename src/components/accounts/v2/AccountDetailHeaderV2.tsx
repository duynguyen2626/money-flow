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
    ExternalLink,
    Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account, Category } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getAccountTypeLabel } from '@/lib/account-utils'
import { getCreditCardAvailableBalance } from '@/lib/account-balance'
import { AccountSlideV2 } from './AccountSlideV2'
import { formatCycleTag, formatCycleTagWithYear } from '@/lib/cycle-utils'
import { updateAccountInfo } from '@/actions/account-actions'
import { Check, X, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface AccountDetailHeaderV2Props {
    account: Account
    allAccounts: Account[]
    categories: Category[]
    cashbackStats: AccountSpendingStats | null
    activeTab: 'transactions' | 'cashback'
    onTabChange: (tab: 'transactions' | 'cashback') => void
    selectedYear: string | null
    availableYears: string[]
    onYearChange: (year: string | null) => void
    selectedCycle?: string // For dynamic cashback badge display
    summary?: {
        yearDebtTotal: number
        debtTotal: number
        expensesTotal: number
        cashbackTotal: number
    }
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function AccountDetailHeaderV2({
    account,
    allAccounts,
    categories,
    cashbackStats,
    activeTab,
    onTabChange,
    selectedYear,
    availableYears,
    onYearChange,
    selectedCycle,
    summary,
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

    const [isEditingInfo, setIsEditingInfo] = React.useState(false)
    const [editValues, setEditValues] = React.useState({
        account_number: account.account_number || '',
        receiver_name: account.receiver_name || ''
    })

    const handleSaveInfo = async () => {
        try {
            const hasChanges =
                editValues.account_number !== (account.account_number || '') ||
                editValues.receiver_name !== (account.receiver_name || '')

            if (!hasChanges) {
                setIsEditingInfo(false)
                return
            }

            const result = await updateAccountInfo(account.id, {
                account_number: editValues.account_number || null,
                receiver_name: editValues.receiver_name || null
            })

            if (result.success) {
                toast.success('Account info updated')
                setIsEditingInfo(false)
            } else {
                toast.error('Failed to update')
            }
        } catch (error) {
            toast.error('Something went wrong')
        }
    }

    const startEditing = () => {
        setEditValues({
            account_number: account.account_number || '',
            receiver_name: account.receiver_name || account.name
        })
        setIsEditingInfo(true)
    }

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between sticky top-0 z-20 shadow-sm">
            <AccountSlideV2
                open={isSlideOpen}
                onOpenChange={setIsSlideOpen}
                account={account}
                categories={categories}
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

                <div className="flex flex-col min-w-0 flex-1 mr-4">
                    <h1 className="text-xl font-bold text-slate-900 leading-none truncate pr-2" title={account.name}>
                        {account.name}
                    </h1>

                    {/* Cycle Badge - Moved from Right Side */}
                    {isCreditCard && selectedCycle && (
                        <div className="flex items-center gap-1 mt-1.5 w-fit">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-medium whitespace-nowrap">
                                <Calendar className="h-3 w-3 text-indigo-500" />
                                <span className="text-indigo-700 font-bold">
                                    {formatCycleTagWithYear(selectedCycle)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Center: Main Stats */}
            <div className="flex items-center gap-6 px-6 border-l border-r border-slate-100 mx-4 hidden lg:flex z-10 relative">
                {isCreditCard ? (
                    <>
                        {/* Section 1: Limit + Waiver Progress Bars (Compact) */}
                        <div className="flex flex-col gap-2 min-w-[340px]">
                            {/* Limit Bar */}
                            {(() => {
                                const limit = account.credit_limit || 0
                                const usage = limit > 0 ? Math.min((outstandingBalance / limit) * 100, 100) : 0
                                const isDanger = usage > 90
                                const isWarning = usage > 70 && usage <= 90

                                return (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="flex items-center gap-2 group cursor-help">
                                                <span className="text-[9px] font-bold text-rose-500/80 uppercase tracking-widest leading-none flex-shrink-0 w-16 text-right">
                                                    Limit
                                                </span>
                                                <div className="relative h-5 flex-1 border border-slate-200 rounded-md bg-slate-50 hover:border-indigo-300 transition-all overflow-hidden flex items-center">
                                                    {/* Progress Fill */}
                                                    <div
                                                        className={cn(
                                                            "absolute inset-0 h-full transition-all duration-500 ease-out opacity-20 group-hover:opacity-30",
                                                            isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-indigo-500"
                                                        )}
                                                        style={{ width: `${usage}%` }}
                                                    />
                                                    {/* Progress Line */}
                                                    <div
                                                        className={cn(
                                                            "absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-out",
                                                            isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-indigo-500"
                                                        )}
                                                        style={{ width: `${usage}%` }}
                                                    />
                                                    {/* Embedded Text */}
                                                    <div className="absolute inset-0 flex items-center justify-between px-2 pr-10 pointer-events-none w-full">
                                                        <span className="text-[10px] font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                                                            {numberFormatter.format(outstandingBalance)}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                                                            {numberFormatter.format(limit)}
                                                        </span>
                                                    </div>
                                                    {/* Percentage Chip */}
                                                    <div className={cn(
                                                        "absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-sm text-[9px] font-black tabular-nums",
                                                        isDanger ? "bg-rose-100 text-rose-700" : isWarning ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                                                    )}>
                                                        {usage.toFixed(0)}%
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-max z-[9999]" align="start" sideOffset={8}>
                                            <div className="text-xs space-y-1">
                                                <div className="font-bold">Credit Limit Usage</div>
                                                <div>Outstanding: {numberFormatter.format(outstandingBalance)}</div>
                                                <div>Limit: {numberFormatter.format(limit)}</div>
                                                <div>Usage: {usage.toFixed(0)}%</div>
                                                <div className="pt-1 border-t border-slate-200" />
                                                <div>Total nợ trong năm: {summary ? numberFormatter.format(summary.yearDebtTotal) : '—'}</div>
                                                <div>Tiền Debt: {summary ? numberFormatter.format(summary.debtTotal) : '—'}</div>
                                                <div>My expenses: {summary ? numberFormatter.format(summary.expensesTotal) : '—'}</div>
                                                <div>Cashback: {summary ? numberFormatter.format(summary.cashbackTotal) : '—'}</div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )
                            })()}

                            {/* Waiver Bar OR Placeholder */}
                            {account.annual_fee_waiver_target && account.stats?.annual_fee_waiver_target > 0 ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="flex items-center gap-2 group cursor-help">
                                            <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest leading-none flex-shrink-0 w-16 text-right">
                                                Waiver
                                            </span>
                                            <div className="relative h-5 flex-1 border border-slate-200 rounded-md bg-slate-50 hover:border-amber-300 transition-all overflow-hidden flex items-center">
                                                {/* Progress Fill */}
                                                <div
                                                    className="absolute inset-0 h-full transition-all duration-500 ease-out opacity-20 group-hover:opacity-30 bg-amber-500"
                                                    style={{ width: `${account.stats.annual_fee_waiver_progress}%` }}
                                                />
                                                {/* Progress Line */}
                                                <div
                                                    className="absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-out bg-amber-500"
                                                    style={{ width: `${account.stats.annual_fee_waiver_progress}%` }}
                                                />
                                                {/* Embedded Text */}
                                                <div className="absolute inset-0 flex items-center justify-between px-2 pr-10 pointer-events-none w-full">
                                                    <span className="text-[10px] font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                                                        {numberFormatter.format(account.stats.spent_this_cycle)}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                                                        {numberFormatter.format(account.stats.annual_fee_waiver_target)}
                                                    </span>
                                                </div>
                                                {/* Percentage Chip */}
                                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-sm text-[9px] font-black tabular-nums bg-amber-100 text-amber-700">
                                                    {account.stats.annual_fee_waiver_met ? '100%' : `${account.stats.annual_fee_waiver_progress.toFixed(0)}%`}
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-max z-[9999]" align="start" sideOffset={8}>
                                        <div className="text-xs space-y-1">
                                            <div className="font-bold">Annual Fee Waiver</div>
                                            <div>Spent: {numberFormatter.format(account.stats.spent_this_cycle)}</div>
                                            <div>Target: {numberFormatter.format(account.stats.annual_fee_waiver_target)}</div>
                                            {!account.stats.annual_fee_waiver_met && (
                                                <div className="text-amber-600">
                                                    Need: {numberFormatter.format(account.stats.annual_fee_waiver_target - account.stats.spent_this_cycle)}
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                /* No Need Waiver Placeholder */
                                <div className="flex items-center gap-2 opacity-60">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none flex-shrink-0 w-16 text-right">
                                        WAIVER
                                    </span>
                                    <div className="h-5 flex-1 bg-slate-50 border border-slate-200/60 rounded-md flex items-center justify-start px-2 gap-2">
                                        <div className="flex items-center justify-center h-3 w-3 rounded-full bg-emerald-100 text-emerald-600">
                                            <TrendingUp className="h-2 w-2 transform rotate-180" />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">No annual Fee</span>
                                    </div>
                                </div>
                            )}
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
                {/* Account Number & Info - Replaces Cycle Date */}
                {/* Account Number & Info - Replaces Cycle Date */}
                <div className="flex flex-col items-end mr-2 text-right relative group/edit">
                    {!isEditingInfo ? (
                        <div
                            onClick={startEditing}
                            className="cursor-pointer hover:bg-slate-50 p-1 -m-1 rounded transition-colors relative"
                            title="Click to quick edit"
                        >
                            {account.account_number ? (
                                <>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span className="text-sm font-bold text-slate-700 leading-none">
                                            {account.account_number}
                                        </span>
                                        <Edit className="h-3 w-3 text-slate-300 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 block whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                                        {account.receiver_name || account.name}
                                    </span>
                                </>
                            ) : (
                                <div className="flex flex-col items-end opacity-40 hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">No Account #</span>
                                        <div className="p-0.5 bg-slate-100 rounded">
                                            <Hash className="h-3 w-3 text-slate-400" />
                                        </div>
                                        <Edit className="h-3 w-3 text-slate-300 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 items-end bg-white p-2 rounded-lg border border-slate-200 shadow-lg absolute right-0 top-0 z-50 min-w-[220px]">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 w-full text-left">Quick Edit</div>
                            <Input
                                value={editValues.account_number}
                                onChange={(e) => setEditValues(prev => ({ ...prev, account_number: e.target.value }))}
                                placeholder="Account Number"
                                className="h-7 text-xs font-bold"
                                autoFocus
                            />
                            <Input
                                value={editValues.receiver_name}
                                onChange={(e) => setEditValues(prev => ({ ...prev, receiver_name: e.target.value }))}
                                placeholder="Receiver Name"
                                className="h-7 text-xs font-bold"
                            />
                            <div className="flex items-center gap-1 mt-1 justify-end w-full">
                                <button
                                    onClick={() => setIsEditingInfo(false)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={handleSaveInfo}
                                    className="p-1 bg-indigo-50 hover:bg-indigo-100 rounded text-indigo-600 border border-indigo-200"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

                {/* Year Filter - Only for non-credit accounts */}
                {!isCreditCard && availableYears.length > 0 && (
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
                )}

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
