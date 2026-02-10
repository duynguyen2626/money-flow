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
    Hash,
    Calculator,
    Info,
    Zap,
} from 'lucide-react'
import { cn, formatCompactMoney, formatMoneyVND } from '@/lib/utils'
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

    // Family Balance Calculation
    const isParent = account.relationships?.is_parent
    const parentId = account.parent_account_id
    const accountFamilyId = isParent ? account.id : parentId
    const familyChildren = accountFamilyId ? allAccounts.filter(a => a.parent_account_id === accountFamilyId && a.id !== account.id) : []
    const childrenBalancesSum = familyChildren.reduce((sum, child) => sum + (child.current_balance || 0), 0)
    const mainAccountBalance = isParent ? (account.current_balance || 0) : (allAccounts.find(a => a.id === parentId)?.current_balance || 0)
    const familyDebtAbs = Math.abs(mainAccountBalance + childrenBalancesSum)
    const soloDebtAbs = Math.abs(account.current_balance || 0)

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
                account_number: editValues.account_number || undefined,
                receiver_name: editValues.receiver_name || undefined
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
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between sticky top-0 z-[110] shadow-sm">
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
                    <div className="w-10 h-10 overflow-hidden flex items-center justify-center rounded-none border border-slate-100 shadow-sm bg-white">
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

                    {/* Cycle & Category Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {isCreditCard && selectedCycle && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-medium whitespace-nowrap">
                                <Calendar className="h-3 w-3 text-indigo-500" />
                                <span className="text-indigo-700 font-bold">
                                    {formatCycleTagWithYear(selectedCycle)}
                                </span>
                            </div>
                        )}

                        {(() => {
                            if (!account.cashback_config) return null;
                            try {
                                const config = typeof account.cashback_config === 'string'
                                    ? JSON.parse(account.cashback_config)
                                    : account.cashback_config;

                                let rules = (config.levels?.[0]?.rules) || [];
                                if (!Array.isArray(rules) || rules.length === 0) {
                                    rules = config.rules || [];
                                }
                                if (!Array.isArray(rules) || rules.length === 0) {
                                    rules = (config.program?.levels?.[0]?.rules) || [];
                                }
                                if (!Array.isArray(rules) || rules.length === 0) return null;

                                const catIds = new Set<string>();
                                rules.forEach((r: any) => {
                                    if (Array.isArray(r.categoryIds)) r.categoryIds.forEach((id: string) => catIds.add(id));
                                    if (r.categoryId) catIds.add(r.categoryId);
                                    if (Array.isArray(r.category_ids)) r.category_ids.forEach((id: string) => catIds.add(id));
                                });

                                if (catIds.size === 0) return null;

                                const allCatIds = Array.from(catIds);
                                return (
                                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                                        <TooltipProvider delayDuration={100}>
                                            {allCatIds.map(cid => {
                                                const cat = categories?.find(c => c.id === cid);
                                                if (!cat) return null;
                                                return (
                                                    <Tooltip key={cid}>
                                                        <TooltipTrigger asChild>
                                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-600 border-r last:border-0 border-slate-200 pr-1 last:pr-1 first:pl-0 pl-1 cursor-help" title={cat.name}>
                                                                {cat.icon && <span className="text-[9px] shrink-0">{cat.icon}</span>}
                                                                <span className="truncate max-w-[80px]">{cat.name}</span>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="p-0 border-none bg-transparent shadow-2xl z-[10001]">
                                                            <div className="w-[300px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
                                                                <div className="bg-indigo-600 px-3.5 py-2.5 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Zap className="w-3.5 h-3.5 text-white fill-white/20" />
                                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Rewards Detail</span>
                                                                    </div>
                                                                </div>
                                                                <div className="p-2 space-y-0.5">
                                                                    <div className="flex items-center justify-between gap-3 group/cat py-1.5 px-2 rounded-lg transition-colors">
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-sm leading-none">{cat.icon || '🎯'}</span>
                                                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{cat.name}</span>
                                                                        </div>
                                                                        {cat.mcc_codes && cat.mcc_codes.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                                                                                {cat.mcc_codes.map(mcc => (
                                                                                    <code key={mcc} className="px-1.5 py-0.5 bg-indigo-50 rounded text-[9px] font-black text-indigo-600 border border-indigo-100">
                                                                                        {mcc}
                                                                                    </code>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )
                                            })}
                                        </TooltipProvider>
                                    </div>
                                )
                            } catch (e) {
                                return null;
                            }
                        })()}
                    </div>
                </div>
            </div>

            {/* Center: Main Stats */}
            <div className="flex items-center flex-1 hidden lg:flex z-10 relative">
                {/* Section: Receiver Info Cluster */}
                <div className="flex flex-col gap-1 min-w-[180px] px-6 border-l border-slate-100 group/info">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            Receiver Info
                        </span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="h-4 w-4 flex items-center justify-center rounded bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover/info:opacity-100">
                                    <Edit className="h-2.5 w-2.5" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] z-[10001]" align="start" sideOffset={8}>
                                <div className="space-y-4 p-1">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <div className="h-6 w-6 rounded-md bg-indigo-50 flex items-center justify-center">
                                            <Edit className="h-3.5 w-3.5 text-indigo-500" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Edit Account Info</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Account Number</label>
                                            <Input
                                                value={editValues.account_number}
                                                onChange={(e) => setEditValues(prev => ({ ...prev, account_number: e.target.value }))}
                                                placeholder="Enter account number..."
                                                className="h-9 text-sm font-bold bg-slate-50/50"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Receiver Name</label>
                                            <Input
                                                value={editValues.receiver_name}
                                                onChange={(e) => setEditValues(prev => ({ ...prev, receiver_name: e.target.value }))}
                                                placeholder="Enter full name..."
                                                className="h-9 text-sm font-bold bg-slate-50/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <button onClick={handleSaveInfo} className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-black uppercase tracking-wider shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                                            <Check className="h-3.5 w-3.5" /> Update Info
                                        </button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="text-[14px] font-black tabular-nums text-slate-800 tracking-tight leading-none truncate">
                        {account.account_number || 'N/A'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 truncate tracking-tight pt-0.5">
                        {account.receiver_name || account.name}
                    </div>
                </div>

                {isCreditCard ? (
                    <>
                        {/* Section 0: Available Balance Block */}
                        <div className="flex flex-col gap-1.5 min-w-[160px] px-6 border-l border-slate-100">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="cursor-help group/avail">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none group-hover/avail:text-indigo-600 transition-colors">
                                            Available
                                        </span>
                                        <div className={cn(
                                            "text-[22px] font-black tabular-nums tracking-tighter leading-none shadow-sm",
                                            availableBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {numberFormatter.format(availableBalance)}
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 border-none bg-transparent shadow-2xl z-[10001]" align="start" sideOffset={8}>
                                    <div className="w-[280px] bg-[#0c111d] rounded-xl border border-white/10 overflow-hidden shadow-2xl text-white">
                                        <div className="bg-emerald-950/50 px-3 py-2 flex items-center gap-2 border-b border-white/5">
                                            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Available Balance</span>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-400 font-bold">Credit Limit:</span>
                                                <span className="font-black tabular-nums">{numberFormatter.format(account.credit_limit || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-400 font-bold">Solid Debt:</span>
                                                <span className="font-black tabular-nums text-rose-400">-{numberFormatter.format(soloDebtAbs)}</span>
                                            </div>
                                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-emerald-400 font-black text-[10px] uppercase">Remaining:</span>
                                                <span className="text-[14px] font-black tabular-nums text-emerald-400">{numberFormatter.format(availableBalance)}</span>
                                            </div>
                                            <div className="pt-2 border-t border-white/5 text-[9px] text-slate-500 italic">
                                                Formula: Limit + Total In - Total Out
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Section 1: Limit + Progress Bars */}
                        <div className="flex flex-col gap-2 min-w-[320px] px-6 border-l border-slate-100">
                            {(() => {
                                const limit = account.credit_limit || 0
                                const usage = limit > 0 ? Math.min((outstandingBalance / limit) * 100, 100) : 0
                                const isDanger = usage > 90
                                const isWarning = usage > 70 && usage <= 90

                                return (
                                    <div className="w-full space-y-1.5 group/limit">
                                        <div className="flex items-center justify-between w-full min-h-[14px]">
                                            <div className="flex items-center gap-1.5 leading-none">
                                                {account.stats?.annual_fee_waiver_target && account.stats.annual_fee_waiver_target > 0 && (
                                                    (() => {
                                                        const target = account.stats.annual_fee_waiver_target || 0;
                                                        const rawSpent = account.stats.spent_this_cycle || 0;
                                                        const currentBalanceAbs = Math.abs(account.current_balance || 0);
                                                        const spent = Math.max(rawSpent, currentBalanceAbs);
                                                        const remaining = target - spent;
                                                        const isMet = remaining <= 0;
                                                        const formatWaiverAmount = (val: number) => {
                                                            const absVal = Math.abs(val);
                                                            if (absVal >= 1000000) return (val / 1000000).toFixed(1) + "tr";
                                                            return formatCompactMoney(val);
                                                        };
                                                        return (
                                                            <span className={cn(
                                                                "text-[8px] font-bold leading-none px-1 rounded-sm",
                                                                isMet ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                                                            )}>
                                                                {isMet ? 'Waiver met' : `Needs ${formatWaiverAmount(remaining)}`}
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Limit</span>
                                            </div>
                                            <span className="text-[11px] font-black text-slate-700 leading-none">
                                                {numberFormatter.format(limit)}
                                            </span>
                                        </div>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <div className={cn(
                                                    "relative h-6 w-full border rounded-md bg-slate-50/50 hover:border-indigo-300 transition-all overflow-hidden flex items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] cursor-help",
                                                    account.annual_fee_waiver_target ? "border-amber-200/80" : "border-slate-200"
                                                )}>
                                                    <div className={cn(
                                                        "absolute inset-0 h-full transition-all duration-700 ease-out opacity-25 group-hover:opacity-35",
                                                        isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-indigo-500"
                                                    )} style={{ width: `${usage}%` }} />

                                                    <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none w-full">
                                                        <div className="flex items-center gap-1 leading-none">
                                                            {account.annual_fee_waiver_target && (
                                                                <Zap className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                                                            )}
                                                            <span className="text-[10px] font-black text-slate-400 tabular-nums">
                                                                {usage.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-800 tabular-nums drop-shadow-sm">
                                                            {numberFormatter.format(outstandingBalance)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-0 border-none bg-transparent shadow-2xl z-[10001]" align="start" sideOffset={8}>
                                                <div className="w-[300px] bg-[#0c111d] rounded-xl border border-white/10 overflow-hidden shadow-2xl text-white">
                                                    {/* Header: Balance Calculation */}
                                                    <div className="bg-indigo-950/50 px-3 py-2.5 flex items-center justify-between border-b border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Balance Calculation</span>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 space-y-3">
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-[11px]">
                                                                <span className="text-slate-400 font-bold">Main Account:</span>
                                                                <span className="font-black tabular-nums">{numberFormatter.format(Math.abs(account.current_balance || 0))}</span>
                                                            </div>
                                                            {familyChildren.length > 0 && (
                                                                <div className="space-y-1 pl-2 border-l border-white/5">
                                                                    {familyChildren.map(child => (
                                                                        <div key={child.id} className="flex justify-between items-center text-[10px]">
                                                                            <span className="text-slate-500">{child.name}:</span>
                                                                            <span className="font-bold tabular-nums text-slate-300">+{numberFormatter.format(Math.abs(child.current_balance || 0))}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                                                <span className="text-indigo-400 font-black text-[10px] uppercase">FAMILY TOTAL:</span>
                                                                <span className="text-[14px] font-black tabular-nums text-indigo-300">{numberFormatter.format(familyDebtAbs)}</span>
                                                            </div>
                                                        </div>

                                                        {/* Annual Fee Waiver Section */}
                                                        {account.stats?.annual_fee_waiver_target && account.stats.annual_fee_waiver_target > 0 && (
                                                            <div className="pt-3 border-t border-white/10 space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Zap className="w-3 h-3 text-amber-400" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Annual Fee Waiver</span>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <div className="flex justify-between items-center text-[11px]">
                                                                        <span className="text-slate-400 font-bold">Spent Cycle:</span>
                                                                        <span className="font-black tabular-nums">{numberFormatter.format(account.stats.spent_this_cycle || 0)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[11px]">
                                                                        <span className="text-slate-400 font-bold">Waiver Target:</span>
                                                                        <span className="font-black tabular-nums">{numberFormatter.format(account.stats.annual_fee_waiver_target)}</span>
                                                                    </div>
                                                                    <div className="pt-1">
                                                                        {(() => {
                                                                            const progress = Math.min(100, ((account.stats?.spent_this_cycle || 0) / (account.stats?.annual_fee_waiver_target || 1)) * 100);
                                                                            return (
                                                                                <div className="space-y-1">
                                                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                                        <div
                                                                                            className="h-full bg-amber-500 transition-all duration-500"
                                                                                            style={{ width: `${progress}%` }}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex justify-end">
                                                                                        <span className="text-[10px] font-black text-amber-400">{progress.toFixed(1)}%</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="pt-2 border-t border-white/5 text-[9px] text-slate-500 italic">
                                                            Showing current card balance. Use Formula tooltip for Available logic.
                                                        </div>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Section 3: Cashback Progress */}
                        {dynamicCashbackStats && (
                            <div className="flex flex-col gap-1.5 min-w-[280px] px-6 border-l border-r border-slate-100">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 leading-none">
                                        {(() => {
                                            const spendProgress = dynamicCashbackStats.currentSpend || 0
                                            const spendTarget = dynamicCashbackStats.minSpend || 0
                                            const remainingSpend = Math.max(0, spendTarget - spendProgress)
                                            const isMet = spendTarget > 0 && spendProgress >= spendTarget

                                            if (!isMet && spendTarget > 0) {
                                                return (
                                                    <>
                                                        <div className="h-3.5 px-1.5 flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 rounded-[3px] text-[8px] font-black uppercase tracking-tight leading-none">
                                                            PENDING
                                                        </div>
                                                        <span className="text-[10px] font-bold text-rose-600 leading-none">
                                                            Needs {numberFormatter.format(remainingSpend)}
                                                        </span>
                                                    </>
                                                )
                                            } else if (isMet) {
                                                return (
                                                    <>
                                                        <div className="h-3.5 px-1.5 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-[3px] text-[8px] font-black uppercase tracking-tight leading-none">
                                                            MET
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Rewards</span>
                                                    </>
                                                )
                                            } else {
                                                return (
                                                    <>
                                                        <div className="h-3.5 px-1.5 flex items-center justify-center bg-slate-50 text-slate-600 border border-slate-100 rounded-[3px] text-[8px] font-black uppercase tracking-tight leading-none">
                                                            CASHBACK
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Rewards</span>
                                                    </>
                                                )
                                            }
                                        })()}
                                    </div>

                                    {/* Cycle Badge */}
                                    {(() => {
                                        const displayCycle = selectedCycle || (dynamicCashbackStats?.cycle as any)?.tag
                                        const displayLabel = selectedCycle
                                            ? ((dynamicCashbackStats?.cycle as any)?.tag === selectedCycle
                                                ? dynamicCashbackStats.cycle?.label
                                                : formatCycleTag(selectedCycle) || selectedCycle)
                                            : dynamicCashbackStats?.cycle?.label

                                        if (!displayCycle) return null
                                        const isCurrent = displayCycle === (dynamicCashbackStats?.cycle as any)?.tag

                                        return (
                                            <TooltipProvider>
                                                <Tooltip delayDuration={200}>
                                                    <TooltipTrigger asChild>
                                                        <div className={cn(
                                                            "flex items-center gap-1 px-1.5 py-0.5 border rounded cursor-help leading-none",
                                                            isCurrent ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-300"
                                                        )}>
                                                            <Calendar className={cn("h-2.5 w-2.5", isCurrent ? "text-indigo-500" : "text-slate-500")} />
                                                            <span className={cn("text-[8px] font-black uppercase tracking-wide", isCurrent ? "text-indigo-600" : "text-slate-600")}>
                                                                {displayLabel}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="text-[10px]">
                                                            <div className="font-black mb-1">{isCurrent ? 'Current Cycle' : 'Selected Cycle'}</div>
                                                            <div className="text-slate-400 font-bold">{formatCycleTagWithYear(displayCycle)}</div>
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
                                        <div className="relative w-full h-5 bg-slate-50 rounded-md border border-slate-200 overflow-hidden flex items-center">
                                            <div className="absolute inset-0 h-full transition-all duration-500 ease-out bg-indigo-500 opacity-20" style={{ width: `${percentage}%` }} />
                                            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                                                <span className="text-[9px] font-black text-slate-400 tabular-nums">{percentage.toFixed(0)}%</span>
                                                <span className="text-[9px] font-bold text-slate-800 tabular-nums">
                                                    {spendTarget > 0 ? numberFormatter.format(spendProgress) : 'No target'}
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
                        <div className="flex flex-col gap-1.5 min-w-[160px] px-6 border-l border-slate-100">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                Total Balance
                            </span>
                            <div className={cn(
                                "text-2xl font-black tabular-nums tracking-tighter leading-none",
                                availableBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {numberFormatter.format(availableBalance)}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 leading-none">
                                {getAccountTypeLabel(account.type)} Account
                            </div>
                        </div>

                        {/* Account Type */}
                        <div className="flex flex-col min-w-[100px] px-6 border-l border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">
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
        </div>
    )
}
