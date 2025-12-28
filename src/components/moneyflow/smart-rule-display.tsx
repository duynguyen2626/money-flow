import { Info, CheckCircle, Target, Trophy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SmartRuleDisplay({ config, currentSpend }: { config: any, currentSpend: number }) {
    const levels = config.levels || [];
    const defaultRate = config.defaultRate || 0;

    // 1. Sort levels by minTotalSpend ascending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortedLevels = [...levels].sort((a: any, b: any) => (a.minTotalSpend || 0) - (b.minTotalSpend || 0));

    // 2. Find Current Level (Last level met)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentLevel = sortedLevels.findLast((lvl: any) => currentSpend >= (lvl.minTotalSpend || 0));

    // 3. Find Next Target Level (First level NOT met)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextLevel = sortedLevels.find((lvl: any) => currentSpend < (lvl.minTotalSpend || 0));

    // DISPLAY LOGIC:
    // - If nextLevel exists: Show progress to Next Level (e.g. "Reach 15M for Premium")
    // - If no nextLevel (Max level reached): Show Current Level Status (e.g. "Premium Unlocked")
    // - If unlimited base rate exists as backup: Explain in Tooltip

    if (nextLevel) {
        const target = nextLevel.minTotalSpend || 0;
        const missing = target - currentSpend;
        const progress = Math.min(100, (currentSpend / target) * 100);

        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col gap-1 cursor-help group/adv p-1 -mx-1 rounded hover:bg-slate-100 transition-colors">
                            {/* Label Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-blue-600">
                                    <Target className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        Reach {formatShortCurrency(target)} for {nextLevel.name || "Next Tier"}
                                    </span>
                                </div>
                                <Info className="w-3 h-3 text-slate-300 group-hover/adv:text-blue-500 transition-colors" />
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                            {/* Detail Text */}
                            <div className="flex justify-between text-[9px] font-medium text-slate-500">
                                <span>{formatShortCurrency(currentSpend)} spent</span>
                                <span className="font-bold text-blue-600">Need {formatShortCurrency(missing)}</span>
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-3 max-w-[240px]">
                        <PoliciesTooltip config={config} currentSpend={currentSpend} />
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Max Level Reached
    if (currentLevel) {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <div className="flex items-center justify-between cursor-help group/adv px-1 py-1 -mx-1 rounded hover:bg-emerald-50 transition-colors bg-emerald-50/50 border border-emerald-100">
                            <div className="flex items-center gap-2">
                                <div className="bg-emerald-100 p-1 rounded-full text-emerald-600">
                                    <Trophy className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider leading-none mb-0.5">
                                        {currentLevel.name || "Max Tier"} Unlocked
                                    </span>
                                    <span className="text-[9px] text-emerald-600 font-medium leading-none">
                                        Highest rewards active
                                    </span>
                                </div>
                            </div>
                            <Info className="w-3 h-3 text-emerald-300 group-hover/adv:text-emerald-500 transition-colors" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-3 max-w-[240px]">
                        <PoliciesTooltip config={config} currentSpend={currentSpend} />
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    // Fallback: Just Base Rate
    return (
        <TooltipProvider>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-between cursor-help group/adv px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /></div>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider leading-tight">
                                {defaultRate > 0
                                    ? `+${(defaultRate * 100).toFixed(1)}% Unlimited`
                                    : "Cashback Active"
                                }
                            </span>
                        </div>
                        <Info className="w-3 h-3 text-slate-300 group-hover/adv:text-emerald-500 transition-colors" />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 max-w-[240px]">
                    <PoliciesTooltip config={config} currentSpend={currentSpend} />
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// Helper to format large numbers (15,000,000 -> 15M)
function formatShortCurrency(val: number) {
    if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return val.toString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PoliciesTooltip({ config, currentSpend }: { config: any, currentSpend: number }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const levels = (config.levels || []).sort((a: any, b: any) => (a.minTotalSpend || 0) - (b.minTotalSpend || 0));

    return (
        <div className="space-y-2">
            <p className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">Cashback Policy</p>
            {config.defaultRate > 0 && (
                <div className="flex items-start gap-2 text-[10px] leading-tight">
                    <CheckCircle className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />
                    <span className="text-slate-600">
                        Base Rate: <span className="font-bold text-slate-800">{(config.defaultRate * 100).toFixed(2)}%</span> on all spend
                    </span>
                </div>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {levels.map((lvl: any, idx: number) => {
                const isMet = currentSpend >= (lvl.minTotalSpend || 0);
                return (
                    <div key={idx} className={`flex items-start gap-2 text-[10px] leading-tight ${isMet ? "opacity-100" : "opacity-60"}`}>
                        <div className={`mt-0.5 w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${isMet ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                            {isMet ? <CheckCircle className="w-2.5 h-2.5" /> : <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />}
                        </div>
                        <span className={isMet ? "text-slate-800 font-medium" : "text-slate-500"}>
                            {lvl.name}: Spend &ge; {formatShortCurrency(lvl.minTotalSpend || 0)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
