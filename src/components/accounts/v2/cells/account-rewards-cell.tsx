"use client";

import { Account, Category } from "@/types/moneyflow.types";
import { normalizeCashbackConfig } from "@/lib/cashback";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { CalendarRange, Zap, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountRewardsCellProps = {
    account: Account;
    categories?: Category[];
    onOpenTransactions?: () => void;
};

export function AccountRewardsCell({ account, categories, onOpenTransactions }: AccountRewardsCellProps) {
    if (account.type !== 'credit_card') return <span className="text-slate-300">—</span>;

    const config = normalizeCashbackConfig(account.cashback_config, account);
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
                                                <div key={r.id || rIdx} className="flex justify-between items-start text-[10px] leading-tight group/rule">
                                                    <span className="text-slate-500 font-medium max-w-[140px] truncate group-hover/rule:text-slate-900 transition-colors" title={catNames}>{catNames || "All Categories"}</span>
                                                    <div className="flex flex-col items-end shrink-0 ml-2">
                                                        <span className="font-black text-emerald-600">{(r.rate * 100).toFixed(1)}%</span>
                                                        {r.maxReward ? (
                                                            <span className="text-[8px] text-slate-400">Cap {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(r.maxReward)}</span>
                                                        ) : (
                                                            <span className="text-[8px] text-slate-400 opacity-60">Unlimited</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {lvl.defaultRate !== null && lvl.defaultRate !== undefined && (
                                            <div className="flex justify-between items-center text-[10px] bg-sky-50/50 p-1.5 rounded-md border border-sky-100/50 mt-1">
                                                <span className="text-sky-700 font-bold flex items-center gap-1.5">
                                                    <span className="text-xs">🌍</span> General Spend
                                                </span>
                                                <span className="font-black text-sky-800">{(lvl.defaultRate * 100).toFixed(1)}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {/* Program Base Rate if tiered doesn't cover all levels */}
                            {config.defaultRate > 0 && !config.levels?.some(l => l.minTotalSpend === 0) && (
                                <div className="pt-2 border-t border-slate-100">
                                    <div className="flex justify-between items-center text-[10px] bg-slate-50 p-1.5 rounded-md">
                                        <span className="text-slate-500 font-bold">Standard Rate</span>
                                        <span className="font-black text-slate-700">{(config.defaultRate * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            )}
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

        const cycleRange = stats?.cycle_range;
        let cycleProgress = 0;
        let isSlowSpend = false;
        let isCritical = false;
        let daysLeft = 99;

        if (cycleRange) {
            const rangeParts = cycleRange.split(' - ');
            const start = new Date(rangeParts[0]);
            const end = new Date(rangeParts[1]);
            const now = new Date();
            const total = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            if (total > 0) {
                cycleProgress = Math.min(100, Math.max(0, (elapsed / total) * 100));
            }
            daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (minSpend > 0 && !isMet) {
            const spendProgress = (currentSpent / minSpend) * 100;
            if (spendProgress < cycleProgress - 5) isSlowSpend = true;
            if (daysLeft <= 7) isCritical = true;
        }

        const statusLabel = !isMet
            ? `Need ${new Intl.NumberFormat('vi-VN').format(remainingMinSpend)}`
            : (isCapped
                ? (remainingReward !== null && remainingReward <= 0
                    ? 'Cap Reached'
                    : `Available ${new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(availableSpend || 0)}`)
                : 'Qualified');

        const progressDetail = !isMet
            ? `Need ${new Intl.NumberFormat('vi-VN').format(remainingMinSpend)} more to qualify${nextLevelName ? ` (${nextLevelName})` : ''}`
            : (hasNextLevel
                ? `Need ${new Intl.NumberFormat('vi-VN').format(Math.max(0, nextLevelSpendNeeded))} more to reach ${nextLevelName}`
                : 'Auto-claim when the cycle closes');

        const defaultEarning = currentSpent * (config.defaultRate || 0);
        const estReward = Math.max(realAwarded || 0, projectedAwarded || 0, defaultEarning || 0);

        const claimLabel = !isMet
            ? `Est. reward ${formatCompactMoney(estReward)}`
            : (isCapped
                ? `Claim ${formatCompactMoney(Math.max(realAwarded, projectedAwarded))} / ${formatCompactMoney(maxBudgetVal)}`
                : `Reward ${formatCompactMoney(realAwarded || projectedAwarded || earnedSoFar)}`);

        spentContent = (
            <div className="flex flex-col gap-1 w-[200px]">
                {/* Line 1: Status Text Only (Aligned with Limit column) */}
                <div className="flex items-center justify-between px-0.5 min-h-[17px]">
                    {!isMet ? (
                        <div className="flex items-center gap-1.5">
                            <span className={cn(
                                "text-[12px] font-black flex items-center gap-1.5 leading-none transition-all duration-300",
                                isCritical ? "text-rose-600 animate-pulse scale-105 origin-left" : isSlowSpend ? "text-amber-600" : "text-slate-900"
                            )}>
                                {isCritical ? <Zap className="w-3.5 h-3.5 fill-rose-600" /> : isSlowSpend ? <AlertCircle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                                {statusLabel}
                            </span>
                            {isCritical && (
                                <span className="text-[8px] font-black uppercase tracking-tighter text-rose-500 bg-rose-50 px-1 rounded border border-rose-100">
                                    {daysLeft <= 0 ? "Ending" : `${daysLeft}d left`}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-[11px] font-black text-emerald-600 leading-none">
                            Qualified
                        </span>
                    )}
                </div>

                {/* Line 2: Progress Bar with Embedded Percentage (Matching Limit column) */}
                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className="relative h-6 w-full cursor-pointer group border border-slate-200 rounded-md bg-slate-50 hover:border-indigo-300 transition-all overflow-hidden">
                                {/* Progress Fill */}
                                <div
                                    className={cn(
                                        "absolute inset-0 h-full transition-all duration-500 ease-out opacity-20 group-hover:opacity-30",
                                        isMet ? (isCapped && availableSpend === 0 ? "bg-amber-500" : "bg-emerald-500") : "bg-rose-500"
                                    )}
                                    style={{ width: `${Math.max(progress, 0)}%` }}
                                />
                                {/* Progress Line at bottom */}
                                <div
                                    className={cn(
                                        "absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-out",
                                        isMet ? (isCapped && availableSpend === 0 ? "bg-amber-500" : "bg-emerald-500") : "bg-rose-500"
                                    )}
                                    style={{ width: `${Math.max(progress, 0)}%` }}
                                />

                                {/* Content Inside Bar: Cycle + Percentage */}
                                <div className="absolute inset-0 flex items-center justify-between px-2">
                                    {/* Left: Cycle Date (Clickable, with background) */}
                                    {cycleDisplay ? (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenTransactions?.();
                                            }}
                                            className="pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded cursor-pointer group/cycle transition-colors"
                                        >
                                            <CalendarRange className="w-3 h-3 text-indigo-500 group-hover/cycle:text-indigo-600 transition-colors" />
                                            <span className="text-[9px] font-bold text-indigo-600 group-hover/cycle:text-indigo-700 transition-colors whitespace-nowrap leading-none">
                                                {cycleDisplay}
                                            </span>
                                        </div>
                                    ) : <div />}

                                    {/* Right: Percentage */}
                                    <span className={cn(
                                        "text-[10px] font-bold tabular-nums pointer-events-none",
                                        isMet ? "text-emerald-700" : "text-rose-600"
                                    )}>
                                        {Math.round(progress)}%
                                    </span>
                                </div>
                            </div>
                        </TooltipTrigger>

                        {/* Tooltip Content */}
                        <TooltipContent side="top" className="p-3 bg-slate-50 border-2 border-slate-200 z-50 shadow-xl w-[440px]">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                                    <span className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                                        <span className="text-base">📊</span>
                                        Cycle Progress
                                    </span>
                                    <span className={cn(
                                        "text-[10px] px-2 py-1 rounded font-black",
                                        !isMet ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-100 text-emerald-700 border border-emerald-300"
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
                                                        <div className="flex justify-between items-center text-[9px] bg-sky-50 px-1.5 py-1 rounded mt-1">
                                                            <span className="text-sky-700 font-bold">🌍 General Spend:</span>
                                                            <span className="font-black text-sky-800">{(lvl.defaultRate * 100).toFixed(1)}%</span>
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
                                            <span className="text-sky-700 flex items-center gap-1.5 font-bold"><span className="text-base">🌍</span>General {currentRate > 0 ? `(${(currentRate * 100).toFixed(1)}%)` : ''}</span>
                                            <div className="text-right">
                                                <div className="text-sky-700 font-black">{new Intl.NumberFormat('vi-VN').format(currentSpent * currentRate)}</div>
                                                <div className="text-[9px] text-slate-400 font-medium">{formatReadableAmount(currentSpent * currentRate)}</div>
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
                                    </div>
                                </div>
                                <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-1 flex justify-between">
                                    <span>*Default uses program base rate when no rule matches.</span>
                                    <span className="font-bold text-slate-600">{claimLabel}</span>
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );

    } else if (config.defaultRate || rulesBadge) {

        const currentRate = config.defaultRate || 0;
        const remainingReward = !isUnlimited ? Math.max(0, maxBudgetVal - earnedSoFar) : Infinity;
        const availableSpend = (!isUnlimited && currentRate > 0) ? Math.floor(remainingReward / currentRate) : null;

        spentContent = (
            <div className="flex flex-col gap-1 w-[200px]">
                {/* Status Text - Above Bar */}
                <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-black text-slate-600 leading-none">
                        Cashback
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 leading-none">
                        {formatCompactMoney(earnedSoFar)}
                        {!isUnlimited && <span className="text-slate-400 font-normal"> / {formatCompactMoney(maxBudgetVal)}</span>}
                    </span>
                </div>

                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className="relative h-6 w-full cursor-pointer group border border-slate-200 rounded-md bg-slate-50 hover:border-indigo-300 transition-all overflow-hidden">
                                {/* Progress Bar Background */}
                                <div
                                    className={cn(
                                        "absolute inset-0 h-full transition-all duration-500 ease-out opacity-20 group-hover:opacity-30",
                                        earnedSoFar >= maxBudgetVal ? "bg-amber-500" : "bg-emerald-500"
                                    )}
                                    style={{ width: `${maxBudgetVal > 0 ? Math.min(100, (earnedSoFar / maxBudgetVal) * 100) : 0}%` }}
                                />
                                {/* Solid Key Line */}
                                <div
                                    className={cn(
                                        "absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-out",
                                        earnedSoFar >= maxBudgetVal ? "bg-amber-500" : "bg-emerald-500"
                                    )}
                                    style={{ width: `${maxBudgetVal > 0 ? Math.min(100, (earnedSoFar / maxBudgetVal) * 100) : 0}%` }}
                                />

                                <div className="absolute inset-0 flex items-center justify-between px-2">
                                    {/* Left: Cycle Date (Clickable, with background) */}
                                    {cycleDisplay ? (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenTransactions?.();
                                            }}
                                            className="pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded cursor-pointer group/cycle transition-colors"
                                        >
                                            <CalendarRange className="w-3 h-3 text-indigo-500 group-hover/cycle:text-indigo-600 transition-colors" />
                                            <span className="text-[9px] font-bold text-indigo-600 group-hover/cycle:text-indigo-700 transition-colors whitespace-nowrap leading-none">
                                                {cycleDisplay}
                                            </span>
                                        </div>
                                    ) : <div />}

                                    {/* Center/Right: Percentage if capped, or just nothing */}
                                    {maxBudgetVal > 0 && (
                                        <span className="text-[9px] font-black pointer-events-none leading-none text-slate-600 pr-1">
                                            {Math.round((earnedSoFar / maxBudgetVal) * 100)}%
                                        </span>
                                    )}
                                </div>
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
                                    <span className="text-slate-500">Default {(currentRate * 100).toFixed(1)}%*</span>
                                    <span className="text-right text-sky-700 font-bold">{new Intl.NumberFormat('vi-VN').format(currentSpent * currentRate)}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 italic">Rules (Education/Healthcare) are applied separately.</div>
                                <div className="text-[9px] text-slate-400">*Default uses program base rate when no rule matches.</div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end justify-center py-1">
            {spentContent}
        </div>
    );
}
