"use client";

import { useMemo, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
    Percent,
    AlertTriangle,
    RotateCcw,
    DollarSign,
    Gift,
    Heart,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Wallet,
    Info,
    Sparkles,
    RefreshCcw
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
import { formatShortVietnameseCurrency } from "@/lib/number-to-text";

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
                    {/* PLACEHOLDER FOR RE-IMPLEMENTATION */}
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl space-y-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                            <RefreshCcw className="w-8 h-8 text-indigo-400 animate-spin-slow" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Reward Engine Refactor</h3>
                            <p className="text-xs text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                                Strategy matching & manual overrides will be re-implemented by the next agent phase.
                            </p>
                        </div>
                        <div className="flex gap-2 w-full mt-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-indigo-500 rounded-full" />
                            </div>
                            <div className="flex-1 h-2 bg-slate-200 rounded-full" />
                            <div className="flex-1 h-2 bg-slate-200 rounded-full" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
