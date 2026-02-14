"use client";

import { useMemo, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
    Percent,
    Info,
    AlertTriangle,
    RotateCcw,
    DollarSign,
    Gift,
    Heart,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Wallet
} from "lucide-react";
import { SingleTransactionFormValues } from "../types";
import { toast } from "sonner";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Account, Category } from "@/types/moneyflow.types";
import { calculateStatementCycle } from "@/lib/cycle-utils";
import { format } from "date-fns";
import { resolveCashbackPolicy } from "@/services/cashback/policy-resolver";

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
    const personId = useWatch({ control: form.control, name: "person_id" });
    const amount = useWatch({ control: form.control, name: "amount" }) || 0;
    const sharePercent = useWatch({ control: form.control, name: "cashback_share_percent" });
    const shareFixed = useWatch({ control: form.control, name: "cashback_share_fixed" });
    const categoryId = useWatch({ control: form.control, name: "category_id" });

    const activeAccount = useMemo(() => {
        if (!sourceAccountId || !accounts) return null;
        return accounts.find(a => a.id === sourceAccountId) || null;
    }, [sourceAccountId, accounts]);

    const category = useMemo(() => {
        return categories.find(c => c.id === categoryId);
    }, [categories, categoryId]);

    const policy = useMemo(() => {
        if (!activeAccount) return null;
        const cycleSpent = activeAccount.stats?.spent_this_cycle || 0;
        const projectedSpent = cycleSpent + Math.abs(amount);

        return resolveCashbackPolicy({
            account: activeAccount as any,
            categoryId,
            amount: Math.abs(amount),
            cycleTotals: {
                spent: projectedSpent
            },
            categoryName: category?.name
        });
    }, [activeAccount, categoryId, amount, category]);

    const { actualBankReward, bankRewardRaw, remainsCap } = useMemo(() => {
        const rate = policy?.rate ?? 0;
        const raw = Math.abs(amount) * rate;
        const capped = policy?.maxReward !== undefined && policy.maxReward !== null ? Math.min(raw, policy.maxReward) : raw;

        const rawRemains = activeAccount?.stats?.remains_cap;
        const remains = (rawRemains === null || rawRemains === undefined) ? Infinity : rawRemains;

        return {
            bankRewardRaw: raw,
            remainsCap: rawRemains,
            actualBankReward: Math.min(capped, remains)
        };
    }, [amount, policy, activeAccount]);

    const totalSharedVal = useMemo(() => {
        return (Math.abs(amount) * ((sharePercent || 0) / 100)) + (shareFixed || 0);
    }, [amount, sharePercent, shareFixed]);

    const isOverCap = useMemo(() => {
        // Tolerant check for floating point
        return totalSharedVal > (actualBankReward + 0.9) && cashbackMode.includes('real');
    }, [totalSharedVal, actualBankReward, cashbackMode]);

    const effectiveDisplayPercent = useMemo(() => {
        const absAmt = Math.abs(amount);
        if (absAmt > 0) return ((totalSharedVal / absAmt) * 100).toFixed(1);
        return (policy?.rate ? policy.rate * 100 : 0).toFixed(1);
    }, [amount, totalSharedVal, policy]);

    // Auto-fill logic when section is expanded and we have a policy
    useEffect(() => {
        if (isExpanded && policy && !form.getValues('cashback_share_percent') && !form.getValues('cashback_share_fixed')) {
            if (policy.rate > 0) {
                form.setValue('cashback_share_percent', Number((policy.rate * 100).toFixed(2)));
            }
        }
    }, [isExpanded, policy, form]);

    // Handle tab changes 
    const handleTabChange = (val: string) => {
        let newMode: any = 'percent';
        if (val === 'claim') newMode = 'percent';
        if (val === 'giveaway') newMode = 'real_percent';
        if (val === 'voluntary') newMode = 'voluntary';

        form.setValue('cashback_mode', newMode);

        // Auto-fill if empty
        if (policy && !form.getValues('cashback_share_percent') && !form.getValues('cashback_share_fixed')) {
            form.setValue('cashback_share_percent', Number((policy.rate * 100).toFixed(2)));
        }
    };

    if (transactionType === 'income' || transactionType === 'transfer') return null;

    const currentTab = (() => {
        if (['real_percent', 'real_fixed'].includes(cashbackMode)) return 'giveaway';
        if (cashbackMode === 'voluntary') return 'voluntary';
        return 'claim';
    })();

    return (
        <div className={cn(
            "rounded-xl transition-all duration-300 overflow-hidden",
            isExpanded ? "bg-white border border-slate-200 shadow-xl shadow-slate-100/50" : "bg-transparent"
        )}>
            {/* COMPACT HEADER */}
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
                                    ~{new Intl.NumberFormat('vi-VN').format(Math.round(actualBankReward))}
                                </span>
                            )}
                        </div>
                        {activeAccount?.credit_card_info?.statement_day && (
                            <p className="text-[10px] text-slate-400 font-medium">
                                Cycle resets on day {activeAccount.credit_card_info.statement_day}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {!isExpanded && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estimate</span>
                            <span className="text-xs font-black text-slate-700">{effectiveDisplayPercent}%</span>
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
                    {/* MODE SELECTOR */}
                    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-10 bg-slate-100/50 p-1 rounded-lg gap-1 border-none shadow-none">
                            <TabsTrigger value="claim" className="text-xs font-bold rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm border-none">
                                <DollarSign className="w-3 h-3 mr-1" /> Claim
                            </TabsTrigger>
                            <TabsTrigger value="giveaway" className="text-xs font-bold rounded-md data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm border-none">
                                <Gift className="w-3 h-3 mr-1" /> Give Away
                            </TabsTrigger>
                            <TabsTrigger value="voluntary" className="text-xs font-bold rounded-md data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm border-none">
                                <Heart className="w-3 h-3 mr-1" /> Voluntary
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-5 space-y-4">
                            {/* INPUT SECTION */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="cashback_share_percent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">% Rate</FormLabel>
                                                {policy?.rate !== undefined && (
                                                    <button
                                                        type="button"
                                                        onClick={() => field.onChange(policy.rate * 100)}
                                                        className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black hover:bg-indigo-100 transition-colors"
                                                    >
                                                        {(policy.rate * 100).toFixed(1)}%
                                                    </button>
                                                )}
                                            </div>
                                            <SmartAmountInput
                                                value={field.value ?? 0}
                                                onChange={(val) => {
                                                    field.onChange(val);
                                                    if (currentTab === 'claim') form.setValue('cashback_mode', 'percent');
                                                    if (currentTab === 'giveaway') form.setValue('cashback_mode', 'real_percent');
                                                }}
                                                unit="%"
                                                placeholder="0.0"
                                                hideLabel={true}
                                                className="h-11 rounded-lg border-slate-200 focus:border-indigo-500 shadow-sm"
                                            />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="cashback_share_fixed"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Fixed Amount</FormLabel>
                                                {actualBankReward > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => field.onChange(Math.round(actualBankReward))}
                                                        className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black hover:bg-slate-200 transition-colors"
                                                    >
                                                        Max
                                                    </button>
                                                )}
                                            </div>
                                            <SmartAmountInput
                                                value={field.value ?? 0}
                                                onChange={(val) => {
                                                    field.onChange(val);
                                                    if (val && val > 0) {
                                                        if (currentTab === 'claim') form.setValue('cashback_mode', 'fixed');
                                                        if (currentTab === 'giveaway') form.setValue('cashback_mode', 'real_fixed');
                                                    }
                                                }}
                                                placeholder="0"
                                                hideLabel={true}
                                                className="h-11 rounded-lg border-slate-200 focus:border-indigo-500 shadow-sm"
                                            />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* DYNAMIC ALERT BANNER */}
                            {isOverCap && (
                                <div className="bg-rose-50 border-2 border-rose-100 rounded-xl p-3 flex flex-col gap-2.5 animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-2.5 text-rose-700">
                                        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-black uppercase tracking-tight">Budget Overflow!</h4>
                                            <p className="text-[10px] font-medium opacity-80 leading-tight">Your share exceeds current bank limit ({new Intl.NumberFormat('vi-VN').format(Math.round(actualBankReward))})</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 h-8 text-[10px] font-black uppercase text-rose-700 hover:bg-rose-100 border border-rose-200"
                                            onClick={(e) => { e.preventDefault(); form.setValue('cashback_mode', 'voluntary'); }}
                                        >
                                            Switch to Voluntary
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                form.setValue('cashback_share_percent', Number((policy?.rate ? policy.rate * 100 : 0).toFixed(2)));
                                                form.setValue('cashback_share_fixed', null);
                                            }}
                                            title="Correct to match card limit"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* SMART BUDGET SUMMARY CARD */}
                            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <Wallet className="w-3.5 h-3.5" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider">Remaining Loop</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-black text-slate-900">
                                            {remainsCap !== null && remainsCap !== undefined
                                                ? new Intl.NumberFormat('vi-VN').format(Math.round(remainsCap))
                                                : "∞"}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">/{activeAccount?.stats?.max_budget ? new Intl.NumberFormat('vi-VN').format(Math.round(activeAccount.stats.max_budget)) : "N/A"}</span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-indigo-500 flex items-center justify-center">
                                    <span className="text-[10px] font-black text-slate-600">
                                        {activeAccount?.stats?.max_budget && remainsCap !== null ?
                                            Math.max(0, Math.min(100, Math.round((remainsCap / activeAccount.stats.max_budget) * 100))) :
                                            100}%
                                    </span>
                                </div>
                            </div>

                            {/* POLICY DASHBOARD GRID */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-white border border-slate-100 rounded-lg flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matched Policy</span>
                                    <span className="text-xs font-black text-indigo-600 truncate">
                                        {policy?.metadata.policySource === 'category_rule' ? 'Category Specific' :
                                            policy?.metadata.policySource === 'level_default' ? `Tier: ${policy.metadata.levelName}` :
                                                'Standard Card'}
                                    </span>
                                </div>
                                <div className="p-3 bg-white border border-slate-100 rounded-lg flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bank Reward</span>
                                    <span className="text-xs font-black text-emerald-600 truncate">
                                        {new Intl.NumberFormat('vi-VN').format(Math.round(actualBankReward))}
                                        <span className="text-[9px] opacity-70 ml-1">({(policy?.rate ? policy.rate * 100 : 0).toFixed(1)}%)</span>
                                    </span>
                                </div>
                                <div className="p-3 bg-white border border-slate-100 rounded-lg flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Effective Profit</span>
                                    <span className="text-xs font-black text-slate-700 truncate">
                                        {(() => {
                                            const profitVal = Math.max(0, actualBankReward - totalSharedVal);
                                            return new Intl.NumberFormat('vi-VN').format(Math.round(profitVal));
                                        })()}
                                    </span>
                                </div>
                                <div className="p-3 bg-white border border-slate-100 rounded-lg flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence</span>
                                    <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                                        98%
                                    </span>
                                </div>
                            </div>

                            {/* DETAILED REASON (Criteria) */}
                            {policy?.metadata.reason && (
                                <div className="flex items-center gap-2 p-3 bg-indigo-50/30 rounded-lg border border-indigo-50 text-[10px] text-indigo-600/80 italic font-medium">
                                    <Info className="w-3 h-3 shrink-0" />
                                    <span>Applied: {policy.metadata.reason}</span>
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
