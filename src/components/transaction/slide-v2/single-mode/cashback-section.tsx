import { useState, useMemo, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
    Percent,
    AlertTriangle,
    DollarSign,
    Gift,
    Heart,
    ChevronDown,
    CheckCircle2,
    Info,
    Sparkles,
    Calendar,
    BarChart3,
    X
} from "lucide-react";
import { SingleTransactionFormValues } from "../types";
import { AccountSpendingStats } from "@/types/cashback.types";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Account, Category } from "@/types/moneyflow.types";
import { resolveCashbackPolicy } from "@/services/cashback/policy-resolver";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

type CashbackSectionProps = {
    accounts?: Account[];
    categories?: Category[];
};

export function CashbackSection({ accounts, categories = [] }: CashbackSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const isExpanded = useWatch({ control: form.control, name: "ui_is_cashback_expanded" });
    const cashbackMode = useWatch({ control: form.control, name: "cashback_mode" });

    const transactionType = useWatch({ control: form.control, name: "type" });
    const sourceAccountId = useWatch({ control: form.control, name: "source_account_id" });
    const amount = useWatch({ control: form.control, name: "amount" }) || 0;
    const sharePercent = useWatch({ control: form.control, name: "cashback_share_percent" });
    const shareFixed = useWatch({ control: form.control, name: "cashback_share_fixed" });
    const categoryId = useWatch({ control: form.control, name: "category_id" });
    const occurredAt = useWatch({ control: form.control, name: "occurred_at" });

    const [cycleStats, setCycleStats] = useState<AccountSpendingStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // CONSTANTS & HELPERS
    const formatVN = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val));

    const isVisible = !(transactionType === 'income' || transactionType === 'repayment' || transactionType === 'transfer');

    const activeAccount = useMemo(() => {
        if (!sourceAccountId || !accounts) return null;
        return accounts.find(a => a.id === sourceAccountId) || null;
    }, [sourceAccountId, accounts]);

    const serviceFee = useWatch({ control: form.control, name: "service_fee" }) || 0;
    const totalGrossAmount = Math.abs(amount) + serviceFee;

    // FETCH CYCLE STATS WHEN DATE OR ACCOUNT CHANGES
    useEffect(() => {
        if (!sourceAccountId || !occurredAt) {
            setCycleStats(null);
            return;
        }

        const fetchStats = async () => {
            setIsLoadingStats(true);
            try {
                const dateParam = occurredAt instanceof Date ? occurredAt.toISOString() : new Date(occurredAt).toISOString();
                const res = await fetch(`/api/cashback/stats?accountId=${sourceAccountId}&date=${dateParam}`);
                if (res.ok) {
                    const data = await res.json();
                    setCycleStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch cycle stats for slide", err);
            } finally {
                setIsLoadingStats(false);
            }
        };

        fetchStats();
    }, [sourceAccountId, occurredAt, transactionType]);

    const category = useMemo(() => {
        return categories.find(c => c.id === categoryId);
    }, [categories, categoryId]);

    const policy = useMemo(() => {
        if (!activeAccount) return null;
        const cycleSpent = cycleStats?.currentSpend || activeAccount.stats?.spent_this_cycle || 0;
        const projectedSpent = cycleSpent + totalGrossAmount;

        return resolveCashbackPolicy({
            account: activeAccount as Account,
            categoryId,
            amount: totalGrossAmount,
            cycleTotals: {
                spent: projectedSpent
            },
            categoryName: category?.name
        });
    }, [activeAccount, categoryId, totalGrossAmount, category, cycleStats]);

    const { actualBankReward, remainsCap } = useMemo(() => {
        const rate = policy?.rate ?? 0;
        const raw = totalGrossAmount * rate;

        const cappedByRule = policy?.maxReward !== undefined && policy.maxReward !== null ? Math.min(raw, policy.maxReward) : raw;
        const rawRemains = cycleStats?.remainingBudget ?? activeAccount?.stats?.remains_cap;
        const remains = (rawRemains === null || rawRemains === undefined) ? Infinity : rawRemains;

        return {
            remainsCap: rawRemains,
            actualBankReward: Math.min(cappedByRule, remains)
        };
    }, [totalGrossAmount, policy, activeAccount, cycleStats]);

    const isSharing = ['real_percent', 'real_fixed', 'voluntary'].includes(cashbackMode);

    const totalSharedVal = useMemo(() => {
        if (!isSharing) return 0;
        const rate = (sharePercent || 0) / 100;
        return (totalGrossAmount * rate) + (shareFixed || 0);
    }, [totalGrossAmount, sharePercent, shareFixed, isSharing]);

    const netProfitValue = useMemo(() => {
        return actualBankReward - totalSharedVal;
    }, [actualBankReward, totalSharedVal]);

    // AMBIGUITY FIX: Show Net Profit % in the header instead of sharing %
    const netProfitPercent = useMemo(() => {
        if (totalGrossAmount > 0) return ((netProfitValue / totalGrossAmount) * 100).toFixed(2);
        return (policy?.rate ? policy.rate * 100 : 0).toFixed(2);
    }, [totalGrossAmount, netProfitValue, policy]);

    const suggestedShareRate = useMemo(() => {
        return policy?.rate ? Number((policy.rate * 100).toFixed(2)) : undefined;
    }, [policy]);

    const toggleSharing = (checked: boolean) => {
        if (!checked) {
            form.setValue('cashback_mode', 'percent');
        } else {
            form.setValue('cashback_mode', 'real_percent');
            if (sharePercent === null && shareFixed === null && suggestedShareRate) {
                form.setValue('cashback_share_percent', suggestedShareRate);
            }
        }
    };

    useEffect(() => {
        if (isExpanded && policy && sharePercent === null && shareFixed === null && transactionType === 'debt') {
            form.setValue('cashback_mode', 'real_percent');
            if (suggestedShareRate) {
                form.setValue('cashback_share_percent', suggestedShareRate);
            }
        }
    }, [isExpanded, policy, transactionType, suggestedShareRate, form, sharePercent, shareFixed]);

    if (!isVisible) return null;

    return (
        <div className={cn(
            "rounded-xl transition-all duration-300 overflow-hidden",
            isExpanded ? "bg-white border border-slate-200 shadow-xl shadow-slate-100/50" : "bg-transparent"
        )}>
            <div className={cn(
                "flex items-center justify-between p-3 cursor-pointer select-none",
                isExpanded ? "bg-slate-50/80 border-b border-slate-100" : ""
            )} onClick={() => form.setValue("ui_is_cashback_expanded", !isExpanded)}>
                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isExpanded ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                        <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">Cashback Reward</span>
                            {actualBankReward > 0 && !isExpanded && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold border border-emerald-100">
                                    ~{formatVN(actualBankReward)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-2.5 w-2.5 text-slate-400" />
                            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                {cycleStats?.cycle?.label || activeAccount?.credit_card_info?.statement_day ? `Cycle: ${cycleStats?.cycle?.label || `resets on ${activeAccount?.credit_card_info?.statement_day}`}` : 'Checking cycle...'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {!isExpanded && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Net Yield</span>
                            <span className={cn(
                                "text-xs font-black",
                                Number(netProfitPercent) >= 0 ? "text-emerald-600" : "text-rose-500"
                            )}>
                                {Number(netProfitPercent) >= 0 ? "+" : ""}{netProfitPercent}%
                            </span>
                        </div>
                    )}
                    <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 bg-white border border-slate-100 shadow-sm",
                        isExpanded ? "rotate-180" : ""
                    )}>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex items-start gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Strategy Match</span>
                                {policy?.metadata?.reason && (
                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                        {policy.metadata.reason}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                {activeAccount?.name} applies <span className="text-slate-900 font-bold">{(policy?.rate ? policy.rate * 100 : 0).toFixed(2)}%</span> reward rate
                                {policy?.maxReward ? ` (Capped at ${formatVN(policy.maxReward)})` : " (Unlimited per transaction)"}.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-1 py-1 bg-slate-50/50 rounded-xl border border-slate-100/50 pr-4">
                        <div className="flex items-center gap-2.5 pl-3">
                            <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                isSharing ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
                            )}>
                                <Heart className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Sharing Mode</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Share with others?</span>
                            </div>
                        </div>
                        <Switch
                            checked={isSharing}
                            onCheckedChange={toggleSharing}
                            className="data-[state=checked]:bg-amber-500"
                        />
                    </div>

                    <div className={cn(
                        "grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-300 transition-all",
                        !isSharing && "opacity-40 pointer-events-none grayscale-[0.5]"
                    )}>
                        <FormField
                            control={form.control}
                            name="cashback_share_percent"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rate (%)</FormLabel>
                                        </div>
                                        <Percent className="w-2.5 h-2.5 text-slate-300" />
                                    </div>
                                    <FormControl>
                                        <div className="flex flex-col gap-1">
                                            <div className="relative group">
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    placeholder={suggestedShareRate ? `Suggest: ${suggestedShareRate}%` : "0.0"}
                                                    className={cn(
                                                        "h-10 font-black bg-white border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all pr-8 text-xs",
                                                        (field.value || 0) > 100 && "border-rose-300 bg-rose-50/30 text-rose-600"
                                                    )}
                                                    onChange={e => {
                                                        const rawVal = e.target.value;
                                                        if (rawVal === "") {
                                                            field.onChange(null);
                                                            return;
                                                        }
                                                        const val = parseFloat(rawVal);
                                                        // Allow 0, prevent negative
                                                        field.onChange(!isNaN(val) ? Math.max(0, val) : null);
                                                    }}
                                                    value={field.value ?? ""}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                    {field.value !== null && field.value !== undefined && (
                                                        <button
                                                            type="button"
                                                            onClick={() => field.onChange(null)}
                                                            className="p-0.5 hover:bg-slate-100 rounded transition-colors"
                                                        >
                                                            <X className="w-3 h-3 text-slate-300" />
                                                        </button>
                                                    )}
                                                    <div className="text-slate-400 font-bold text-[10px]">%</div>
                                                </div>
                                            </div>
                                            {(field.value || 0) > 100 && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-rose-500 px-1">
                                                    <AlertTriangle className="w-2.5 h-2.5 animate-pulse" />
                                                    Efficiency &gt; 100% means sharing more than total amount!
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cashback_share_fixed"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 focus-within:z-10">
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fixed (đ)</FormLabel>
                                        <DollarSign className="w-2.5 h-2.5 text-slate-300" />
                                    </div>
                                    <FormControl>
                                        <SmartAmountInput
                                            value={field.value || 0}
                                            onChange={(val) => field.onChange(val !== undefined ? Math.max(0, val) : null)}
                                            hideLabel={true}
                                            placeholder="Amount"
                                            className="h-10 font-black bg-white border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-xs"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className={cn(
                        "rounded-xl p-4 transition-all border-2",
                        netProfitValue < 0 ? "bg-rose-50 border-rose-200" :
                            totalSharedVal > 0 ? "bg-amber-50/50 border-amber-200/50" :
                                "bg-emerald-50/50 border-emerald-200/50 shadow-[0_4px_12px_rgba(16,185,129,0.05)]"
                    )}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Profit Analytics</span>
                            {netProfitValue < 0 ? (
                                <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 shadow-sm">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Voluntary Sharing</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Optimized</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3.5">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex flex-col items-end">
                                            <div className="flex justify-between items-center text-xs group cursor-help gap-3 w-full">
                                                <div className="flex items-center gap-2 text-slate-500 group-hover:text-indigo-600 transition-colors">
                                                    <div className="w-5 h-5 rounded-md bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                                        <Gift className="h-3 w-3 text-indigo-500" />
                                                    </div>
                                                    <span className="font-medium tracking-tight">Bank Reward (Est)</span>
                                                </div>
                                                <span className="font-black text-slate-900 tabular-nums tracking-tight">{formatVN(actualBankReward)}</span>
                                            </div>
                                            {(actualBankReward === 0 && activeAccount?.type === 'credit_card') && (
                                                <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-0.5 animate-pulse">
                                                    No policy matched
                                                </span>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[240px] bg-slate-900 text-white p-3 border-none shadow-xl space-y-2">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Calculation Formula:</span>
                                            <div className="bg-white/10 p-2 rounded text-[11px] font-mono">
                                                {formatVN(totalGrossAmount)} × {(policy?.rate ? policy.rate * 100 : 0).toFixed(2)}%
                                                {policy?.maxReward ? ` (Cap: ${formatVN(policy.maxReward)})` : ""}
                                                <div className="mt-1 pt-1 border-t border-white/10 text-emerald-400 font-bold">= {formatVN(actualBankReward)}</div>
                                            </div>
                                            <span className="text-[9px] opacity-60 italic pt-1 border-t border-white/5">
                                                * Using {policy?.metadata?.reason || 'default'} strategy for this category.
                                            </span>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex justify-between items-center text-xs group cursor-help">
                                            <div className="flex items-center gap-2 text-slate-500 group-hover:text-amber-600 transition-colors">
                                                <div className="w-5 h-5 rounded-md bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                                    <Heart className="h-3 w-3 text-amber-500" />
                                                </div>
                                                <span className="font-medium tracking-tight">Shared with People</span>
                                            </div>
                                            <span className="font-black text-amber-600 tabular-nums tracking-tight">-{formatVN(totalSharedVal)}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[240px] bg-slate-900 text-white p-3 border-none shadow-xl space-y-2">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Calculation Formula:</span>
                                            <div className="bg-white/10 p-2 rounded text-[11px] font-mono">
                                                {sharePercent ? `(${formatVN(totalGrossAmount)} × ${sharePercent}%)` : ""}
                                                {sharePercent && shareFixed ? " + " : ""}
                                                {shareFixed ? formatVN(shareFixed) : ""}
                                                <div className="mt-1 pt-1 border-t border-white/10 text-amber-400 font-bold">= {formatVN(totalSharedVal)}</div>
                                            </div>
                                            <span className="text-[9px] opacity-60 pt-1">Amount deducted from reward to person.</span>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>

                                <div className="pt-2.5 border-t border-slate-200/60 flex justify-between items-start group relative">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-help pt-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-500 transition-colors">Net Profit</span>
                                                <Info className="h-2.5 w-2.5 text-slate-300" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-[240px] bg-slate-900 text-white p-3 border-none shadow-xl space-y-2">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Net Formula:</span>
                                                <div className="bg-white/10 p-2 rounded text-[11px] font-mono">
                                                    {formatVN(actualBankReward)} (Bank) - {formatVN(totalSharedVal)} (Shared)
                                                    <div className={cn(
                                                        "mt-1 pt-1 border-t border-white/10 font-bold",
                                                        netProfitValue >= 0 ? "text-emerald-400" : "text-rose-400"
                                                    )}>= {formatVN(netProfitValue)}</div>
                                                </div>
                                                {netProfitValue < 0 && (
                                                    <p className="text-[9px] text-rose-300 italic">You are voluntarily giving more to people than bank rewarded.</p>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2">
                                            {netProfitValue < 0 && (
                                                <span className="text-[7px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-1 py-0.5 rounded-sm uppercase tracking-tighter">Voluntary Loss</span>
                                            )}
                                            <span className={cn(
                                                "text-lg font-black tabular-nums tracking-tighter transition-all leading-none",
                                                netProfitValue >= 0 ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {netProfitValue >= 0 ? "+" : ""}{formatVN(netProfitValue)}
                                            </span>
                                        </div>
                                        {totalGrossAmount > 0 && (
                                            <span className="text-[8px] text-slate-400 font-bold italic mt-1 tracking-tight">
                                                ~{netProfitPercent}% net efficiency
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* BUDGET SECTION */}
                                <div className="pt-4 mt-2 border-t border-dashed border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <BarChart3 className="h-2.5 w-2.5" />
                                            Cycle Budget
                                        </div>
                                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">
                                            {cycleStats?.cycle?.label || 'Current'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter block mb-0.5">Total Shared</span>
                                            <span className="text-xs font-black text-amber-600 tabular-nums leading-none">
                                                {formatVN(cycleStats?.sharedAmount || 0)}
                                            </span>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
                                            {(() => {
                                                const ruleId = policy?.metadata?.ruleId;
                                                const activeRule = ruleId ? cycleStats?.activeRules?.find(r => r.ruleId === ruleId) : null;
                                                const ruleRemaining = activeRule ? (activeRule.max! - activeRule.earned) : (policy?.maxReward ?? (cycleStats?.remainingBudget ?? remainsCap ?? null));

                                                return (
                                                    <>
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter block mb-0.5 flex items-center gap-1">
                                                            Remains Cashback
                                                            {isLoadingStats && <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse" />}
                                                        </span>
                                                        <span className={cn(
                                                            "text-xs font-black tabular-nums leading-none",
                                                            (ruleRemaining === null || ruleRemaining > 0) ? "text-indigo-600" : "text-rose-600"
                                                        )}>
                                                            {ruleRemaining !== null ? formatVN(ruleRemaining) : 'Unlimited'}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Remains Spendable Section */}
                                    {(() => {
                                        const ruleId = policy?.metadata?.ruleId;
                                        const activeRule = ruleId ? cycleStats?.activeRules?.find(r => r.ruleId === ruleId) : null;
                                        const rewardRemaining = activeRule ? (activeRule.max! - activeRule.earned) : (policy?.maxReward ?? (cycleStats?.remainingBudget ?? remainsCap ?? null));

                                        if (rewardRemaining === null || rewardRemaining === Infinity || !policy?.rate || policy.rate <= 0) return null;

                                        const spendableRemaining = Math.max(0, rewardRemaining / policy.rate);
                                        const isOverbudget = totalGrossAmount > spendableRemaining;

                                        return (
                                            <div className={cn(
                                                "border rounded-lg p-2 transition-all",
                                                isOverbudget ? "bg-rose-50 border-rose-200" : "bg-indigo-50/50 border-indigo-100"
                                            )}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={cn(
                                                        "text-[8px] font-black uppercase tracking-tighter",
                                                        isOverbudget ? "text-rose-600" : "text-indigo-600"
                                                    )}>
                                                        {isOverbudget ? "Budget Exceeded!" : "Remains Spendable Target"}
                                                    </span>
                                                    {isOverbudget && <AlertTriangle className="h-2.5 w-2.5 text-rose-500 animate-pulse" />}
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={cn(
                                                        "text-xs font-black tabular-nums tracking-tight",
                                                        isOverbudget ? "text-rose-700" : "text-indigo-700"
                                                    )}>
                                                        {formatVN(spendableRemaining)}
                                                    </span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">suggested limit</span>
                                                </div>
                                                {isOverbudget && (
                                                    <p className="text-[7px] text-rose-500 font-bold italic mt-1 uppercase tracking-tight">
                                                        Note: amount &gt; remains means NO cashback earned for overflow.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
