"use client";

import { useMemo } from "react";
import { Account, Category } from "@/types/moneyflow.types";
import { normalizeCashbackConfig } from "@/lib/cashback";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarRange, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountRewardsCellProps = {
    account: Account;
    categories?: Category[];
    onOpenTransactions?: () => void;
};

export function AccountRewardsCell({ account, categories, onOpenTransactions }: AccountRewardsCellProps) {
    if (account.type !== 'credit_card') return <span className="text-slate-300">—</span>;

    const config = normalizeCashbackConfig(account.cashback_config);
    const stats = account.stats;

    // Derived Stats
    const currentSpent = stats?.spent_this_cycle || 0;
    const minSpend = stats?.min_spend || config.minSpendTarget || 0;
    const isQualified = stats?.is_qualified || false;
    const realAwarded = stats?.real_awarded || 0;
    const virtualProfit = stats?.virtual_profit || 0;
    const earnedSoFar = realAwarded + virtualProfit;

    const maxBudget = config.maxBudget;
    const maxBudgetVal = maxBudget || 0;
    const isCapped = maxBudgetVal > 0;
    const isUnlimited = config.maxBudget === null || config.maxBudget === 0;

    let target = minSpend;
    let nextLevelName = "";

    // Multi-tier Target Calculation
    if (config.levels && config.levels.length > 0) {
        const sortedLevels = [...config.levels].sort((a, b) => a.minTotalSpend - b.minTotalSpend);
        const nextUnmetLevel = sortedLevels.find(lvl => lvl.minTotalSpend > currentSpent);

        if (nextUnmetLevel) {
            target = nextUnmetLevel.minTotalSpend;
            nextLevelName = nextUnmetLevel.name || "";
        }

        // If qualified for all, nextLevelName might be empty or max level
        nextLevelName = stats?.next_level_name || nextLevelName;
    }

    // Helper to render Rules Badge
    const renderRulesBadge = () => {
        let ruleCount = 0;
        if (config?.levels) {
            config.levels.forEach(lvl => ruleCount += (lvl.rules?.length || 0));
        }

        return ruleCount > 0 ? (
            <Popover>
                <PopoverTrigger>
                    <div className="h-4 px-1.5 rounded-full text-[9px] bg-purple-100 text-purple-700 border border-purple-200 font-black whitespace-nowrap hover:bg-purple-200 cursor-pointer flex items-center shadow-sm">
                        {ruleCount} RULES
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 shadow-xl border-slate-200" align="end" side="left">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 border-b pb-1 flex items-center justify-between">
                            <span>Cashback Strategy</span>
                            <span className="text-[9px] bg-slate-100 px-1 rounded lowercase font-bold tracking-normal">{config.cycleType?.replace('_', ' ')}</span>
                        </h4>
                        <div className="space-y-4">
                            {config.levels?.map((lvl, lIdx) => (
                                <div key={lvl.id || lIdx} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-900 bg-slate-50 p-1 rounded">
                                        <span>{lvl.name || `Level ${lIdx + 1}`}</span>
                                        <span className="text-indigo-600">≥{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(lvl.minTotalSpend)}</span>
                                    </div>
                                    <div className="space-y-1 pl-1">
                                        {lvl.rules?.map((r, rIdx) => {
                                            const catNames = r.categoryIds.map(id => categories?.find(c => c.id === id)?.name || id).join(', ');
                                            return (
                                                <div key={r.id || rIdx} className="flex justify-between items-start text-[10px] leading-tight">
                                                    <span className="text-slate-500 font-medium max-w-[140px] truncate" title={catNames}>{catNames || "All Categories"}</span>
                                                    <div className="flex flex-col items-end shrink-0 ml-2">
                                                        <span className="font-black text-emerald-600">{(r.rate * 100).toFixed(1)}%</span>
                                                        {r.maxReward && <span className="text-[8px] text-slate-400">Cap {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(r.maxReward)}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {lvl.defaultRate !== null && lvl.defaultRate !== undefined && (
                                            <div className="flex justify-between items-center text-[10px] opacity-70 italic border-t border-dashed border-slate-200 pt-1 mt-1">
                                                <span className="text-slate-500">Other spend:</span>
                                                <span className="font-bold">{(lvl.defaultRate * 100).toFixed(1)}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        ) : null;
    };

    const rulesBadge = renderRulesBadge();

    // Cycle Formatting (dd/MM - dd/MM)
    const formatCycle = (range: string) => {
        if (!range) return null;
        const parts = range.split(' - ');
        if (parts.length < 2) return range;
        const fmt = (dStr: string) => {
            const d = new Date(dStr);
            if (isNaN(d.getTime())) return dStr;
            return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        };
        return `${fmt(parts[0])} - ${fmt(parts[1])}`;
    };
    const cycleDisplay = formatCycle(stats?.cycle_range || "");

    const formatCompactMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            notation: "compact",
            maximumFractionDigits: 1
        }).format(amount).toLowerCase();
    };

    let spentContent = <div className="text-slate-400 text-[11px] font-black italic text-right w-full">No Target</div>;

    if (minSpend > 0 || config.levels?.length) {

        const progress = isCapped
            ? Math.min(100, (earnedSoFar / maxBudgetVal) * 100)
            : 0;

        const isMet = isQualified || currentSpent >= minSpend;
        const remainingMinSpend = Math.max(0, minSpend - currentSpent);
        // nextLevelName updated above

        // Calculate available spend capacity if capped
        // Use the highest rate from current level or default rate for approximation
        let currentRate = config.defaultRate || 0;
        if (config.levels && config.levels.length > 0) {
            const sorted = [...config.levels].sort((a, b) => b.minTotalSpend - a.minTotalSpend);
            const currentLvl = sorted.find(l => currentSpent >= l.minTotalSpend) || sorted[sorted.length - 1];
            currentRate = currentLvl.defaultRate || currentRate;
            // Check if any rule has a higher rate
            const maxRuleRate = Math.max(...(currentLvl.rules?.map(r => r.rate) || [0]));
            currentRate = Math.max(currentRate, maxRuleRate);
        }

        const remainingReward = isCapped ? Math.max(0, maxBudgetVal - earnedSoFar) : Infinity;
        const availableSpend = (isCapped && currentRate > 0) ? Math.floor(remainingReward / currentRate) : null;

        spentContent = (
            <div className="flex flex-col w-full gap-1.5 min-w-[150px]">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        {rulesBadge}
                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 cursor-help group/spend overflow-hidden">
                                        {!isMet ? (
                                            <>
                                                <span className="text-[8px] font-bold text-slate-500 lowercase opacity-80 decoration-orange-200 underline-offset-2 group-hover/spend:text-orange-700 transition-colors whitespace-nowrap">Spend more</span>
                                                <span className="text-[11px] font-black text-orange-700 whitespace-nowrap">{new Intl.NumberFormat('vi-VN').format(remainingMinSpend)}</span>
                                            </>
                                        ) : isCapped && availableSpend !== null ? (
                                            <>
                                                <span className="text-[8px] font-bold text-slate-500 lowercase opacity-80 decoration-indigo-200 underline-offset-2 group-hover/spend:text-indigo-700 transition-colors whitespace-nowrap">Available spend</span>
                                                <span className={cn(
                                                    "text-[11px] font-black whitespace-nowrap",
                                                    availableSpend === 0 ? "text-rose-600" : "text-indigo-600"
                                                )}>
                                                    {new Intl.NumberFormat('vi-VN').format(availableSpend)}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[8px] font-bold text-slate-500 lowercase opacity-80 whitespace-nowrap">status</span>
                                                <span className="text-[11px] font-black text-emerald-700 whitespace-nowrap">{earnedSoFar > 0 ? 'Qualified' : 'Rewarded'}</span>
                                            </>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-[11px] font-bold p-2 bg-slate-900 text-white z-50 shadow-xl border border-slate-800">
                                    <div className="flex flex-col gap-1">
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                                            <span className="text-slate-400">Spent:</span>
                                            <span className="text-right text-emerald-400">{new Intl.NumberFormat('vi-VN').format(currentSpent)}</span>

                                            {isCapped && (
                                                <>
                                                    <span className="text-slate-400">Claimed:</span>
                                                    <span className="text-right text-emerald-400">{new Intl.NumberFormat('vi-VN').format(earnedSoFar)}</span>
                                                    <span className="text-slate-400">Reward Cap:</span>
                                                    <span className="text-right text-slate-300">{new Intl.NumberFormat('vi-VN').format(maxBudgetVal)}</span>
                                                </>
                                            )}

                                            <span className="text-slate-400">{nextLevelName ? `Target (${nextLevelName}):` : 'Target Spend:'}</span>
                                            <span className="text-right text-indigo-400">{new Intl.NumberFormat('vi-VN').format(target)}</span>

                                            {remainingMinSpend > 0 && (
                                                <>
                                                    <span className="text-slate-400 border-t border-slate-700 pt-1">Remaining Min:</span>
                                                    <span className="text-right text-amber-400 border-t border-slate-700 pt-1 font-black">
                                                        {new Intl.NumberFormat('vi-VN').format(remainingMinSpend)}
                                                    </span>
                                                </>
                                            )}

                                            {isCapped && availableSpend !== null && (
                                                <>
                                                    <span className="text-slate-400 border-t border-slate-700 pt-1">Estimated Cap Space:</span>
                                                    <span className={cn(
                                                        "text-right border-t border-slate-700 pt-1 font-black",
                                                        availableSpend === 0 ? "text-rose-400" : "text-indigo-400"
                                                    )}>
                                                        ~ {new Intl.NumberFormat('vi-VN').format(availableSpend)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {isCapped && availableSpend === 0 && (
                                            <p className="text-[9px] text-rose-500 italic text-center mt-1">Reached max reward cap!</p>
                                        )}
                                        {!isMet && <p className="text-[9px] text-amber-500 italic text-center mt-1">Cần chi thêm để đạt {nextLevelName || 'cashback'}</p>}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <Progress
                    value={progress}
                    className="h-2 rounded-sm bg-slate-100"
                    indicatorClassName={cn(
                        isMet ? (isCapped && availableSpend === 0 ? "bg-amber-500" : "bg-emerald-500") : "bg-orange-600"
                    )}
                />

                <div className="flex justify-between items-center text-[9px] text-slate-600 font-bold tracking-tight tabular-nums mt-0.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                        {cycleDisplay && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenTransactions?.();
                                }}
                                className="flex items-center gap-1 px-1 py-0.5 bg-slate-50 rounded border border-slate-100/50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all group/cycle"
                                title="View transactions for this cycle"
                            >
                                <CalendarRange className="w-2.5 h-2.5 text-indigo-500 group-hover/cycle:scale-110 transition-transform" />
                                {cycleDisplay}
                            </button>
                        )}
                        {isCapped && (
                            <div className="flex items-center gap-1 opacity-80" title="Claim / Give away (Reward Progress)">
                                <span className="text-[7px] text-slate-400 uppercase">claim</span>
                                <span className={cn(
                                    "text-slate-500",
                                    earnedSoFar >= maxBudgetVal ? "text-rose-600 font-black" : ""
                                )}>
                                    {formatCompactMoney(earnedSoFar)} / {formatCompactMoney(maxBudgetVal)}
                                </span>
                            </div>
                        )}
                    </div>
                    <span className={cn("px-1", isMet ? (isCapped && availableSpend === 0 ? "text-amber-600" : "text-emerald-600") : "text-indigo-600")}>
                        {isCapped ? `${Math.round(progress)}%` : `${Math.round(Math.min(100, (currentSpent / (target || 1)) * 100))}%`}
                    </span>
                </div>
            </div>
        );

    } else if (config.defaultRate || rulesBadge) {

        const currentRate = config.defaultRate || 0;
        const remainingReward = !isUnlimited ? Math.max(0, maxBudgetVal - earnedSoFar) : Infinity;
        const availableSpend = (!isUnlimited && currentRate > 0) ? Math.floor(remainingReward / currentRate) : null;

        spentContent = (
            <div className="flex flex-col items-end gap-1.5 min-w-[140px]">
                <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        {rulesBadge}
                        {!isUnlimited && (
                            <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                <span className="uppercase text-[7px] font-bold">Limit</span>
                                <span className="font-bold text-slate-600">{formatCompactMoney(maxBudgetVal)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {isUnlimited ? (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Earned</span>
                        <span className="text-[12px] font-black text-emerald-600 tabular-nums">
                            {new Intl.NumberFormat('vi-VN').format(earnedSoFar)}
                        </span>
                    </div>
                ) : (
                    <div className="w-full space-y-1">
                        <div className="flex justify-between items-end text-[10px] font-bold">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-slate-400 uppercase">Available Spend</span>
                                <span className="text-indigo-600 tabular-nums">{availableSpend ? new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(availableSpend) : '∞'}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-slate-400 uppercase">Claimed</span>
                                <span className={cn(
                                    "tabular-nums",
                                    earnedSoFar >= maxBudgetVal ? "text-rose-600" : "text-emerald-600"
                                )}>
                                    {formatCompactMoney(earnedSoFar)} / {formatCompactMoney(maxBudgetVal)}
                                </span>
                            </div>
                        </div>
                        <Progress
                            value={maxBudgetVal > 0 ? Math.min(100, (earnedSoFar / maxBudgetVal) * 100) : 0}
                            className="h-1.5 bg-slate-100"
                            indicatorClassName={earnedSoFar >= maxBudgetVal ? "bg-amber-500" : "bg-emerald-500"}
                        />
                        {cycleDisplay && (
                            <div className="flex justify-end mt-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenTransactions?.();
                                    }}
                                    className="flex items-center gap-1 px-1 py-0.5 bg-slate-50 rounded border border-slate-100/50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all group/cycle text-[8px] font-bold text-slate-400"
                                    title="View transactions for this cycle"
                                >
                                    <CalendarRange className="w-2 h-2 text-indigo-500 group-hover/cycle:scale-110 transition-transform" />
                                    {cycleDisplay}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end justify-center py-1">
            {spentContent}
        </div>
    );
}
