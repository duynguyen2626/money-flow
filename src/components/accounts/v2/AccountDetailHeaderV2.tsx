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
    Loader2
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
    }
    isLoadingPending?: boolean
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

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
        onYearChange(year)
        const params = new URLSearchParams(searchParams.toString())
        if (year) params.set('year', year)
        else params.delete('year')
        router.push(`?${params.toString()}`, { scroll: false })
        router.refresh()
    }

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
            const program = normalizeCashbackConfig(account.cashback_config);
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
    const HeaderSection = ({ label, children, className, borderColor = "border-slate-200", badge }: { label: string, children: React.ReactNode, className?: string, borderColor?: string, badge?: React.ReactNode }) => (
        <div className={cn("relative border rounded-xl px-4 py-1.5 flex flex-col", borderColor, className)}>
            <div className="absolute -top-2 left-3 flex items-center gap-2 z-10">
                <span className="bg-white px-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {label}
                </span>
                {badge}
            </div>
            {children}
        </div>
    )

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
                categories={categories}
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
                                    <Hash className="h-3 w-3 text-slate-400 shrink-0" title="Account Number" />
                                    {account.account_number || '•••• •••• ••••'}
                                </span>
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
                                    <User className="h-3 w-3 text-slate-300 shrink-0" title="Receiver Name" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {account.receiver_name}
                                    </span>
                                </div>
                            )}
                            {rewardsCount > 0 && (
                                <div className="flex items-center gap-1.5 pl-0.5 mt-1.5 w-fit">
                                    <HoverCard openDelay={0} closeDelay={150}>
                                        <HoverCardTrigger asChild>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-md text-amber-700 cursor-help active:scale-95 transition-transform hover:bg-amber-100 hover:border-amber-200 shadow-sm group/badge">
                                                <Zap className="h-3 w-3 fill-amber-400 text-amber-500 group-hover/badge:animate-pulse" />
                                                {(() => {
                                                    try {
                                                        const program = normalizeCashbackConfig(account.cashback_config);
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

                                                        const mainCatId = allCatIds[0];
                                                        const mainCat = categories.find(c => c.id === mainCatId || c.name === mainCatId);
                                                        const displayName = mainCat ? mainCat.name : (mainCatId || 'Rewards');
                                                        const remaining = allCatIds.length - 1;

                                                        return (
                                                            <>
                                                                <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[100px]">{displayName}</span>
                                                                {remaining > 0 && (
                                                                    <span className="text-[9px] font-bold text-amber-600/80 border-l border-amber-200 pl-1.5 ml-0.5">+{remaining} more</span>
                                                                )}
                                                            </>
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
                                                    const program = normalizeCashbackConfig(account.cashback_config);
                                                    const rules = (program.levels || []).flatMap((l: any) => l.rules || []);
                                                    return <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase">{rules.length} Rules</span>
                                                })()}
                                            </div>

                                            <div className="bg-white max-h-[300px] overflow-y-auto">
                                                {(() => {
                                                    try {
                                                        const program = normalizeCashbackConfig(account.cashback_config);
                                                        const rules: any[] = [];
                                                        (program.levels || []).forEach((lvl: any) => {
                                                            (lvl.rules || []).forEach((r: any) => {
                                                                rules.push({ ...r, levelName: lvl.name });
                                                            });
                                                        });

                                                        if (rules.length === 0 && program.defaultRate > 0) {
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
                                                                        {(program.defaultRate * 100).toFixed(1)}%
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
                                                                                                        {cat.mcc_codes.map(mcc => (
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
                        </div>
                    </div>
                </div>
            </HeaderSection >

            {
                isCreditCard ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex-1 min-w-[400px]">
                                    <HeaderSection
                                        label="Credit Health"
                                        borderColor="border-indigo-100"
                                        className="h-full bg-indigo-50/10 cursor-help"
                                    // badge prop removed, moved to content
                                    >
                                        <div className="flex flex-col h-full py-0.5">
                                            {/* Line 1: Amount + Cycle Badge */}
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <div className={cn(
                                                    "text-lg font-black tracking-tighter leading-none shrink-0 tabular-nums",
                                                    availableBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {formatMoneyVND(Math.ceil(availableBalance))}
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100/50 border border-indigo-200/50 rounded text-indigo-700 shrink-0">
                                                    <Calendar className="h-3 w-3" />
                                                    <span className="text-[9.5px] font-black uppercase tracking-tight">{dynamicCashbackStats?.cycle.label}</span>
                                                </div>

                                            </div>

                                            <div className="mt-auto space-y-2">
                                                <div className="relative h-5 w-full rounded-lg shadow-inner">
                                                    {(() => {
                                                        const limit = account.credit_limit || 0
                                                        const usage = limit > 0 ? Math.min((outstandingBalance / limit) * 100, 100) : 0
                                                        const isDanger = usage > 90

                                                        // Waiver marker logic
                                                        const waiverTarget = account.annual_fee_waiver_target
                                                        const spent = summary?.yearExpensesTotal || 0
                                                        const isWaiverMet = spent >= (waiverTarget || 0)

                                                        return (
                                                            <>
                                                                <div className="absolute inset-0 bg-slate-100/50 rounded-lg border border-slate-200 overflow-hidden">
                                                                    <div
                                                                        className={cn("h-full transition-all duration-700 rounded-sm", isDanger ? "bg-rose-500" : "bg-indigo-600")}
                                                                        style={{ width: `${usage}%` }}
                                                                    />
                                                                </div>
                                                                <div
                                                                    className="absolute top-0 bottom-0 flex items-center pl-1.5 transition-all duration-700 z-10"
                                                                    style={{ left: `${usage}%` }}
                                                                >
                                                                    <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-[4px] px-1.5 py-0.5 rounded text-[9px] font-black text-white border border-white/20 shadow-sm whitespace-nowrap">
                                                                        <Info className="h-2.5 w-2.5 text-indigo-400" />
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

                                                <div className="flex justify-between items-end px-0.5 pb-0.5">
                                                    <div className="flex flex-col min-w-0">
                                                        {(() => {
                                                            const waiverTarget = account.annual_fee_waiver_target
                                                            const spent = summary?.yearExpensesTotal || 0
                                                            const needs = waiverTarget ? Math.max(0, waiverTarget - spent) : 0
                                                            const colorClass = needs <= 0 ? "text-emerald-600" : "text-emerald-700";

                                                            return needs > 0 ? (
                                                                <div className="flex flex-col">
                                                                    <span className={cn("text-sm font-black tracking-tight tabular-nums", colorClass)}>
                                                                        <span className="text-[8px] font-black uppercase opacity-60 mr-1.5">needs</span>
                                                                        {formatMoneyVND(Math.ceil(needs))}
                                                                    </span>
                                                                    <span className="text-[8px] text-slate-400 font-black italic">{formatVNShort(needs)}</span>
                                                                </div>
                                                            ) : waiverTarget ? (
                                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">✨ Waiver Met</span>
                                                            ) : null
                                                        })()}
                                                    </div>
                                                    <div className="flex items-baseline gap-1.5 shrink-0">
                                                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] opacity-80">LIMIT</span>
                                                        <span className="text-sm font-black text-slate-900 tabular-nums leading-none tracking-tight">{formatMoneyVND(Math.ceil(account.credit_limit || 0))}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </HeaderSection>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="w-[340px] p-0 overflow-hidden border-none shadow-2xl">
                                <div className="bg-white">
                                    <div className="bg-indigo-950 px-4 py-2.5 flex justify-between items-center">
                                        <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-indigo-300">Credit Health Report</h3>
                                        <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {/* Table Structure for Balance */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 text-[11px] pb-1 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                                                <span>Component</span>
                                                <span className="text-right">Amount</span>
                                            </div>
                                            <div className="grid grid-cols-2 text-xs py-1">
                                                <span className="text-slate-500 font-medium">Credit Limit</span>
                                                <span className="text-right font-bold text-slate-900">{formatMoneyVND(account.credit_limit || 0)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 text-xs py-1">
                                                <span className="text-slate-500 font-medium">Outstanding Bal.</span>
                                                <span className="text-right font-bold text-rose-500">-{formatMoneyVND(outstandingBalance)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 text-xs pt-2 border-t border-slate-200 font-black">
                                                <span className="text-indigo-900">NET AVAILABLE</span>
                                                <span className="text-right text-emerald-600">{formatMoneyVND(availableBalance)}</span>
                                            </div>
                                        </div>

                                        {/* Table Structure for Waiver */}
                                        {account.annual_fee_waiver_target && (
                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                                                <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                    <Calculator className="h-3 w-3" /> Waiver Progress
                                                </h4>
                                                <div className="grid grid-cols-2 text-[11px] py-0.5">
                                                    <span className="text-slate-500">Target Spending</span>
                                                    <span className="text-right font-bold">{formatMoneyVND(account.annual_fee_waiver_target)}</span>
                                                </div>
                                                <div className="grid grid-cols-2 text-[11px] py-0.5">
                                                    <span className="text-slate-500">YTD Spending</span>
                                                    <span className="text-right font-bold text-indigo-600">{formatMoneyVND(summary?.yearExpensesTotal || 0)}</span>
                                                </div>
                                                {summary?.yearExpensesTotal! < account.annual_fee_waiver_target ? (
                                                    <div className="grid grid-cols-2 text-[11px] pt-1.5 border-t border-amber-100 font-black text-amber-600">
                                                        <span>REMAINING NEED</span>
                                                        <span className="text-right">{formatMoneyVND(account.annual_fee_waiver_target - (summary?.yearExpensesTotal || 0))}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-black text-emerald-600 pt-1.5 border-t border-emerald-100 text-center uppercase tracking-widest">
                                                        ✨ Waiver Qualified
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
                    <HeaderSection label="Balance" className="flex-1 min-w-[200px]">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">Current Balance</span>
                            <div className={cn(
                                "text-xl font-black tracking-tight leading-none tabular-nums",
                                availableBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {formatMoneyVND(Math.ceil(availableBalance))}
                            </div>
                        </div>
                    </HeaderSection>
                )
            }

            {/* Section 3: Cashback Performance */}
            {
                isCreditCard && dynamicCashbackStats && (
                    <HeaderSection
                        label="Cashback Performance"
                        borderColor="border-emerald-100"
                        className="flex-[2] min-w-[480px] bg-emerald-50/10 min-h-[90px]"
                    >
                        <div className="flex flex-col h-full gap-2">
                            {/* Top row: 4 Main Metrics */}
                            <div className="grid grid-cols-4 gap-4 w-full">
                                {(() => {
                                    const yearlyRealValue = (summary?.cashbackTotal || 0) - (dynamicCashbackStats.sharedAmount || 0);

                                    return (
                                        <>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex flex-col cursor-help group">
                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                <BarChart3 className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                                <span className="text-[10px] font-bold text-slate-400 tracking-tight">Cycle Net</span>
                                                            </div>
                                                            <span className={cn(
                                                                "text-base font-black leading-none tabular-nums tracking-tighter",
                                                                (dynamicCashbackStats.netProfit || 0) > 0 ? "text-emerald-600" : (dynamicCashbackStats.netProfit || 0) < 0 ? "text-rose-600" : "text-slate-900"
                                                            )}>
                                                                {formatMoneyVND(Math.ceil(dynamicCashbackStats.netProfit || 0))}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="text-xs p-1">
                                                            <p className="font-bold">Cycle Net Profit</p>
                                                            <p className="text-slate-500">Earned (Projected) - Shared = Net</p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex flex-col cursor-help group">
                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                <TrendingUp className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                                <span className="text-[10px] font-bold text-slate-400 tracking-tight">Yearly Real</span>
                                                            </div>
                                                            <span className={cn(
                                                                "text-base font-black leading-none tabular-nums tracking-tighter",
                                                                yearlyRealValue > 0 ? "text-indigo-600" : yearlyRealValue < 0 ? "text-rose-600" : "text-slate-900"
                                                            )}>
                                                                {formatMoneyVND(Math.ceil(yearlyRealValue))}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="w-[250px]">
                                                        <div className="space-y-1 p-1">
                                                            <p className="font-bold text-xs border-b pb-1 text-indigo-700">Wealth Tracking</p>
                                                            <div className="flex justify-between text-[11px]">
                                                                <span className="text-slate-500 italic">Bank Actual (Bank Statement):</span>
                                                                <span className="font-bold text-emerald-600">+{formatMoneyVND(summary?.cashbackTotal || 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-[11px] text-rose-500">
                                                                <span className="text-slate-500 italic">Total Shared (Personal Debt):</span>
                                                                <span className="font-bold">-{formatMoneyVND(dynamicCashbackStats.sharedAmount || 0)}</span>
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <div className="flex flex-col group">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <PlusCircle className="h-3 w-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight">Earned</span>
                                                </div>
                                                <span className="text-base font-black text-emerald-600 leading-none tabular-nums tracking-tighter">
                                                    {formatMoneyVND(Math.ceil(dynamicCashbackStats.earnedSoFar || 0))}
                                                </span>
                                            </div>

                                            <div className="flex flex-col group items-end">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Users2 className="h-3 w-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight">Shared</span>
                                                </div>
                                                <span className="text-base font-black text-amber-600 leading-none tabular-nums tracking-tighter">
                                                    {formatMoneyVND(Math.ceil(dynamicCashbackStats.sharedAmount || 0))}
                                                </span>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>

                            {/* Bottom row: Min Spend Progress or Cap */}
                            <div className="w-full mt-auto">
                                {(() => {
                                    const stats = dynamicCashbackStats;
                                    const isQualified = stats?.is_min_spend_met;
                                    const minSpend = stats?.minSpend || 0;
                                    const spent = stats?.currentSpend || 0;
                                    const cap = stats?.maxCashback || 0;
                                    const earned = stats?.earnedSoFar || 0;

                                    if (!isQualified && minSpend > 0) {
                                        const progress = Math.min((spent / minSpend) * 100, 100);
                                        return (
                                            <div className="space-y-2">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="relative h-5 w-full rounded-lg shadow-inner cursor-help">
                                                                <div className="absolute inset-0 bg-slate-100/50 rounded-lg border border-slate-200 overflow-hidden">
                                                                    <div
                                                                        className={cn(
                                                                            "h-full transition-all duration-700 rounded-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]",
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
                                                                    {formatMoneyVND(Math.ceil(spent))}
                                                                </div>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="text-xs font-bold">
                                                                <p>Spent: {formatMoneyVND(Math.ceil(spent))}</p>
                                                                <p>Min Spend Target: {formatMoneyVND(Math.ceil(minSpend))}</p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <div className="flex justify-between items-end px-0.5">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-sm font-black text-rose-600 tracking-tight tabular-nums">
                                                                <span className="text-[7.5px] font-black uppercase opacity-70 mr-1.5">needs</span>
                                                                {formatMoneyVND(Math.ceil(minSpend - spent))}
                                                            </span>
                                                            <span className="text-[8px] text-slate-400 font-black italic">{formatVNShort(minSpend - spent)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-[0.2em]">TARGET</span>
                                                        <span className="text-base font-black text-slate-900 tabular-nums leading-none mt-0.5 tracking-tight">{formatMoneyVND(Math.ceil(minSpend))}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    } else if (cap > 0) {
                                        const progress = Math.min((earned / cap) * 100, 100);
                                        return (
                                            <div className="space-y-2">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="relative h-5 w-full rounded-lg shadow-inner cursor-help">
                                                                <div className="absolute inset-0 bg-slate-100/50 rounded-lg border border-slate-200 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-emerald-600 transition-all duration-700 rounded-sm"
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
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="text-xs font-bold">
                                                                <p>Earned: {formatMoneyVND(Math.ceil(earned))}</p>
                                                                <p>Cap Limit: {formatMoneyVND(Math.ceil(cap))}</p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <div className="flex justify-between items-center px-0.5">
                                                    <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-[0.2em]">Rewards Cap Space</span>
                                                    <span className="text-sm font-black text-slate-900 tabular-nums leading-none tracking-tight">{formatMoneyVND(Math.ceil(cap))}</span>
                                                </div>
                                            </div>
                                        )
                                    } else {
                                        return (
                                            <div className="flex items-center justify-between h-5 bg-emerald-50 border border-emerald-100/50 rounded-lg px-4">
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em]">Unlimited Rewards Performance</span>
                                                <Zap className="h-2.5 w-2.5 text-emerald-400 fill-emerald-400 animate-pulse" />
                                            </div>
                                        )
                                    }
                                })()}
                            </div>
                        </div>
                    </HeaderSection>
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
                {(summary as any) && (
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
                            "mt-1 flex items-center justify-between gap-1 px-1.5 py-1 rounded transition-colors w-full group border relative overflow-hidden",
                            (summary as any).pendingCount > 0
                                ? "bg-rose-50 border-rose-100 hover:bg-rose-100"
                                : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/80",
                            isLoadingPending && "opacity-70 cursor-wait"
                        )}
                    >
                        {isLoadingPending && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
                                <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 min-w-0">
                            {(summary as any).pendingCount > 0 ? (
                                <span className="flex h-1.5 w-1.5 relative shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
                                </span>
                            ) : (
                                <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                            )}
                            <span className={cn(
                                "text-[8px] font-black uppercase tracking-tighter truncate",
                                (summary as any).pendingCount > 0 ? "text-rose-600" : "text-emerald-600"
                            )}>
                                {(summary as any).pendingCount > 0 ? `${(summary as any).pendingCount} Items` : "No Pending"}
                            </span>
                        </div>
                        {(summary as any).pendingCount > 0 && (
                            <span className="text-[7px] font-bold text-rose-400 uppercase tracking-widest px-0.5 bg-white rounded border border-rose-100 group-hover:border-rose-200 shrink-0">Wait</span>
                        )}
                    </button>
                )}
            </div>
        </div >
    )
}
