"use client";

import { Account, Category } from "@/types/moneyflow.types";
import { normalizeCashbackConfig } from "@/lib/cashback";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { CalendarRange } from "lucide-react";
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
    const realAwarded = stats?.real_awarded || 0; // Actual bank cashback
    const virtualProfit = stats?.virtual_profit || 0; // Profit from sharing gap
    const earnedSoFar = realAwarded + virtualProfit; // Keep for display, but cap logic uses realAwarded only

    const maxBudget = config.maxBudget;
    const maxBudgetVal = maxBudget || 0;
    const isCapped = maxBudgetVal > 0;
    const isUnlimited = config.maxBudget === null || config.maxBudget === 0;

    let target = minSpend;
    let nextLevelName = "";
    let nextLevelSpendNeeded = 0;
    let hasNextLevel = false;

    // Multi-tier Target Calculation
    if (config.levels && config.levels.length > 0) {
        const sortedLevels = [...config.levels].sort((a, b) => a.minTotalSpend - b.minTotalSpend);
        const nextUnmetLevel = sortedLevels.find(lvl => lvl.minTotalSpend > currentSpent);

        if (nextUnmetLevel) {
            target = nextUnmetLevel.minTotalSpend;
            nextLevelName = nextUnmetLevel.name || "";
            nextLevelSpendNeeded = Math.max(0, nextUnmetLevel.minTotalSpend - currentSpent);
            hasNextLevel = true;
        }

        // If qualified for all, nextLevelName might be empty or max level
        nextLevelName = stats?.next_level_name || nextLevelName;
    }

    // Helper to render Rules Badge
    let ruleCount = 0;
    if (config?.levels) {
        config.levels.forEach(lvl => ruleCount += (lvl.rules?.length || 0));
    }

    const renderRulesBadge = () => {
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

    const formatReadableAmount = (amount: number): string => {
        if (amount === 0) return '0';
        const abs = Math.abs(amount);
        if (abs >= 1000000000) {
            const billions = Math.floor(abs / 1000000000);
            const millions = Math.floor((abs % 1000000000) / 1000000);
            return millions > 0 ? `${billions} tỷ ${millions} triệu` : `${billions} tỷ`;
        }
        if (abs >= 1000000) {
            const millions = Math.floor(abs / 1000000);
            const thousands = Math.floor((abs % 1000000) / 1000);
            return thousands > 0 ? `${millions} triệu ${thousands} nghìn` : `${millions} triệu`;
        }
        if (abs >= 1000) {
            const thousands = Math.floor(abs / 1000);
            const hundreds = Math.floor((abs % 1000) / 100);
            return hundreds > 0 ? `${thousands} nghìn ${hundreds} trăm` : `${thousands} nghìn`;
        }
        return `${abs}`;
    };

    let spentContent = <div className="text-slate-400 text-[11px] font-black italic text-right w-full">No Target</div>;

    if (minSpend > 0 || config.levels?.length) {

        const isMet = isQualified || currentSpent >= minSpend;
        const spendTarget = target || 0;
        const spendProgress = spendTarget > 0 ? Math.min(100, (currentSpent / spendTarget) * 100) : 0;

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

        const projectedAwarded = (isMet && currentRate > 0)
            ? Math.max(0, currentSpent * currentRate)
            : 0;
        const awardedForBudget = Math.max(realAwarded, projectedAwarded);

        const capProgress = isCapped ? Math.min(100, (awardedForBudget / maxBudgetVal) * 100) : 0;
        const showSpendProgress = !isMet || !isCapped; // Before qualification, always show spend progress even if capped
        const progress = showSpendProgress ? spendProgress : capProgress;
        const remainingMinSpend = Math.max(0, minSpend - currentSpent);
        // nextLevelName updated above

        const remainingReward = isCapped ? Math.max(0, maxBudgetVal - awardedForBudget) : null;
        const availableSpend = (isCapped && currentRate > 0 && remainingReward !== null) ? Math.floor(remainingReward / currentRate) : null;

        const statusLabel = !isMet
            ? `Needs ${new Intl.NumberFormat('vi-VN').format(remainingMinSpend)}`
            : (isCapped
                ? (remainingReward !== null && remainingReward <= 0
                    ? 'Cap Reached'
                    : `Available ${new Intl.NumberFormat('vi-VN').format(availableSpend || 0)}`)
                : 'Qualified');

        const progressDetail = !isMet
            ? `Need ${new Intl.NumberFormat('vi-VN').format(remainingMinSpend)} more to qualify${nextLevelName ? ` (${nextLevelName})` : ''}`
            : (hasNextLevel
                ? `Need ${new Intl.NumberFormat('vi-VN').format(Math.max(0, nextLevelSpendNeeded))} more to reach ${nextLevelName}`
                : 'Auto-claim when the cycle closes');

        const percentLabel = `${Math.round(progress)}%`;

        const defaultEarning = currentSpent * (config.defaultRate || 0);
        const estReward = Math.max(realAwarded || 0, projectedAwarded || 0, defaultEarning || 0);

        const claimLabel = !isMet
            ? `Est. reward ${formatCompactMoney(estReward)}`
            : (isCapped
                ? `Claim ${formatCompactMoney(Math.max(realAwarded, projectedAwarded))} / ${formatCompactMoney(maxBudgetVal)}`
                : `Reward ${formatCompactMoney(realAwarded || projectedAwarded || earnedSoFar)}`);

        spentContent = (
            <div className="flex flex-col gap-2 w-[240px]">
                {/* Status Text - Outside Bar */}
                {!isMet && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-rose-700 flex items-center gap-1.5">
                            <span className="text-base">⚠️</span>
                            {statusLabel}
                        </span>
                    </div>
                )}

                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className="relative w-full cursor-pointer group border border-slate-200 rounded-md p-1 hover:border-indigo-200 transition-colors">
                                <Progress
                                    value={progress}
                                    className="h-5 rounded-sm bg-slate-100 shadow-sm"
                                    indicatorClassName={cn(
                                        isMet ? (isCapped && availableSpend === 0 ? "bg-gradient-to-r from-amber-500 to-amber-600" : "bg-gradient-to-r from-emerald-500 to-emerald-600") : "bg-gradient-to-r from-orange-500 to-orange-600"
                                    )}
                                />
                                {/* Text inside bar */}
                                <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                                    <span className={cn(
                                        "text-[10px] font-black drop-shadow-sm",
                                        isMet ? "text-white" : "text-slate-900"
                                    )}>
                                        {isMet ? 'Qualified' : `${Math.round(progress)}%`}
                                    </span>
                                    <span className={cn(
                                        "text-[10px] font-black drop-shadow-sm",
                                        isMet ? "text-white" : "text-slate-900"
                                    )}>
                                        {percentLabel}
                                    </span>
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-3 bg-slate-50 border-2 border-slate-200 z-50 shadow-xl w-[440px]">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                                    <span className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                                        <span className="text-base">📊</span>
                                        Cycle Progress
                                    </span>
                                    <span className={cn(
                                        "text-[10px] px-2 py-1 rounded font-black",
                                        !isMet ? "bg-rose-100 text-rose-700 border border-rose-300" : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                    )}>{statusLabel}</span>
                                </div>

                                <div className="text-[11px] font-bold text-slate-700">
                                    {progressDetail}
                                </div>

                                {/* Rules Details Section */}
                                {ruleCount > 0 && config.levels && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-purple-200">
                                            <span className="text-[10px] font-black text-purple-700 uppercase flex items-center gap-1">
                                                <span>🎯</span> Cashback Strategy
                                            </span>
                                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">{ruleCount} RULES</span>
                                        </div>
                                        <div className="space-y-2">
                                            {config.levels.map((lvl, lIdx) => (
                                                <div key={lvl.id || lIdx} className="space-y-1">
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-800 bg-white/70 px-1.5 py-1 rounded">
                                                        <span>{lvl.name || `Level ${lIdx + 1}`}</span>
                                                        <span className="text-indigo-600">≥{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(lvl.minTotalSpend)}</span>
                                                    </div>
                                                    {lvl.rules && lvl.rules.length > 0 && (
                                                        <div className="space-y-0.5 pl-2">
                                                            {lvl.rules.map((r, rIdx) => {
                                                                const catNames = r.categoryIds?.map(id => categories?.find(c => c.id === id)?.name || id).join(', ');
                                                                return (
                                                                    <div key={r.id || rIdx} className="flex justify-between items-center text-[10px] bg-white/50 px-1.5 py-0.5 rounded">
                                                                        <span className="text-slate-600 font-medium truncate max-w-[180px]" title={catNames}>{catNames || "All Categories"}</span>
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            <span className="font-black text-emerald-600">{(r.rate * 100).toFixed(1)}%</span>
                                                                            {r.maxReward && <span className="text-[8px] text-slate-500 font-bold">cap {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(r.maxReward)}</span>}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {lvl.defaultRate !== null && lvl.defaultRate !== undefined && (
                                                        <div className="flex justify-between items-center text-[9px] italic bg-white/30 px-1.5 py-0.5 rounded mt-0.5">
                                                            <span className="text-slate-500">Other spend:</span>
                                                            <span className="font-bold text-slate-600">{(lvl.defaultRate * 100).toFixed(1)}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Two Column Layout with totals */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Left Column */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-start justify-between text-xs">
                                            <span className="text-slate-600 flex items-center gap-1.5 font-bold"><span className="text-base">💸</span>Spent</span>
                                            <div className="text-right">
                                                <div className="text-emerald-600 font-black">{new Intl.NumberFormat('vi-VN').format(currentSpent)}</div>
                                                <div className="text-[9px] text-slate-400 font-medium">{formatReadableAmount(currentSpent)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start justify-between text-xs">
                                            <span className="text-slate-600 flex items-center gap-1.5 font-bold"><span className="text-base">🎯</span>Target</span>
                                            <div className="text-right">
                                                <div className="text-indigo-600 font-black">{new Intl.NumberFormat('vi-VN').format(target)}</div>
                                                <div className="text-[9px] text-slate-400 font-medium">{formatReadableAmount(target)}</div>
                                            </div>
                                        </div>
                                        {isCapped && (
                                            <div className="flex items-start justify-between text-xs">
                                                <span className="text-slate-600 flex items-center gap-1.5 font-bold"><span className="text-base">🔒</span>Cap</span>
                                                <div className="text-right">
                                                    <div className="text-slate-700 font-black">{new Intl.NumberFormat('vi-VN').format(maxBudgetVal)}</div>
                                                    <div className="text-[9px] text-slate-400 font-medium">{formatReadableAmount(maxBudgetVal)}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Right Column */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-start justify-between text-xs">
                                            <span className="text-slate-600 flex items-center gap-1.5 font-bold"><span className="text-base">✅</span>Awarded</span>
                                            <div className="text-right">
                                                <div className="text-emerald-600 font-black">{new Intl.NumberFormat('vi-VN').format(realAwarded)}</div>
                                                <div className="text-[9px] text-slate-400 font-medium">{formatReadableAmount(realAwarded)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start justify-between text-xs">
                                            <span className="text-slate-600 flex items-center gap-1.5 font-bold"><span className="text-base">🌱</span>Default 0.3%*</span>
                                            <div className="text-right">
                                                <div className="text-sky-700 font-black">{new Intl.NumberFormat('vi-VN').format(defaultEarning)}</div>
                                                <div className="text-[9px] text-slate-400 font-medium">{formatReadableAmount(defaultEarning)}</div>
                                            </div>
                                        </div>
                                        {virtualProfit > 0 && (
                                            <div className="flex items-start justify-between text-xs">
                                                <span className="text-slate-600 flex items-center gap-1.5 font-bold"><span className="text-base">💰</span>Profit</span>
                                                <div className="text-right">
                                                    <div className="text-amber-600 font-black">{new Intl.NumberFormat('vi-VN').format(virtualProfit)}</div>
                                                    <div className="text-[9px] text-slate-400 font-medium">{formatReadableAmount(virtualProfit)}</div>
                                                </div>
                                            </div>
                                        )}
                                        {projectedAwarded > realAwarded && (
                                            <div className="flex items-start justify-between text-xs">
                                                <span className="text-slate-600 flex items-center gap-1.5 font-bold"><span className="text-base">🔮</span>Est. Award</span>
                                                <div className="text-right">
                                                    <div className="text-sky-600 font-black">{new Intl.NumberFormat('vi-VN').format(projectedAwarded)}</div>
                                                    <div className="text-[9px] text-slate-400 font-medium">{formatReadableAmount(projectedAwarded)}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-[9px] text-slate-400">*Default uses program base rate when no rule matches.</div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="flex items-center justify-between text-[10px] font-bold">
                    {cycleDisplay && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenTransactions?.();
                            }}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            title="View cycle transactions"
                        >
                            <CalendarRange className="w-2.5 h-2.5" />
                            {cycleDisplay}
                        </button>
                    )}
                    <span className="text-slate-800 text-[11px] tabular-nums">{claimLabel}</span>
                </div>
            </div>
        );

    } else if (config.defaultRate || rulesBadge) {

        const currentRate = config.defaultRate || 0;
        const remainingReward = !isUnlimited ? Math.max(0, maxBudgetVal - earnedSoFar) : Infinity;
        const availableSpend = (!isUnlimited && currentRate > 0) ? Math.floor(remainingReward / currentRate) : null;

        spentContent = (
            <div className="flex flex-col gap-2 w-[220px]">
                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className="w-full cursor-pointer border border-slate-200 rounded-md p-1 hover:border-indigo-200 transition-colors">
                                <Progress
                                    value={maxBudgetVal > 0 ? Math.min(100, (earnedSoFar / maxBudgetVal) * 100) : 0}
                                    className="h-4 bg-slate-100 rounded-sm shadow-sm"
                                    indicatorClassName={earnedSoFar >= maxBudgetVal ? "bg-amber-500" : "bg-emerald-500"}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-3 bg-slate-50 text-slate-900 z-50 shadow-xl border-2 border-slate-200 w-[360px]">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                    <span className="text-[10px] font-black text-slate-600 uppercase">Cashback Progress</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                                    <span className="text-slate-500">Earned</span>
                                    <span className="text-right text-emerald-600 font-bold">{new Intl.NumberFormat('vi-VN').format(earnedSoFar)}</span>
                                    {!isUnlimited && (
                                        <>
                                            <span className="text-slate-500">Cap</span>
                                            <span className="text-right text-slate-700 font-bold">{new Intl.NumberFormat('vi-VN').format(maxBudgetVal)}</span>
                                        </>
                                    )}
                                    <span className="text-slate-500">Default 0.3%*</span>
                                    <span className="text-right text-sky-700 font-bold">{new Intl.NumberFormat('vi-VN').format(currentSpent * (config.defaultRate || 0))}</span>
                                </div>
                                <div className="text-[9px] text-slate-400">*Default uses program base rate when no rule matches.</div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="flex items-center justify-between text-[10px] font-bold">
                    {cycleDisplay && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenTransactions?.();
                            }}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            title="View cycle transactions"
                        >
                            <CalendarRange className="w-2.5 h-2.5" />
                            {cycleDisplay}
                        </button>
                    )}
                    <span className="text-slate-800 text-[11px] tabular-nums">{formatCompactMoney(earnedSoFar)}{!isUnlimited && ` / ${formatCompactMoney(maxBudgetVal)}`}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end justify-center py-1">
            {spentContent}
        </div>
    );
}
