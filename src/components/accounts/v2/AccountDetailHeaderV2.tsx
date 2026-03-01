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
    CheckCircle2,
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
    Sparkles,
    ShieldCheck,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    RotateCcw,
    FilterX
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
    onYearChange: (year: string) => void
    selectedCycle?: string
    onCycleChange?: (cycle: string | undefined) => void
    currentCycleTag?: string
    summary: {
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
        cardYearlyCashbackTotal?: number
        cardYearlyCashbackGivenTotal?: number
        yearActualCashbackTotal?: number
        netProfitYearly?: number
    }
    isLoadingPending?: boolean
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

const formatFullNumber = (amount: number) => {
    return Math.round(Math.abs(amount)).toLocaleString('en-US')
}

const formatShortNumber = (amount: number) => {
    const abs = Math.abs(amount);
    if (abs >= 1000000) return `${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${(abs / 1000).toFixed(0)}k`;
    return abs.toString();
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
    onCycleChange,
    currentCycleTag,
    summary,
    isLoadingPending
}: AccountDetailHeaderV2Props) {
    const [isPending, startTransition] = React.useTransition()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isSlideOpen, setIsSlideOpen] = React.useState(false)
    const [dynamicCashbackStats, setDynamicCashbackStats] = React.useState<AccountSpendingStats | null>(cashbackStats)
    const [isCashbackLoading, setIsCashbackLoading] = React.useState(false)
    const [isSyncing, setIsSyncing] = React.useState(false)

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
            router.push(`? ${params.toString()} `, { scroll: false })
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
                console.log('[AccountDetailHeaderV2] Fetching cashback stats for cycle:', selectedCycle)
                // Pass the cycle tag directly to the API instead of reconstructing date
                // This ensures the API resolves to the correct cycle for statement cycles
                const response = await fetch(`/api/cashback/stats?accountId=${account.id}&cycleTag=${encodeURIComponent(selectedCycle)}`)
                if (response.ok) {
                    const data = await response.json()
                    console.log('[AccountDetailHeaderV2] Received cashback stats:', {
                        earnedSoFar: data.earnedSoFar,
                        sharedAmount: data.sharedAmount,
                        netProfit: data.netProfit,
                        currentSpend: data.currentSpend,
                        cycle: data.cycle,
                        fullData: data
                    })
                    setDynamicCashbackStats(data)
                } else {
                    console.error('[AccountDetailHeaderV2] API returned error:', response.status)
                }
            } catch (error) {
                console.error('[AccountDetailHeaderV2] Failed to fetch cashback stats:', error)
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
            router.replace(`? ${params.toString()} `, { scroll: false });
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
    const HeaderSection = React.forwardRef<HTMLDivElement, { label: string, children: React.ReactNode, className?: string, borderColor?: string, badge?: React.ReactNode, hint?: string, hideHintInHeader?: boolean } & React.HTMLAttributes<HTMLDivElement>>(
        ({ label, children, className, borderColor = "border-slate-200", badge, hint, hideHintInHeader, ...props }, ref) => (
            <div ref={ref} className={cn("relative border rounded-xl px-4 py-2 flex flex-col group/header", borderColor, className)} {...props}>
                <div className="absolute -top-2.5 left-3 flex items-center gap-2 z-10">
                    <span className="bg-white px-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
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

    const dueDateBadge = React.useMemo(() => {
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
            const config = normalizeCashbackConfig(account.cashback_config, account);
            const rawDueDay = account.due_date || account.credit_card_info?.payment_due_day || config?.dueDate;

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

        if (!label) return <div className="flex items-center justify-center h-full"><span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter opacity-50">No Due Date</span></div>;

        return (
            <div className="flex flex-col items-center justify-center h-full gap-1">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Due Term</span>
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black tracking-tight shadow-sm whitespace-nowrap",
                    isUrgent
                        ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.1)]"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                )}>
                    <Clock className="h-3 w-3 opacity-70" />
                    <span>{label}</span>
                    <span className="opacity-30">|</span>
                    <Calendar className="h-3 w-3 opacity-70" />
                    <span>{dateLabel}</span>
                </div>
            </div>
        );
    }, [account, startOfDay])

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-2 md:flex-row md:items-stretch sticky top-0 z-60 shadow-sm">
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
            <HeaderSection label="Account" className="min-w-0 sm:min-w-[340px] !h-[120px] justify-between py-2">
                <div className="flex items-center gap-3 h-[60px] pt-1">
                    <Link
                        href="/accounts"
                        className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>

                    <div className="relative shrink-0 flex items-center h-12">
                        {account.image_url ? (
                            <img src={account.image_url} alt="" className="h-full w-auto max-w-[80px] object-contain transition-all" />
                        ) : (
                            <div className="w-12 h-12 overflow-hidden flex items-center justify-center border border-slate-100 bg-white rounded-lg">
                                <div className="text-xl font-bold text-slate-400 capitalize">{account.name.charAt(0)}</div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col min-w-0 justify-center h-[66px] gap-2">
                        {/* Line 1: Account Name Alone */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h1 className="text-[13px] font-black text-slate-900 leading-none truncate max-w-[240px] cursor-default uppercase tracking-tight">
                                        {account.name}
                                    </h1>
                                </TooltipTrigger>
                                <TooltipContent className="z-[100]">{account.name}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Line 2: Receiver + Account Number + Edit Unified Badge */}
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md h-[26px] whitespace-nowrap">
                                {account.receiver_name && (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <User className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                                {account.receiver_name}
                                            </span>
                                        </div>
                                        <span className="text-slate-200 font-bold mx-0.5">•</span>
                                    </>
                                )}
                                <div className="flex items-center gap-1">
                                    <Hash className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                                    <span className="text-[9px] font-black text-slate-500 tracking-wide tabular-nums">
                                        {account.account_number ? (account.account_number.length > 10 ? account.account_number.substring(0, 10) + "..." : account.account_number) : '••••'}
                                    </span>
                                </div>

                                <Popover open={isEditPopoverOpen} onOpenChange={setIsEditPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="ml-1 text-slate-300 hover:text-indigo-500 transition-colors">
                                            <Edit className="h-2.5 w-2.5" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-[280px] z-[90] shadow-2xl border-indigo-100"
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
                                                    className="h-8 text-xs font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">Receiver Name</span>
                                                <Input
                                                    value={editValues.receiver_name}
                                                    onChange={(e) => setEditValues(prev => ({ ...prev, receiver_name: e.target.value }))}
                                                    placeholder="Receiver Name"
                                                    className="h-8 text-xs font-bold"
                                                />
                                            </div>
                                            <button onClick={handleSaveInfo} className="w-full h-8 bg-indigo-600 text-white text-xs font-bold rounded mt-2 hover:bg-indigo-700 transition-colors shadow-lg active:scale-[0.98]">
                                                Save Changes
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {account.secured_by_account_id && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-100 rounded-md h-[26px]">
                                    <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                    <span className="text-[8px] font-black text-amber-700 uppercase tracking-tighter">Secured</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {rewardsCount > 0 && (
                    <div className="flex items-center gap-1.5 pl-0.5 mt-auto h-[32px] w-full">
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
                                                        <React.Fragment key={`${cat.id} -${idx} `}>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[200px]">{cat.name}</span>
                                                                {cat.mcc_codes && cat.mcc_codes.length > 0 && (
                                                                    <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                                                                        {Array.from(new Set(cat.mcc_codes)).map(mcc => (
                                                                            <span key={mcc} className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-1 rounded-sm shadow-sm tabular-nums">
                                                                                {mcc}
                                                                            </span>
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
                                <div className="bg-white">
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
                                                                                                    <span key={mcc} className="text-[9px] font-bold bg-white border border-slate-200 px-1 rounded text-slate-500 tabular-nums">
                                                                                                        {mcc}
                                                                                                    </span>
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
                                    borderColor="border-indigo-100"
                                    className="flex-[5] min-w-0 w-full bg-indigo-50/10 cursor-help !h-[120px]"
                                >
                                    <div className="flex flex-col h-full justify-center">
                                        {/* Row 1: Metrics & Health Circle */}
                                        <div className="flex items-center gap-4 md:gap-10 w-full h-[60px] pt-1">
                                            {/* Left: Health Indicator */}
                                            {(() => {
                                                const limit = account.credit_limit || 0
                                                const usagePercent = limit > 0 ? Math.min((outstandingBalance / limit) * 100, 100) : 0
                                                const isDanger = usagePercent > 90
                                                const radius = 22
                                                const circumference = 2 * Math.PI * radius
                                                const offset = circumference - (usagePercent / 100) * circumference

                                                return (
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="relative flex items-center justify-center">
                                                            <svg className="h-[52px] w-[52px] -rotate-90">
                                                                <circle
                                                                    cx="26"
                                                                    cy="26"
                                                                    r={radius}
                                                                    fill="transparent"
                                                                    stroke="currentColor"
                                                                    strokeWidth="3.5"
                                                                    className="text-slate-100"
                                                                />
                                                                <circle
                                                                    cx="26"
                                                                    cy="26"
                                                                    r={radius}
                                                                    fill="transparent"
                                                                    stroke="currentColor"
                                                                    strokeWidth="3.5"
                                                                    strokeDasharray={circumference}
                                                                    style={{ strokeDashoffset: offset }}
                                                                    strokeLinecap="round"
                                                                    className={cn(
                                                                        "transition-all duration-1000 ease-out",
                                                                        isDanger ? "text-rose-500" : "text-indigo-600"
                                                                    )}
                                                                />
                                                            </svg>
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                                                                <span className="text-[10px] font-black">{Math.round(usagePercent)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Usage Level</span>
                                                            <div className={cn(
                                                                "text-[10px] font-black leading-none mt-1 px-2 py-0.5 rounded border border-indigo-100/50 uppercase tracking-tight",
                                                                usagePercent > 90 ? "text-rose-700 bg-rose-50 border-rose-200" :
                                                                    usagePercent > 50 ? "text-amber-700 bg-amber-50 border-amber-200" :
                                                                        "text-indigo-700 bg-indigo-50"
                                                            )}>
                                                                {usagePercent > 90 ? "DANGER" : usagePercent > 30 ? "STABLE" : "EXCELLENT"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })()}

                                            <div className="h-10 w-px bg-slate-100 shrink-0" />

                                            {/* Right: Balance Metrics */}
                                            <div className="flex items-center gap-4 md:gap-8 lg:gap-12 flex-1 min-w-0">
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                                        <BarChart3 className="h-3 w-3 text-slate-400" />
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Available</span>
                                                    </div>
                                                    <div className={cn(
                                                        "text-[13px] md:text-[15px] font-black tracking-tight leading-none tabular-nums truncate",
                                                        availableBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                                    )}>
                                                        {formatFullNumber(availableBalance)}
                                                    </div>
                                                </div>

                                                <div className="ml-auto shrink-0">
                                                    {dueDateBadge}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Progress (REMOVED) */}

                                        {/* Row 3: Metrics & Badges (Footer) */}
                                        <div className="flex items-center gap-2 px-0.5 mt-auto h-[32px] mb-[2px]">
                                            {(() => {
                                                const waiverTarget = account.annual_fee_waiver_target
                                                const spent = summary?.yearExpensesTotal || 0
                                                const needsWaiver = waiverTarget ? Math.max(0, waiverTarget - spent) : 0

                                                if (!waiverTarget) return null;

                                                const progress = Math.min((spent / waiverTarget) * 100, 100);

                                                return (
                                                    <div className="flex items-center gap-1.5 w-full">
                                                        {/* Badge 1: Waiver Status (Needs/Met) */}
                                                        <div className={cn(
                                                            "px-2 px-2 flex flex-col items-center justify-center leading-tight rounded-md border h-8 min-w-[70px]",
                                                            needsWaiver > 0 ? "bg-amber-50 border-amber-200 text-amber-700 font-bold" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                        )}>
                                                            <span className="text-[7px] uppercase tracking-tighter opacity-70">Waiver</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[9px] font-black uppercase tracking-tight">{needsWaiver > 0 ? "Needs" : "Met"}</span>
                                                            </div>
                                                        </div>

                                                        {/* Badge 2: Progress Status with Bar */}
                                                        <div className="flex-1 min-w-[80px] px-2 py-0.5 rounded-md border bg-white border-slate-100 flex flex-col justify-center h-8 relative overflow-hidden">
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Progress</span>
                                                                <span className={cn("text-[8px] font-black tabular-nums", needsWaiver > 0 ? "text-amber-600" : "text-emerald-600")}>
                                                                    {Math.round(progress)}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                                                <div
                                                                    className={cn(
                                                                        "h-full transition-all duration-1000 ease-out",
                                                                        progress >= 100 ? "bg-emerald-500" : "bg-amber-400"
                                                                    )}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Badge 3: Missing */}
                                                        {needsWaiver > 0 && (
                                                            <div className="px-2 rounded-md border bg-white border-slate-100 flex flex-col items-center justify-center h-8 min-w-[70px]">
                                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Missing</span>
                                                                <span className="text-[9px] font-black text-rose-600 tabular-nums">
                                                                    {formatFullNumber(needsWaiver)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Badge 4: Target */}
                                                        <div className="px-2 rounded-md border bg-white border-slate-100 flex flex-col items-center justify-center h-8 min-w-[70px]">
                                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Wv Target</span>
                                                            <span className="text-[9px] font-black text-slate-600 tabular-nums">
                                                                {formatFullNumber(waiverTarget)}
                                                            </span>
                                                        </div>

                                                        {/* Badge 5: Limit (Moved here to save space above) */}
                                                        <div className="px-2 rounded-md border bg-white border-slate-100 flex flex-col items-center justify-center h-8 min-w-[70px]">
                                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Cr Limit</span>
                                                            <span className="text-[9px] font-black text-indigo-600 tabular-nums">
                                                                {formatFullNumber(account.credit_limit || 0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                </HeaderSection>

                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="w-[340px] p-0 overflow-hidden border-none shadow-2xl">
                                <div className="bg-white">
                                    <div className="bg-indigo-950 px-4 py-2 flex items-center justify-between gap-2">
                                        {/* Left: labels stacked */}
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="font-black text-[9px] uppercase tracking-[0.2em] text-indigo-400/80 leading-tight whitespace-nowrap">Analytics</h3>
                                            <div className="flex items-center gap-2 flex-nowrap overflow-hidden">
                                                <h3 className="font-black text-[11px] uppercase tracking-[0.15em] text-indigo-200 whitespace-nowrap shrink-0">Credit Health Report</h3>
                                                {!!account.annual_fee && (
                                                    <span className="text-[9px] font-black text-indigo-400 opacity-70 px-1.5 py-0.5 rounded bg-indigo-900/40 border border-indigo-700/50 whitespace-nowrap overflow-hidden text-ellipsis">
                                                        Fee: {formatFullNumber(account.annual_fee)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Right: year select + icon */}
                                        <div className="flex items-center gap-2 shrink-0">
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
                                                            {formatFullNumber(summary?.yearExpensesTotal || 0)}
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
                                        borderColor="border-sky-100"
                                        className="flex-1 min-w-[280px] bg-sky-50/10 cursor-help !h-[120px] mb-2"
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
                                                    <span className="text-[11px] font-black text-emerald-600">+{formatFullNumber(summary?.yearPureIncomeTotal || 0)}</span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Outgoing</span>
                                                    <span className="text-[11px] font-black text-rose-500">-{formatFullNumber(summary?.yearPureExpenseTotal || 0)}</span>
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
                                        borderColor="border-amber-100"
                                        className="flex-1 min-w-[280px] bg-amber-50/10 cursor-help !h-[120px] mb-2"
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
                                                        style={{ width: `${Math.min(100, (summary?.yearLentTotal ? ((summary?.yearRepaidTotal || 0) / summary.yearLentTotal) * 100 : 0))}% ` }}
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
                                                        style={{ width: `${Math.min(100, (summary?.yearLentTotal ? ((summary?.yearRepaidTotal || 0) / summary.yearLentTotal) * 100 : 0))}% ` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <HeaderSection label="Account Balance" className="flex-1 min-w-[200px] bg-slate-50/10 !h-[120px] mb-2">
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
                isCreditCard && (
                    <div className="flex flex-[5] min-w-[420px]">
                        <HeaderSection
                            label="Cashback Performance"
                            borderColor="border-emerald-100"
                            className="w-full bg-emerald-50/10 !h-[120px] mb-2"
                            hideHintInHeader
                        >
                            {isCashbackLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative flex items-center justify-center">
                                            <div className="h-8 w-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                                            <div className="absolute inset-0 m-auto h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading stats...</span>
                                    </div>
                                </div>
                            ) : dynamicCashbackStats ? (
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-start gap-10 w-full h-[60px] pt-1">
                                    {(() => {
                                        const stats = dynamicCashbackStats;
                                        const earnedCurrent = stats?.earnedSoFar || 0;
                                        const cycleShared = stats?.sharedAmount || 0;
                                        const cycleProfit = stats?.netProfit || 0;
                                        const threshold = stats?.minSpend || 0;
                                        const spent = stats?.currentSpend || 0;
                                        const isQualified = stats?.is_min_spend_met ?? false;
                                        const progressPercent = threshold > 0 ? Math.min((spent / threshold) * 100, 100) : 100;

                                        const progressBadge = (
                                            <div className="h-10 w-10 shrink-0 relative flex items-center justify-center">
                                                <svg className="h-full w-full transform -rotate-90">
                                                    <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-slate-100" />
                                                    <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={113} strokeDashoffset={113 - (113 * progressPercent) / 100} className={cn("transition-all duration-1000", isQualified ? "text-emerald-500" : "text-amber-500")} />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                    <span className="text-[8px] font-black tabular-nums">{Math.round(progressPercent)}%</span>
                                                </div>
                                            </div>
                                        );

                                        return (
                                            <>
                                                {/* Cycle Stats (Top Bar) */}
                                                <div className="flex items-center gap-3">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="cursor-help">
                                                                    {progressBadge}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="z-[100] max-w-[200px]">
                                                                <span className="text-[10px] font-bold">Progress to Minimum Spend Target.</span>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <div className="flex flex-col">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 cursor-help">Cycle Earned</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="z-[100] max-w-[200px]">
                                                                    <p className="text-[10px] font-bold">Tổng tiền Cashback dự kiến tích lũy trong chu kỳ hiện tại (dựa trên các giao dịch chi tiêu).</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <span className="text-[16px] font-black text-emerald-600 transition-all tabular-nums leading-none">
                                                            {formatFullNumber(earnedCurrent)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-10 items-center">
                                                    <div className="h-8 w-px bg-slate-100" />

                                                    {/* Cycle Profit */}
                                                    <TooltipProvider>
                                                        <Tooltip delayDuration={200}>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex flex-col cursor-help group/profit">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight group-hover/profit:text-indigo-600 transition-colors underline decoration-dotted decoration-slate-200">Profit</span>
                                                                    <span className={cn("text-[13px] font-black tabular-nums leading-none mt-1", cycleProfit >= 0 ? "text-emerald-700" : "text-rose-600")}>
                                                                        {formatFullNumber(cycleProfit)}
                                                                    </span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="z-[100] max-w-[200px] p-3 bg-indigo-950 text-white border-none shadow-xl">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Cycle Net Profit</h4>
                                                                <p className="text-[10px] font-medium opacity-80">Lợi nhuận ròng của chu kỳ này sau khi trừ đi khoản chia sẻ. Công thức: <span className="text-amber-300 font-bold">Cycle Earned</span> - <span className="text-rose-300 font-bold">Shared</span>.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    {/* Cycle Shared */}
                                                    <TooltipProvider>
                                                        <Tooltip delayDuration={200}>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex flex-col cursor-help group/shared">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight group-hover/shared:text-amber-600 transition-colors underline decoration-dotted decoration-slate-200">Shared</span>
                                                                    <span className="text-[13px] font-black text-amber-600 tabular-nums leading-none mt-1">{formatFullNumber(cycleShared)}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="z-[100] max-w-[200px] p-3 bg-amber-950 text-white border-none shadow-xl">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Cycle Shared Amount</h4>
                                                                <p className="text-[10px] font-medium opacity-80">Số tiền Cashback dự kiến trích hoặc chia sẻ cho người khác theo cài đặt cá nhân trong chu kỳ này.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    {/* Year Report Trigger Badge */}
                                                    <TooltipProvider>
                                                        <Tooltip delayDuration={200}>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center group/report cursor-help active:scale-95 transition-transform ml-2">
                                                                    <div className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-400 flex items-center gap-1.5 shadow-sm group-hover/report:bg-indigo-600 group-hover/report:text-white group-hover/report:border-indigo-600 transition-all">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">{summary.targetYear || new Date().getFullYear()}</span>
                                                                        <BarChart3 className="h-2.5 w-2.5" />
                                                                        <Info className="h-2.5 w-2.5 opacity-50" />
                                                                    </div>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="bottom" className="z-[100] w-[380px] p-0 overflow-hidden border-none shadow-2xl">
                                                                <div className="bg-white">
                                                                    <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white">
                                                                        <div className="flex flex-col">
                                                                            <h3 className="font-black text-[9px] uppercase tracking-[0.2em] text-indigo-400 leading-tight">Analytics</h3>
                                                                            <h3 className="font-black text-[12px] uppercase tracking-[0.15em] text-white">Cashback Performance Report</h3>
                                                                        </div>
                                                                        <Sparkles className="h-4 w-4 text-amber-400 fill-amber-400" />
                                                                    </div>
                                                                    <div className="p-4 space-y-4">
                                                                        <div className="text-[10px] font-bold text-slate-500 italic border-l-2 border-indigo-500 pl-3 py-1 bg-indigo-50/50">
                                                                            Báo cáo hiệu suất hoàn tiền dựa trên dữ liệu chu kỳ hiên tại và dự báo cả năm.
                                                                        </div>

                                                                        <div className="space-y-3">
                                                                            {/* Main Metrics */}
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                                                                                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Cycle Earned</div>
                                                                                    <div className="text-base font-black text-emerald-600 tabular-nums">{formatMoneyVND(Math.ceil(stats?.earnedSoFar || 0))}</div>
                                                                                </div>
                                                                                <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                                                                                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Year Projected</div>
                                                                                    <div className="text-base font-black text-indigo-600 tabular-nums">{formatMoneyVND(Math.ceil(stats?.estYearlyTotal || summary?.cardYearlyCashbackTotal || 0))}</div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-1">
                                                                                <div className="grid grid-cols-2 text-[10px] pb-1.5 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                                                                                    <span>Cycle Insight</span>
                                                                                    <span className="text-right">Detail</span>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 text-[11px] py-1.5 hover:bg-slate-50 px-1 rounded transition-colors">
                                                                                    <span className="text-slate-500 font-medium">Interval</span>
                                                                                    <span className="text-right font-bold text-slate-900">{stats?.cycle ? stats.cycle.label : 'Current Month'}</span>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 text-[11px] py-1.5 hover:bg-slate-50 px-1 rounded transition-colors">
                                                                                    <span className="text-slate-500 font-medium">Eligible Spend</span>
                                                                                    <span className="text-right font-bold text-slate-900">{formatMoneyVND(Math.ceil(stats?.currentSpend || 0))}</span>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 text-[11px] py-1.5 hover:bg-slate-50 px-1 rounded transition-colors">
                                                                                    <span className="text-slate-500 font-medium">Spent Threshold</span>
                                                                                    <span className="text-right font-bold text-amber-600">{formatMoneyVND(Math.ceil(stats?.minSpend || 0))}</span>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 text-[11px] py-1.5 pt-2 mt-1 border-t border-slate-100">
                                                                                    <span className="text-slate-900 font-black uppercase text-[9px]">Net Cycle Profit</span>
                                                                                    <span className={cn("text-right font-black text-[14px]", (stats?.netProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                                                        {formatMoneyVND(Math.ceil(stats?.netProfit || 0))}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Rule Breakdown Mini */}
                                                                            {stats?.activeRules && stats.activeRules.length > 0 && (
                                                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Rules Applied</div>
                                                                                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                                                                        {stats.activeRules.map((rule, idx) => (
                                                                                            <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 rounded transition-colors group/r">
                                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                                                                    <span className="font-bold text-slate-600 truncate group-hover/r:text-indigo-600">{rule.name}</span>
                                                                                                </div>
                                                                                                <span className="font-black text-emerald-600 tabular-nums shrink-0 ml-3">+{formatFullNumber(rule.earned)}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-between items-center text-[9px]">
                                                                        <span className="font-black text-slate-400 uppercase tracking-widest">Money Flow Analytics Engine</span>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <RefreshCw className="h-2.5 w-2.5 text-indigo-400" />
                                                                            <span className="text-indigo-400 font-bold uppercase tracking-widest">Live Sync</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Row 3: Footer Badges */}
                                <div className="flex items-center gap-2 px-0.5 mt-auto h-[32px] mb-[2px]">
                                    {(() => {
                                        const estBack = dynamicCashbackStats?.earnedSoFar || 0;
                                        const shared = dynamicCashbackStats?.sharedAmount || 0;
                                        const cycleProfit = dynamicCashbackStats?.netProfit || 0;
                                        const limit = dynamicCashbackStats?.maxCashback || 0;
                                        const potential = dynamicCashbackStats?.potentialProfit || 0;
                                        const threshold = dynamicCashbackStats?.minSpend || 0;
                                        const spent = dynamicCashbackStats?.currentSpend || 0;
                                        const missing = Math.max(0, threshold - spent);

                                        const footerBadges = [
                                            { label: "Est Cashback", value: formatFullNumber(estBack), icon: <TrendingUp className="h-3 w-3" />, theme: "text-emerald-700 bg-emerald-50 border-emerald-200", formula: "Tổng cashback ước tính của chu kỳ đang chọn." },
                                            { label: "Shared", value: formatFullNumber(shared), icon: <Users2 className="h-3 w-3" />, theme: "text-amber-700 bg-amber-50 border-amber-200", formula: "Tổng cashback chia sẻ trong chu kỳ đang chọn." },
                                            { label: "Profit", value: formatFullNumber(cycleProfit), icon: <CheckCircle2 className="h-3 w-3" />, theme: cycleProfit >= 0 ? "text-indigo-700 bg-indigo-50 border-indigo-200" : "text-rose-700 bg-rose-50 border-rose-200", formula: "Lợi nhuận ròng chu kỳ = Est Cashback - Shared." },
                                            { label: "Limit / Target", value: `${limit > 0 ? formatShortNumber(limit) : "∞"} / ${formatShortNumber(threshold)}`, icon: <Target className="h-3 w-3" />, theme: "text-slate-600 bg-slate-50 border-slate-200", formula: `Hạn mức Cashback (${formatFullNumber(limit)}) và Ngưỡng chi tiêu tối thiểu (${formatFullNumber(threshold)}).` },
                                            ...(missing > 0 ? [{ label: "Missing", value: formatFullNumber(missing), icon: <FilterX className="h-3 w-3" />, theme: "text-rose-700 bg-rose-50 border-rose-200", formula: "Số tiền chi tiêu còn thiếu để đạt ngưỡng tối thiểu nhận Cashback tối ưu." }] : []),
                                            { label: "Potential", value: formatFullNumber(potential), icon: <Sparkles className="h-3 w-3" />, theme: "text-orange-700 bg-orange-50 border-orange-200", formula: "Lợi nhuận tiềm năng nếu tối ưu hóa quy tắc hoàn tiền." },
                                            { label: "Period", value: dynamicCashbackStats?.cycle?.label || "ALL", icon: <Calendar className="h-3 w-3" />, theme: "text-slate-600 bg-white border-slate-200", formula: "Khoảng thời gian dữ liệu đang hiển thị." }
                                        ];

                                        return (
                                            <>
                                                {footerBadges.map((badge, idx) => (
                                                    <TooltipProvider key={idx}>
                                                        <Tooltip delayDuration={200}>
                                                            <TooltipTrigger asChild>
                                                                <div
                                                                    className={cn(
                                                                        "flex-1 px-1.5 py-0.5 rounded-md border shadow-sm flex flex-col items-center justify-center leading-none h-8 transition-all hover:shadow-md min-w-0 bg-white cursor-help",
                                                                        badge.theme
                                                                    )}
                                                                >
                                                                    <span className="text-[7px] font-bold uppercase tracking-tighter opacity-70 mb-0.5 truncate w-full text-center">{badge.label}</span>
                                                                    <div className="flex items-center gap-1 justify-center w-full">
                                                                        <div className="shrink-0 opacity-70 mb-[1px]">{badge.icon}</div>
                                                                        <span className="text-[10px] font-black tabular-nums tracking-tight truncate shrink">{badge.value}</span>
                                                                    </div>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="z-[100] max-w-[200px] p-3 text-[10px] font-medium leading-relaxed">
                                                                <h4 className="font-black uppercase tracking-widest mb-1.5 border-b border-indigo-100 pb-1">{badge.label}</h4>
                                                                <p className="opacity-90">{badge.formula}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ))}

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => {
                                                                    setIsSyncing(true);
                                                                    router.refresh();
                                                                    setTimeout(() => setIsSyncing(false), 800);
                                                                    toast.success('Stats Refreshed');
                                                                }}
                                                                className="w-10 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all active:scale-90 group/reset shrink-0"
                                                            >
                                                                <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="z-[100]">Sync DB & Recalculate</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="mt-auto" />
                            </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <span className="text-xs text-slate-400">No cashback data</span>
                                </div>
                            )}
                        </HeaderSection>
                    </div>
                )
            }

            {/* Tools Area */}
            <div className="flex flex-col justify-center gap-2 min-w-0 md:min-w-[120px] border-l border-slate-100 pl-6 ml-2">
                <button
                    onClick={() => {
                        setIsSyncing(true);
                        router.refresh();
                        setTimeout(() => {
                            setIsSyncing(false);
                            toast.success("Database synced successfully");
                        }, 800);
                    }}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 w-full py-1 bg-white border border-slate-200 text-slate-500 rounded hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all text-[8px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-wait"
                >
                    {isSyncing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                    {isSyncing ? "Syncing..." : "Sync DB"}
                </button>

                <button
                    onClick={() => setIsSlideOpen(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-1 bg-white border border-slate-200 text-slate-500 rounded hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-[8px] font-black uppercase tracking-widest"
                >
                    <Settings className="w-2.5 h-2.5" />
                    Config
                </button>

                {summary && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const event = new CustomEvent('open-pending-items-modal', { detail: { accountId: account.id } });
                            window.dispatchEvent(event);
                        }}
                        disabled={isLoadingPending}
                        className={cn(
                            "mt-1 flex items-center justify-between gap-1 px-1.5 py-1 rounded transition-all duration-200 w-full group border relative overflow-hidden active:scale-[0.98]",
                            (summary.pendingCount || 0) > 0 ? "bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200" : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/80 hover:border-emerald-200",
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
                            <span className={cn("text-[8px] font-black uppercase tracking-tighter truncate", (summary.pendingCount || 0) > 0 ? "text-rose-600" : "text-emerald-600")}>
                                {(summary.pendingCount || 0) > 0 ? `${summary.pendingCount} Items` : "No Pending"}
                            </span>
                        </div>
                        {(summary.pendingCount || 0) > 0 && (
                            <span className="text-[7px] font-bold text-rose-400 uppercase tracking-widest px-0.5 bg-white rounded border border-rose-100 group-hover:border-rose-200 shrink-0">Wait</span>
                        )}
                    </button>
                )}
            </div>
        </div >
    );
}
