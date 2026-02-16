"use client"

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ChevronLeft,
    ChevronDown,
    Settings,
    Edit,
    Check,
    X,
    Calendar,
    User,
    Zap,
    Hash,
    Calculator,
    Info,
    Clock,
    BarChart3,
    TrendingUp,
    PlusCircle,
    Users2,
    Loader2,
    Sparkles
} from 'lucide-react'
import { cn, formatMoneyVND } from '@/lib/utils'
import { Account, Category, Transaction } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getAccountTypeLabel } from '@/lib/account-utils'
import { getCreditCardAvailableBalance } from '@/lib/account-balance'
import { AccountSlideV2 } from './AccountSlideV2'
import { formatCycleTag, formatCycleTagWithYear } from '@/lib/cycle-utils'
import { updateAccountInfo } from '@/actions/account-actions'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { isToday, isTomorrow, differenceInDays, startOfDay } from 'date-fns'
import { normalizeCashbackConfig } from '@/lib/cashback'

interface AccountDetailHeaderV2Props {
    account: Account
    allAccounts: Account[]
    categories: Category[]
    cashbackStats: AccountSpendingStats | null

    selectedYear: string | null
    availableYears: string[]
    onYearChange: (year: string | null) => void
    selectedCycle?: string // For dynamic cashback badge display
    summary?: {
        yearDebtTotal: number
        debtTotal: number
        expensesTotal: number
        cashbackTotal: number
        yearExpensesTotal?: number
        yearPureIncomeTotal?: number
        yearPureExpenseTotal?: number
        yearLentTotal?: number
        yearRepaidTotal?: number
        pendingCount?: number
        targetYear?: number
    }
    isLoadingPending?: boolean
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

const formatVNShort = (amount: number) => {
    const absAmount = Math.abs(amount)
    if (absAmount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`
    if (absAmount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
    if (absAmount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`
    return amount.toString()
}

export function AccountDetailHeaderV2({
    account,
    allAccounts,
    categories,
    cashbackStats,

    selectedYear,
    availableYears,
    onYearChange,
    selectedCycle,
    summary,
    isLoadingPending
}: AccountDetailHeaderV2Props) {
    const [isPending, startTransition] = React.useTransition()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isSlideOpen, setIsSlideOpen] = React.useState(false)
    const [dynamicCashbackStats, setDynamicCashbackStats] = React.useState<AccountSpendingStats | null>(cashbackStats)
    const [isCashbackLoading, setIsCashbackLoading] = React.useState(false)

    // Sync selected year with URL
    React.useEffect(() => {
        const urlYear = searchParams.get('year')
        if (urlYear && urlYear !== selectedYear) {
            onYearChange(urlYear)
        }
    }, [searchParams, selectedYear, onYearChange])

    const handleYearChange = (year: string | null) => {
        startTransition(() => {
            onYearChange(year)
            const params = new URLSearchParams(searchParams.toString())
            if (year) params.set('year', year)
            else params.delete('year')
            router.push(`?${params.toString()}`, { scroll: false })
            router.refresh()
        })
    }

    const isCreditCard = account.type === 'credit_card'
    const currentYear = new Date().getFullYear().toString()
    const isHistoricalYear = !!selectedYear && selectedYear !== currentYear

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

    // Recalculate cashback stats when selectedCycle changes
    React.useEffect(() => {
        if (!selectedCycle || selectedCycle === 'all' || !isCreditCard) {
            setDynamicCashbackStats(cashbackStats)
            return
        }

        const fetchCashbackStats = async () => {
            setIsCashbackLoading(true)
            try {
                const [yearStr, monthStr] = selectedCycle.split('-')
                const year = parseInt(yearStr, 10)
                const month = parseInt(monthStr, 10)

                if (isNaN(year) || isNaN(month)) {
                    throw new Error(`Invalid cycle selected: ${selectedCycle}`)
                }

                const cycleDate = new Date(year, month - 1, 10)
                if (isNaN(cycleDate.getTime())) {
                    throw new Error(`Invalid cycle date: ${selectedCycle}`)
                }

                const response = await fetch(`/api/cashback/stats?accountId=${account.id}&date=${cycleDate.toISOString()}`)
                if (response.ok) {
                    const data = await response.json()
                    setDynamicCashbackStats(data)
                }
            } catch (error) {
                console.error('Failed to fetch cashback stats:', error)
                setDynamicCashbackStats(cashbackStats)
            } finally {
                setIsCashbackLoading(false)
            }
        }

        fetchCashbackStats()
    }, [selectedCycle, account.id, isCreditCard, cashbackStats])

    // Cleanup 'tab' param if present (fix for persistent url)
    React.useEffect(() => {
        if (searchParams.has('tab')) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('tab');
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [searchParams, router]);

    // Sync dynamic stats when props update (e.g. after router.refresh())
    React.useEffect(() => {
        setDynamicCashbackStats(cashbackStats)
    }, [cashbackStats])

    const rewardsCount = React.useMemo(() => {
        try {
            const program = normalizeCashbackConfig(account.cashback_config, account);
            const counts = (program.levels || []).reduce((acc: number, lvl: any) => acc + (lvl.rules?.length || 0), 0);
            if (counts > 0) return counts;
            if (program.defaultRate > 0) return 1;
            return 0;
        } catch (e) { return 0; }
    }, [account.cashback_config]);

    const [isEditPopoverOpen, setIsEditPopoverOpen] = React.useState(false)
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
                setIsEditPopoverOpen(false)
                return
            }

            const result = await updateAccountInfo(account.id, {
                account_number: editValues.account_number || undefined,
                receiver_name: editValues.receiver_name || undefined
            })

            if (result.success) {
                toast.success('Account info updated')
                setIsEditPopoverOpen(false)
            } else {
                toast.error('Failed to update')
            }
        } catch (error) {
            toast.error('Something went wrong')
        }
    }

    // Helper Component for Sections
    // Helper Component for Sections
    const HeaderSection = React.forwardRef<HTMLDivElement, { label: string, children: React.ReactNode, className?: string, borderColor?: string, badge?: React.ReactNode, hint?: string, hideHintInHeader?: boolean, [key: string]: any }>(
        ({ label, children, className, borderColor = "border-slate-200", badge, hint, hideHintInHeader, ...props }, ref) => (
            <div ref={ref} className={cn("relative border rounded-xl px-4 py-1.5 flex flex-col group/header", borderColor, className)} {...props}>
                <div className="absolute -top-2 left-3 flex items-center gap-2 z-10">
                    <span className="bg-white px-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {label}
                    </span>
                    {hint && !hideHintInHeader && (
                        <span className="text-[7px] text-slate-300 font-black uppercase tracking-widest opacity-0 group-hover/header:opacity-100 transition-all transform translate-x-2 group-hover/header:translate-x-0 duration-300">
                            • {hint}
                        </span>
                    )}
                    {badge}
                </div>
                {children}
            </div>
        )
    )
    HeaderSection.displayName = "HeaderSection"

    const formatVNShort = (amount: number) => {
        const abs = Math.abs(amount)
        if (abs >= 1000000) return `${(amount / 1000000).toFixed(1)} triệu`
        if (abs >= 1000) return `${Math.floor(amount / 1000)} ngàn`
        return ''
    }

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-1.5 flex flex-col gap-2 md:flex-row md:items-stretch sticky top-0 z-40 shadow-sm">
            <AccountSlideV2
                open={isSlideOpen}
                onOpenChange={setIsSlideOpen}
                account={account}
                allAccounts={allAccounts}
                categories={categories}
                existingAccountNumbers={Array.from(new Set(allAccounts.map(a => a.account_number).filter(Boolean))) as string[]}
                existingReceiverNames={Array.from(new Set(allAccounts.map(a => a.receiver_name).filter(Boolean))) as string[]}
            />

            {/* Section 1: Account Identity */}
            <HeaderSection label="Account" className="min-w-0 sm:min-w-[280px] gap-2">
                <div className="flex items-center gap-3">
                    <Link
                        href="/accounts"
                        className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>

                    <div className="relative shrink-0">
                        <div className="w-12 h-12 overflow-hidden flex items-center justify-center">
                            {account.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={account.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-xl font-bold text-slate-400 capitalize">{account.name.charAt(0)}</div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-base font-black text-slate-900 leading-none truncate" title={account.name}>
                                {account.name}
                            </h1>
                            <Popover open={isEditPopoverOpen} onOpenChange={setIsEditPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <button className="text-slate-300 hover:text-indigo-500 transition-colors">
                                        <Edit className="h-3.5 w-3.5" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[280px] z-[10001] shadow-2xl border-indigo-100"
                                    align="start"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                    <div className="space-y-3 p-1">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400">Edit Info</h4>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Account Number</span>
                                            <Input
                                                value={editValues.account_number}
                                                onChange={(e) => setEditValues(prev => ({ ...prev, account_number: e.target.value }))}
                                                placeholder="Account Number"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Receiver Name</span>
                                            <Input
                                                value={editValues.receiver_name}
                                                onChange={(e) => setEditValues(prev => ({ ...prev, receiver_name: e.target.value }))}
                                                placeholder="Receiver Name"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <button onClick={handleSaveInfo} className="w-full h-8 bg-indigo-600 text-white text-xs font-bold rounded mt-2">
                                            Save Changes
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex flex-col mt-1.5 gap-0.5">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-slate-500 tracking-wide flex items-center gap-1.5">
                                    <Hash className="h-3 w-3 text-slate-400 shrink-0" />
                                    {account.account_number || '•••• •••• ••••'}
                                </span>
                                {account.secured_by_account_id && (
                                    <>
                                        <span className="text-slate-200">|</span>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-full">
                                            <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                            <span className="text-[9px] font-black text-amber-700 uppercase tracking-tighter">Collateral Linked</span>
                                        </div>
                                    </>
                                )}
                                <span className="text-slate-200">|</span>
                                {(() => {
                                    const now = startOfDay(new Date());
                                    let label = "";
                                    let dateLabel = "";
                                    let isUrgent = false;

                                    if (account.stats?.due_date) {
                                        const d = startOfDay(new Date(account.stats.due_date));
                                        dateLabel = format(d, 'MMM d').toUpperCase();
                                        if (isToday(d)) {
                                            label = "Today Due";
                                            isUrgent = true;
                                        } else if (isTomorrow(d)) {
                                            label = "Tomorrow";
                                            isUrgent = true;
                                        } else {
                                            const daysLeft = differenceInDays(d, now);
                                            if (daysLeft < 0) {
                                                label = `${Math.abs(daysLeft)} Overdue`;
                                                isUrgent = true;
                                            } else {
                                                label = `${daysLeft} Days`.toUpperCase();
                                            }
                                        }
                                    } else {
                                        const config = typeof account.cashback_config === 'string'
                                            ? JSON.parse(account.cashback_config)
                                            : account.cashback_config;
                                        const rawDueDay = account.credit_card_info?.payment_due_day || config?.dueDate || config?.program?.dueDate;

                                        if (rawDueDay) {
                                            const d = new Date();
                                            d.setDate(rawDueDay);
                                            if (d < now) d.setMonth(d.getMonth() + 1);
                                            dateLabel = format(d, 'MMM d').toUpperCase();
                                            const daysLeft = differenceInDays(startOfDay(d), now);

                                            if (daysLeft === 0) {
                                                label = "Today Due";
                                                isUrgent = true;
                                            } else if (daysLeft === 1) {
                                                label = "Tomorrow";
                                                isUrgent = true;
                                            } else {
                                                label = `${daysLeft} Days`.toUpperCase();
                                            }
                                        }
                                    }

                                    if (!label) return <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">No Due</span>;

                                    return (
                                        <div className={cn(
                                            "flex items-center gap-2 px-2 py-0.5 rounded-full border text-[9px] font-black tracking-tight",
                                            isUrgent
                                                ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.1)]"
                                                : "bg-emerald-50 border-emerald-100 text-emerald-700"
                                        )}>
                                            <Clock className="h-3 w-3 opacity-70" />
                                            <span>{label}</span>
                                            <span className="opacity-30">|</span>
                                            <Calendar className="h-3 w-3 opacity-70" />
                                            <span>{dateLabel}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                            {account.receiver_name && (
                                <div className="flex items-center gap-1.5 pl-0.5">
                                    <User className="h-3 w-3 text-slate-300 shrink-0" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {account.receiver_name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {rewardsCount > 0 && (
                    <div className="flex items-center gap-1.5 pl-0.5 mt-1.5 w-fit">
                        <HoverCard openDelay={0} closeDelay={150}>
                            <HoverCardTrigger asChild>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-md text-amber-700 cursor-help active:scale-95 transition-transform hover:bg-amber-100 hover:border-amber-200 shadow-sm group/badge">
                                    <Zap className="h-3 w-3 fill-amber-400 text-amber-500 group-hover/badge:animate-pulse" />
                                    {(() => {
                                        try {
                                            const program = normalizeCashbackConfig(account.cashback_config, account);
                                            const rules: any[] = [];
                                            (program.levels || []).forEach((lvl: any) => {
                                                (lvl.rules || []).forEach((r: any) => {
                                                    rules.push({ ...r, levelName: lvl.name });
                                                });
                                            });

                                            // Collect all unique Category IDs
                                            const catIds = new Set<string>();
                                            rules.forEach(r => {
                                                if (Array.isArray(r.categoryIds)) r.categoryIds.forEach((id: string) => catIds.add(id));
                                                if (r.categoryId) catIds.add(r.categoryId);
                                            });

                                            const allCatIds = Array.from(catIds);

                                            // Fallback if no categories but default rate exists
                                            if (allCatIds.length === 0 && program.defaultRate > 0) {
                                                return <span className="text-[10px] font-black uppercase tracking-tight">Flat {(program.defaultRate * 100).toFixed(1)}%</span>;
                                            }

                                            const allCats = allCatIds.map(id => categories.find(c => c.id === id || c.name === id)).filter(Boolean) as Category[];
                                            const uniqueCatsMap = new Map<string, Category>();
                                            allCats.forEach(c => uniqueCatsMap.set(c.id, c));
                                            const displayCats = Array.from(uniqueCatsMap.values()).slice(0, 2);
                                            const remaining = uniqueCatsMap.size - displayCats.length;

                                            return (
                                                <div className="flex items-center gap-2">
                                                    {Array.from(uniqueCatsMap.values()).slice(0, 2).map((cat, idx) => (
                                                        <React.Fragment key={`${cat.id}-${idx}`}>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">{cat.name}</span>
                                                                {cat.mcc_codes && cat.mcc_codes.length > 0 && (
                                                                    <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                                                                        {Array.from(new Set(cat.mcc_codes)).map(mcc => (
                                                                            <code key={mcc} className="text-[9px] font-mono font-black text-slate-500 bg-white border border-slate-200 px-1 rounded-sm shadow-sm">
                                                                                {mcc}
                                                                            </code>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {idx === 0 && uniqueCatsMap.size > 1 && <span className="text-slate-200">|</span>}
                                                        </React.Fragment>
                                                    ))}
                                                    {remaining > 0 && (
                                                        <span className="text-[10px] font-bold text-amber-600/80 border-l border-amber-200 pl-1.5 ml-0.5">+{remaining} more</span>
                                                    )}
                                                </div>
                                            )
                                        } catch (e) {
                                            return <span className="text-[10px] font-black uppercase tracking-tight">Rewards Active</span>
                                        }
                                    })()}
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-[340px] p-0 overflow-hidden border-none shadow-2xl" align="start">
                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex justify-between items-center text-white">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 fill-white/20" />
                                        <span className="text-xs font-black uppercase tracking-widest">Active Rewards</span>
                                    </div>
                                    {/* Calculate count again for header */}
                                    {(() => {
                                        const program = normalizeCashbackConfig(account.cashback_config, account);
                                        const rules = (program.levels || []).flatMap((l: any) => l.rules || []);
                                        return <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase">{rules.length} Rules</span>
                                    })()}
                                </div>

                                <div className="bg-white max-h-[300px] overflow-y-auto">
                                    {(() => {
                                        try {
                                            const config = normalizeCashbackConfig(account.cashback_config, account);
                                            const levels = config.levels || [];
                                            const rules: any[] = levels.flatMap((lvl: any) => lvl.rules || []);

                                            if (rules.length === 0 && config.defaultRate > 0) {
                                                return (
                                                    <div className="p-4 flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                            <span className="text-lg">🌍</span>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">Flat Rate</div>
                                                            <div className="text-xs text-slate-500">All Purchases</div>
                                                        </div>
                                                        <div className="ml-auto text-xl font-black text-emerald-600">
                                                            {(config.defaultRate * 100).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                )
                                            }

                                            return (
                                                <div className="divide-y divide-slate-100">
                                                    {rules.map((rule, idx) => {
                                                        const catIds: string[] = [];
                                                        if (Array.isArray(rule.categoryIds)) rule.categoryIds.forEach((id: string) => catIds.push(id));
                                                        if (rule.categoryId) catIds.push(rule.categoryId);
                                                        // Dedupe
                                                        const uniqueCatIds = Array.from(new Set(catIds));

                                                        const desc = rule.description || (uniqueCatIds.length > 0 ? 'Specific Categories' : 'Bonus Rule');

                                                        return (
                                                            <div key={idx} className="p-3 hover:bg-slate-50 transition-colors">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wide">{desc}</span>
                                                                    <span className="text-sm font-black text-emerald-600">{(rule.rate * 100).toFixed(1)}%</span>
                                                                </div>

                                                                {uniqueCatIds.length > 0 && (
                                                                    <div className="space-y-2">
                                                                        {uniqueCatIds.map(cid => {
                                                                            const cat = categories.find(c => c.id === cid || c.name === cid);
                                                                            if (!cat) return null;
                                                                            return (
                                                                                <div key={cid} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded px-2 py-1.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-base">{cat.icon || '🏷️'}</span>
                                                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">{cat.name}</span>
                                                                                    </div>
                                                                                    {cat.mcc_codes && cat.mcc_codes.length > 0 && (
                                                                                        <div className="flex gap-1">
                                                                                            {Array.from(new Set(cat.mcc_codes)).map(mcc => (
                                                                                                <code key={mcc} className="text-[9px] font-mono font-bold bg-white border border-slate-200 px-1 rounded text-slate-500">
                                                                                                    {mcc}
                                                                                                </code>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {rule.maxReward && (
                                                                    <div className="mt-2 flex items-center gap-1 text-[9px] text-amber-600 font-medium italic">
                                                                        <Info className="h-3 w-3" />
                                                                        Cap: {formatVNShort(rule.maxReward)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            );
                                        } catch (e) {
                                            return <p className="p-4 text-xs text-slate-400 italic text-center">Config data unavailable.</p>;
                                        }
                                    })()}
                                </div>
                                <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                                        Detailed MCC matching required
                                    </p>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    </div>
                )}
            </HeaderSection>

            {
                isCreditCard ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HeaderSection
                                    label="Credit Health"
                                    hint="Hover for Details"
                                    borderColor="border-indigo-100"
                                    className="flex-1 min-w-[400px] bg-indigo-50/10 cursor-help !h-[120px]"
                                >
                                    <div className="flex flex-col h-full">
                                        {/* Row 1: Metrics (H-61px to ensure Bar Top is at 73px) */}
                                        <div className="grid grid-cols-2 gap-4 w-full h-[61px] items-start pt-1">
                                            <div className="flex flex-col group">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <BarChart3 className="h-3 w-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">Available</span>
                                                </div>
                                                <div className={cn(
                                                    "text-base font-black tracking-tight leading-none tabular-nums",
                                                    availableBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {formatMoneyVND(Math.ceil(availableBalance))}
                                                </div>
                                            </div>

                                            <div className="flex flex-col group items-end">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <TrendingUp className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">Health Score</span>
                                                </div>
                                                <div className="text-[9px] font-black text-indigo-700 leading-none tabular-nums tracking-tight bg-indigo-50 px-2 py-1 rounded border border-indigo-100/50">
                                                    STABLE
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Progress Bar (H-24px) */}
                                        <div className="w-full h-[24px] flex items-center">
                                            <div className="relative h-5 w-full rounded-lg shadow-inner">
                                                {(() => {
                                                    const limit = account.credit_limit || 0
                                                    const usage = limit > 0 ? Math.min((outstandingBalance / limit) * 100, 100) : 0
                                                    const isDanger = usage > 90

                                                    return (
                                                        <>
                                                            <div className="absolute inset-0 bg-slate-100/50 rounded-lg border border-slate-200/60 overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                                                                <div
                                                                    className={cn("h-full transition-all duration-700 rounded-sm shadow-sm", isDanger ? "bg-rose-500" : "bg-indigo-600")}
                                                                    style={{ width: `${usage}%` }}
                                                                />
                                                            </div>
                                                            <div
                                                                className="absolute top-0 bottom-0 flex items-center pl-1.5 transition-all duration-700 z-10"
                                                                style={{ left: `${usage}%` }}
                                                            >
                                                                <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-[4px] px-1.5 py-0.5 rounded text-[9px] font-black text-white border border-white/20 shadow-sm whitespace-nowrap">
                                                                    {Math.round(usage)}%
                                                                </div>
                                                            </div>
                                                            <div className="absolute inset-y-0 right-2 flex items-center text-[10px] font-black text-slate-600 drop-shadow-sm z-0">
                                                                {formatMoneyVND(Math.ceil(outstandingBalance))}
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </div>

                                        {/* Row 3: Footer */}
                                        <div className="flex justify-between items-end pb-1 px-0.5 mt-auto min-h-[22px]">
                                            <div className="flex flex-col min-w-0">
                                                {(() => {
                                                    const waiverTarget = account.annual_fee_waiver_target
                                                    const spent = summary?.yearExpensesTotal || 0
                                                    const needs = waiverTarget ? Math.max(0, waiverTarget - spent) : 0
                                                    const colorClass = needs <= 0 ? "text-emerald-600" : "text-emerald-700";

                                                    if (waiverTarget && needs > 0) {
                                                        return (
                                                            <div className="flex flex-col">
                                                                <div className="flex items-baseline gap-2">
                                                                    <span className={cn("text-xs font-black tracking-tight tabular-nums", colorClass)}>
                                                                        <span className="text-[8px] font-black uppercase opacity-60 mr-1">needs</span>
                                                                        {formatMoneyVND(Math.round(needs))}
                                                                    </span>
                                                                    <span className="text-[8px] text-slate-400 font-black italic">{formatVNShort(needs)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    } else if (waiverTarget && needs <= 0) {
                                                        return <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">✨ Waiver Met</span>;
                                                    } else {
                                                        return (
                                                            <div className="flex items-baseline gap-1.5 py-0.5">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">No Waiver: Spend</span>
                                                                <span className="text-xs font-black text-slate-600 tabular-nums">{formatMoneyVND(Math.round(spent))}</span>
                                                                <span className="text-[8px] text-slate-400 font-black italic">this year</span>
                                                            </div>
                                                        );
                                                    }
                                                })()}
                                            </div>
                                            <div className="flex items-baseline gap-1.5 shrink-0">
                                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] opacity-80">LIMIT</span>
                                                <span className="text-sm font-black text-slate-900 tabular-nums leading-none tracking-tight">{formatMoneyVND(Math.ceil(account.credit_limit || 0))}</span>
                                            </div>
                                        </div>
                                    </div>
                                </HeaderSection>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="w-[340px] p-0 overflow-hidden border-none shadow-2xl">
                                <div className="bg-white">
                                    <div className="bg-indigo-950 px-4 py-1.5 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <h3 className="font-black text-[9px] uppercase tracking-[0.2em] text-indigo-400/80 leading-tight">Analytics</h3>
                                            <h3 className="font-black text-[11px] uppercase tracking-[0.15em] text-indigo-200">Credit Health Report</h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {availableYears.length > 0 ? (
                                                <div className="relative">
                                                    <select
                                                        value={selectedYear || ''}
                                                        onChange={(e) => handleYearChange(e.target.value)}
                                                        className="appearance-none bg-indigo-900/50 hover:bg-indigo-800 text-[10px] font-black text-indigo-200 pl-2 pr-6 py-1 rounded transition-colors border border-indigo-700/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[60px] text-center"
                                                    >
                                                        {availableYears.map(year => (
                                                            <option key={year} value={year} className="bg-indigo-950 text-white">
                                                                {year}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-indigo-400 pointer-events-none" />
                                                </div>
                                            ) : null}
                                            {isPending ? (
                                                <Loader2 className="h-3 w-3 text-indigo-400 animate-spin" />
                                            ) : (
                                                <Zap className="h-3 w-3 text-amber-400 fill-amber-400 shadow-sm" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {/* Simplified Spending Overview */}
                                        <div className="space-y-3">
                                            <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100/50 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Year Analytics</span>
                                                        <span className="text-[11px] font-black text-indigo-900 uppercase tracking-tighter">
                                                            {selectedYear || currentYear} Spending Status
                                                        </span>
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center shadow-sm">
                                                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-indigo-100/50">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Total Expenses</span>
                                                        <span className={cn("text-lg font-black text-indigo-600 tabular-nums", isPending && "opacity-20 animate-pulse")}>
                                                            {formatMoneyVND(summary?.yearExpensesTotal || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <span className="text-[10px] font-black text-slate-400 italic">
                                                            {formatVNShort(summary?.yearExpensesTotal || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Table Structure for Waiver */}
                                        {!!account.annual_fee_waiver_target && (
                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                                                <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                    <Calculator className="h-3 w-3" /> Waiver Progress
                                                </h4>
                                                <div className="grid grid-cols-2 text-[11px] py-0.5">
                                                    <span className="text-slate-500">Target Spending</span>
                                                    <span className="text-right font-bold">{formatMoneyVND(account.annual_fee_waiver_target)}</span>
                                                </div>
                                                <div className="grid grid-cols-2 text-[11px] py-0.5">
                                                    <span className="text-slate-500">{isHistoricalYear ? 'Year Spending' : 'YTD Spending'}</span>
                                                    <span className="text-right font-bold text-indigo-600">{formatMoneyVND(summary?.yearExpensesTotal || 0)}</span>
                                                </div>
                                                {summary?.yearExpensesTotal! < account.annual_fee_waiver_target ? (
                                                    <div className="grid grid-cols-2 text-[11px] pt-1.5 border-t border-amber-100 font-black text-amber-600">
                                                        <span>REMAINING NEED</span>
                                                        <span className="text-right">{formatMoneyVND(account.annual_fee_waiver_target - (summary?.yearExpensesTotal || 0))}</span>
                                                    </div>
                                                ) : (
                                                    <div className="pt-1.5 border-t border-emerald-100 space-y-1">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                                            <span>✨ Waiver Qualified</span>
                                                            <span>100% Met</span>
                                                        </div>
                                                        <div className="flex justify-between text-[9px] text-emerald-500/80 italic font-medium">
                                                            <span>Excess spending:</span>
                                                            <span>+{formatMoneyVND((summary?.yearExpensesTotal || 0) - account.annual_fee_waiver_target)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider >
                ) : (
                    <>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <HeaderSection
                                        label="Cash Flow"
                                        hint="Hover for Details"
                                        borderColor="border-sky-100"
                                        className="flex-1 min-w-[280px] bg-sky-50/10 cursor-help !h-[120px]"
                                    >
                                        <div className="flex flex-col h-full justify-between py-1">
                                            <div className="flex justify-between items-center px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Net Income</span>
                                                    <span className={cn("text-lg font-black tabular-nums transition-all",
                                                        (summary?.yearPureIncomeTotal || 0) - (summary?.yearPureExpenseTotal || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                                    )}>
                                                        {formatMoneyVND((summary?.yearPureIncomeTotal || 0) - (summary?.yearPureExpenseTotal || 0))}
                                                    </span>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-white border border-sky-100 flex items-center justify-center shadow-sm">
                                                    <TrendingUp className="h-4 w-4 text-sky-500" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-2 px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Incoming</span>
                                                    <span className="text-[11px] font-black text-emerald-600">+{formatVNShort(summary?.yearPureIncomeTotal || 0)}</span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Outgoing</span>
                                                    <span className="text-[11px] font-black text-rose-500">-{formatVNShort(summary?.yearPureExpenseTotal || 0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </HeaderSection>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="w-[300px] p-0 border-none shadow-2xl overflow-hidden rounded-2xl" sideOffset={10}>
                                    <div className="bg-indigo-950/95 backdrop-blur-xl border border-indigo-400/20 overflow-hidden rounded-2xl">
                                        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 p-4 border-b border-indigo-400/20">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp className="h-3 w-3 text-indigo-300" />
                                                <h3 className="font-black text-[11px] uppercase tracking-[0.15em] text-indigo-200">Cash Flow Report {selectedYear || currentYear}</h3>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs py-1 border-b border-white/5">
                                                    <span className="text-white/60">Actual Income</span>
                                                    <span className="text-emerald-400 font-bold">{formatMoneyVND(summary?.yearPureIncomeTotal || 0)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs py-1 border-b border-white/5">
                                                    <span className="text-white/60">Pure Expenses</span>
                                                    <span className="text-rose-400 font-bold">-{formatMoneyVND(summary?.yearPureExpenseTotal || 0)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs pt-2 font-black">
                                                    <span className="text-indigo-200 uppercase tracking-widest text-[10px]">Net Result</span>
                                                    <span className={cn(
                                                        (summary?.yearPureIncomeTotal || 0) - (summary?.yearPureExpenseTotal || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                                    )}>
                                                        {formatMoneyVND((summary?.yearPureIncomeTotal || 0) - (summary?.yearPureExpenseTotal || 0))}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-2 text-[10px] text-white/40 italic">
                                                Excludes transfers and debt-related flows.
                                            </div>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <HeaderSection
                                        label="Debt Manage"
                                        hint="Hover for Ledger"
                                        borderColor="border-amber-100"
                                        className="flex-1 min-w-[280px] bg-amber-50/10 cursor-help !h-[120px]"
                                    >
                                        <div className="flex flex-col h-full justify-between py-1">
                                            <div className="flex justify-between items-center px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                                        {(summary?.yearLentTotal || 0) >= (summary?.yearRepaidTotal || 0) ? "Active Credits" : "Net Recovery"}
                                                    </span>
                                                    <span className={cn(
                                                        "text-lg font-black tabular-nums transition-all",
                                                        (summary?.yearLentTotal || 0) >= (summary?.yearRepaidTotal || 0) ? "text-amber-900" : "text-emerald-600"
                                                    )}>
                                                        {formatMoneyVND(Math.abs((summary?.yearLentTotal || 0) - (summary?.yearRepaidTotal || 0)))}
                                                    </span>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-white border border-amber-100 flex items-center justify-center shadow-sm">
                                                    <Users2 className="h-4 w-4 text-amber-500" />
                                                </div>
                                            </div>

                                            <div className="mt-2 px-1">
                                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                                    <span>Repayment Progress</span>
                                                    <span>{summary?.yearLentTotal ? Math.round(((summary?.yearRepaidTotal || 0) / summary.yearLentTotal) * 100) : 0}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                    <div
                                                        className="h-full bg-amber-500 transition-all duration-1000 ease-out"
                                                        style={{ width: `${Math.min(100, (summary?.yearLentTotal ? ((summary?.yearRepaidTotal || 0) / summary.yearLentTotal) * 100 : 0))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </HeaderSection>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="w-[300px] p-0 border-none shadow-2xl overflow-hidden rounded-2xl" sideOffset={10}>
                                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 overflow-hidden rounded-2xl">
                                        <div className="bg-amber-900/30 p-4 border-b border-white/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users2 className="h-3 w-3 text-amber-400" />
                                                <h3 className="font-black text-[11px] uppercase tracking-[0.15em] text-amber-200">Personal Ledger {selectedYear || currentYear}</h3>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase">Lent Out</span>
                                                    <p className="text-sm font-black text-white">{formatMoneyVND(summary?.yearLentTotal || 0)}</p>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase">Recovered</span>
                                                    <p className="text-sm font-black text-emerald-400">{formatMoneyVND(summary?.yearRepaidTotal || 0)}</p>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-white/5">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-2 uppercase">
                                                    <span>Progress to Settlement</span>
                                                    <span className="text-white">{summary?.yearLentTotal ? Math.round(((summary?.yearRepaidTotal || 0) / summary.yearLentTotal) * 100) : 0}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                                                        style={{ width: `${Math.min(100, (summary?.yearLentTotal ? ((summary?.yearRepaidTotal || 0) / summary.yearLentTotal) * 100 : 0))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <HeaderSection label="Account Balance" className="flex-1 min-w-[200px] bg-slate-50/10">
                            <div className="flex flex-col h-full justify-between py-1">
                                <div className="flex justify-between items-center px-1">
                                    <div className="flex flex-col group">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <BarChart3 className="h-3 w-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Available</span>
                                        </div>
                                        <div className={cn(
                                            "text-xl font-black tracking-tight leading-none tabular-nums",
                                            availableBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {formatMoneyVND(Math.ceil(availableBalance))}
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                        <Calculator className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>

                                <div className="mt-2 px-1 text-[10px] font-bold text-slate-400 uppercase">
                                    Real-time Ledger
                                </div>
                            </div>
                        </HeaderSection>
                    </>
                )
            }

            {/* Section 3: Cashback Performance */}
            {
                isCreditCard && dynamicCashbackStats && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex flex-[2] min-w-[480px]">
                                    <HeaderSection
                                        label="Cashback Performance"
                                        borderColor="border-emerald-100"
                                        className="w-full bg-emerald-50/10 !h-[120px] cursor-help"
                                        hideHintInHeader
                                    >
                                        <div className="flex flex-col h-full">
                                            {/* Row 1: Metrics */}
                                            <div className="grid grid-cols-4 gap-4 w-full h-[61px] items-start pt-1">
                                                {(() => {
                                                    const yearlyRealValue = summary?.cashbackTotal || 0;
                                                    return (
                                                        <>
                                                            <div className="flex flex-col group">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <BarChart3 className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">Profit</span>
                                                                </div>
                                                                <span className={cn(
                                                                    "text-base font-black leading-none tabular-nums tracking-tighter",
                                                                    (dynamicCashbackStats.netProfit || 0) > 0 ? "text-emerald-600" : (dynamicCashbackStats.netProfit || 0) < 0 ? "text-rose-600" : "text-slate-900"
                                                                )}>
                                                                    {formatMoneyVND(Math.ceil(dynamicCashbackStats.netProfit || 0))}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col group">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <TrendingUp className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">Actual Claimed</span>
                                                                </div>
                                                                <span className={cn(
                                                                    "text-base font-black leading-none tabular-nums tracking-tighter",
                                                                    yearlyRealValue > 0 ? "text-indigo-600" : yearlyRealValue < 0 ? "text-rose-600" : "text-slate-900"
                                                                )}>
                                                                    {formatMoneyVND(Math.ceil(yearlyRealValue))}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col group">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <PlusCircle className="h-3 w-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">Est. Cashback</span>
                                                                </div>
                                                                <span className="text-base font-black text-emerald-600 leading-none tabular-nums tracking-tighter">
                                                                    {formatMoneyVND(Math.ceil(dynamicCashbackStats.earnedSoFar || 0))}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col group items-end">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <Users2 className="h-3 w-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
                                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">Cashback Shared</span>
                                                                </div>
                                                                <span className="text-base font-black text-amber-600 leading-none tabular-nums tracking-tighter">
                                                                    {formatMoneyVND(Math.ceil(dynamicCashbackStats.sharedAmount || 0))}
                                                                </span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Row 2: Progress Bars */}
                                            <div className="w-full h-[24px] flex items-center">
                                                {(() => {
                                                    const stats = dynamicCashbackStats;
                                                    const isQualified = stats?.is_min_spend_met;
                                                    const minSpend = stats?.minSpend || 0;
                                                    const spent = stats?.currentSpend || 0;
                                                    const cap = stats?.maxCashback || 0;
                                                    const earned = stats?.earnedSoFar || 0;

                                                    // Priority 1: Minimum Spend Progress (if not met)
                                                    if (!isQualified && minSpend > 0) {
                                                        const progress = Math.min((spent / minSpend) * 100, 100);
                                                        return (
                                                            <div className="relative h-5 w-full rounded-lg shadow-inner">
                                                                <div className="absolute inset-0 bg-slate-100/50 rounded-lg border border-slate-200/60 overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                                                                    <div
                                                                        className={cn(
                                                                            "h-full transition-all duration-700 rounded-sm shadow-sm",
                                                                            progress >= 90 ? "bg-emerald-500" : "bg-rose-500"
                                                                        )}
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>
                                                                <div
                                                                    className="absolute top-0 bottom-0 flex items-center pl-1.5 transition-all duration-700 z-10"
                                                                    style={{ left: `${progress}%` }}
                                                                >
                                                                    <div className="flex items-center bg-slate-900/90 backdrop-blur-[4px] px-1.5 py-0.5 rounded text-[9px] font-black text-white border border-white/20 shadow-sm whitespace-nowrap">
                                                                        {Math.round(progress)}%
                                                                    </div>
                                                                </div>
                                                                <div className="absolute inset-y-0 right-2 flex items-center text-[10px] font-black text-rose-600 drop-shadow-sm z-0">
                                                                    {formatVNShort(Math.max(0, minSpend - spent))} to target
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Priority 2: Specific Active Rules with spending/earning
                                                    if (stats?.activeRules && stats.activeRules.some(r => r.earned > 0 || r.spent > 0)) {
                                                        return (
                                                            <div className="flex flex-col gap-1.5 w-full">
                                                                {stats.activeRules.filter(r => r.earned > 0 || r.spent > 0).slice(0, 2).map((rule) => {
                                                                    const ruleProgress = rule.max ? Math.min(100, (rule.earned / rule.max) * 100) : (rule.spent > 0 ? 100 : 0);
                                                                    return (
                                                                        <div key={rule.ruleId} className="relative h-4 w-full bg-slate-100 rounded border border-slate-200 overflow-hidden flex items-center">
                                                                            <div
                                                                                className="absolute top-0 left-0 bottom-0 bg-indigo-500/10 transition-all duration-700"
                                                                                style={{ width: `${ruleProgress}%` }}
                                                                            />
                                                                            <div className="relative flex items-center justify-between w-full px-2 z-10">
                                                                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-wider truncate max-w-[150px]">
                                                                                    {rule.name}
                                                                                </span>
                                                                                <span className="text-[8px] font-black text-indigo-600 tabular-nums">
                                                                                    {rule.earned.toLocaleString()} / {rule.max ? rule.max.toLocaleString() : '∞'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    }

                                                    // Priority 3: Overall Cycle Budget Progress
                                                    if (cap > 0) {
                                                        const progress = Math.min((earned / cap) * 100, 100);
                                                        return (
                                                            <div className="relative h-5 w-full rounded-lg shadow-inner">
                                                                <div className="absolute inset-0 bg-slate-100/50 rounded-lg border border-slate-200/60 overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                                                                    <div
                                                                        className="h-full bg-emerald-600 transition-all duration-700 rounded-sm shadow-sm"
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>
                                                                <div
                                                                    className="absolute top-0 bottom-0 flex items-center pl-1.5 transition-all duration-700 z-10"
                                                                    style={{ left: `${progress}%` }}
                                                                >
                                                                    <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-[4px] px-1.5 py-0.5 rounded text-[9px] font-black text-white border border-white/20 shadow-sm whitespace-nowrap">
                                                                        <Zap className="h-2.5 w-2.5 fill-amber-400" />
                                                                        {Math.round(progress)}%
                                                                    </div>
                                                                </div>
                                                                <div className="absolute inset-y-0 right-2 flex items-center text-[10px] font-black text-emerald-700 drop-shadow-sm z-0">
                                                                    {formatMoneyVND(Math.ceil(earned))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Fallback: Unlimited Rewards
                                                    return (
                                                        <div className="flex items-center justify-between h-5 bg-emerald-50 border border-emerald-100/50 rounded-lg px-4 w-full">
                                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em]">Unlimited Rewards Performance</span>
                                                            <Zap className="h-2.5 w-2.5 text-emerald-400 fill-emerald-400 animate-pulse" />
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Row 3: Footer Information */}
                                            <div className="flex justify-between items-end pb-1 px-0.5 min-h-[22px] mt-auto">
                                                {(() => {
                                                    const stats = dynamicCashbackStats;
                                                    const isQualified = stats?.is_min_spend_met;
                                                    const minSpend = stats?.minSpend || 0;
                                                    const spent = stats?.currentSpend || 0;
                                                    const cap = stats?.maxCashback || 0;
                                                    const earned = stats?.earnedSoFar || 0;

                                                    return (
                                                        <>
                                                            <div className="flex flex-col relative pb-1">
                                                                {(!isQualified && minSpend > 0) ? (
                                                                    <div className="flex items-baseline gap-1.5">
                                                                        <span className="text-sm font-black text-rose-600 tracking-tight tabular-nums">
                                                                            <span className="text-[7.5px] font-black uppercase opacity-70 mr-1.5">needs</span>
                                                                            {formatMoneyVND(Math.ceil(minSpend - spent))}
                                                                        </span>
                                                                        <span className="text-[8px] text-slate-400 font-black italic">{formatVNShort(minSpend - spent)}</span>
                                                                    </div>
                                                                ) : cap > 0 && stats.activeRules && stats.activeRules.length === 0 ? (
                                                                    <div className="flex items-baseline gap-1.5">
                                                                        <span className="text-sm font-black text-emerald-700 tracking-tight tabular-nums">
                                                                            <span className="text-[7.5px] font-black uppercase opacity-70 mr-1.5">REMAINING CAP</span>
                                                                            {formatMoneyVND(Math.max(0, cap - earned))}
                                                                        </span>
                                                                        <span className="text-[8px] text-slate-400 font-black italic">{formatVNShort(Math.max(0, cap - earned))}</span>
                                                                    </div>
                                                                ) : stats.activeRules && stats.activeRules.length > 2 ? (
                                                                    <p className="text-[7px] text-slate-300 font-bold uppercase italic mt-1">
                                                                        + {stats.activeRules.length - 2} more specific rules in analytics
                                                                    </p>
                                                                ) : <div />}
                                                            </div>

                                                            {/* CYCLE DISPLAY (Simplified Single Line) */}
                                                            <div className="flex items-center gap-6 shrink-0 ml-auto mr-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Selected</span>
                                                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight tabular-nums leading-none">
                                                                        {stats?.cycle?.label || 'Loading...'}
                                                                    </span>
                                                                </div>

                                                                {selectedCycle && selectedCycle !== 'all' && selectedCycle !== cashbackStats?.cycle?.tag && (
                                                                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                                                                        <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest leading-none">Current</span>
                                                                        <span className="text-sm font-black text-slate-400 uppercase tracking-tight tabular-nums leading-none">
                                                                            {cashbackStats?.cycle?.label}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-baseline gap-1.5 shrink-0">
                                                                <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                                                                    {isQualified ? 'CASHBACK CAP' : 'TARGET'}
                                                                </span>
                                                                <span className="text-sm font-black text-slate-900 tabular-nums leading-none tracking-tight">
                                                                    {formatMoneyVND(Math.ceil(isQualified ? cap : minSpend))}
                                                                </span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </HeaderSection>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="w-[340px] p-0 overflow-hidden border-none shadow-2xl">
                                <div className="bg-white">
                                    <div className="bg-emerald-950 px-4 py-1.5 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <h3 className="font-black text-[9px] uppercase tracking-[0.2em] text-emerald-400/80 leading-tight">Analytics</h3>
                                            <h3 className="font-black text-[11px] uppercase tracking-[0.15em] text-emerald-200">Cashback Performance Report</h3>
                                        </div>
                                        <Zap className="h-3 w-3 text-emerald-400 fill-emerald-400 shadow-sm" />
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {/* Performance Breakdown */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 text-[11px] pb-1 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                                                <span>Metrics</span>
                                                <span className="text-right">Value</span>
                                            </div>
                                            <div className="grid grid-cols-2 text-xs py-1">
                                                <span className="text-slate-500 font-medium whitespace-nowrap">Active Cycle Interval</span>
                                                <span className="text-right font-bold text-slate-900 truncate">
                                                    {dynamicCashbackStats.cycle ? dynamicCashbackStats.cycle.label : 'Current Month'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 text-xs py-1">
                                                <span className="text-slate-500 font-medium">Monthly Eligible Spend</span>
                                                <span className="text-right font-bold text-slate-900">{formatMoneyVND(Math.ceil(dynamicCashbackStats.currentSpend || 0))}</span>
                                            </div>
                                            <div className="grid grid-cols-2 text-xs py-1">
                                                <span className="text-slate-500 font-medium">Cashback Earned</span>
                                                <span className="text-right font-bold text-emerald-600">+{formatMoneyVND(Math.ceil(dynamicCashbackStats.earnedSoFar || 0))}</span>
                                            </div>
                                            <div className="grid grid-cols-2 text-xs py-1">
                                                <span className="text-slate-500 font-medium">Shared with Others</span>
                                                <span className="text-right font-bold text-amber-600">-{formatMoneyVND(Math.ceil(dynamicCashbackStats.sharedAmount || 0))}</span>
                                            </div>
                                            <div className="grid grid-cols-2 text-xs pt-2 border-t border-slate-200 font-black">
                                                <span className="text-emerald-900">NET CYCLE PROFIT</span>
                                                <span className={cn(
                                                    "text-right",
                                                    (dynamicCashbackStats.netProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {formatMoneyVND(Math.ceil(dynamicCashbackStats.netProfit || 0))}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detailed Rule Breakdown */}
                                        {dynamicCashbackStats?.activeRules && dynamicCashbackStats.activeRules.length > 0 && (
                                            <div className="bg-white p-3 border-t border-slate-100 rounded-lg border border-slate-200 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Sparkles className="h-3 w-3 text-emerald-500" />
                                                    Detailed Rule Breakdown
                                                </h4>
                                                <div className="space-y-4">
                                                    {dynamicCashbackStats.activeRules.map((rule) => {
                                                        const ruleProgress = rule.max ? Math.min(100, (rule.earned / rule.max) * 100) : (rule.spent > 0 ? 100 : 0);
                                                        return (
                                                            <div key={rule.ruleId} className="space-y-1.5 flex flex-col">
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-slate-700 truncate max-w-[140px]">{rule.name}</span>
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <span className="font-black text-indigo-600 tabular-nums">
                                                                            {formatMoneyVND(rule.earned)}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-300 tabular-nums mt-0.5 font-bold">
                                                                            / {rule.max ? formatMoneyVND(rule.max) : '∞'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                                    <div
                                                                        className={cn(
                                                                            "h-full transition-all duration-700 rounded-full shadow-sm",
                                                                            rule.isMain ? "bg-emerald-500" : "bg-slate-300"
                                                                        )}
                                                                        style={{ width: `${ruleProgress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Wealth Tracking Supplement */}
                                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 space-y-2">
                                            <h4 className="font-black text-[10px] uppercase text-emerald-600 tracking-widest flex items-center gap-2">
                                                <TrendingUp className="h-3 w-3" />
                                                Wealth Tracking (Yearly)
                                            </h4>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-slate-500 italic">Bank Actual Credit:</span>
                                                    <span className="font-bold text-emerald-600">+{formatMoneyVND(summary?.cashbackTotal || 0)}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px] text-rose-500">
                                                    <span className="text-slate-500 italic">Total Shared Amount:</span>
                                                    <span className="font-bold">-{formatMoneyVND(dynamicCashbackStats.sharedAmount || 0)}</span>
                                                </div>
                                                <div className="pt-1.5 border-t border-emerald-200/50 flex justify-between text-[11px] font-black">
                                                    <span className="text-emerald-800 uppercase">Year Real Benefit</span>
                                                    <span className="text-indigo-600">{formatMoneyVND((summary?.cashbackTotal || 0) - (dynamicCashbackStats.sharedAmount || 0))}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-tighter">Powered by Cashback v3 Engine</span>
                                        <span className="text-slate-300 italic">Live stats</span>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            }

            {/* Tools (Keeping simplified) */}
            {/* Tools */}
            <div className="flex flex-col justify-center gap-2 min-w-0 md:min-w-[120px] border-l border-slate-100 pl-6 ml-2">

                <button
                    onClick={() => setIsSlideOpen(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-1 bg-white border border-slate-200 text-slate-500 rounded hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-[8px] font-black uppercase tracking-widest"
                >
                    <Settings className="w-2.5 h-2.5" />
                    Config
                </button>

                {/* Pending Status Marker - Separate Row */}
                {/* Pending Status Line */}

                {/* ALWAYS render if count > 0 OR if we want to show 'No pending' state, but usually only if items exist.
                    User requested 'No pending' state (Green text). Let's show it if 0 but only if we have summary data.
                */}
                {summary && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!isLoadingPending) {
                                const event = new CustomEvent('open-pending-items-modal', { detail: { accountId: account.id } })
                                window.dispatchEvent(event)
                            }
                        }}
                        disabled={isLoadingPending}
                        className={cn(
                            "mt-1 flex items-center justify-between gap-1 px-1.5 py-1 rounded transition-all duration-200 w-full group border relative overflow-hidden active:scale-[0.98]",
                            (summary.pendingCount || 0) > 0
                                ? "bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200"
                                : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/80 hover:border-emerald-200",
                            isLoadingPending && "opacity-70 cursor-wait"
                        )}
                    >
                        {isLoadingPending && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
                                <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 min-w-0">
                            {(summary.pendingCount || 0) > 0 ? (
                                <span className="flex h-1.5 w-1.5 relative shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
                                </span>
                            ) : (
                                <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                            )}
                            <span className={cn(
                                "text-[8px] font-black uppercase tracking-tighter truncate",
                                (summary.pendingCount || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                            )}>
                                {(summary.pendingCount || 0) > 0 ? `${summary.pendingCount} Items` : "No Pending"}
                            </span>
                        </div>
                        {(summary.pendingCount || 0) > 0 && (
                            <span className="text-[7px] font-bold text-rose-400 uppercase tracking-widest px-0.5 bg-white rounded border border-rose-100 group-hover:border-rose-200 shrink-0">Wait</span>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
