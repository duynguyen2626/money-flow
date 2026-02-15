"use client";

import { useMemo, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
    Info,
    AlertTriangle,
    RotateCcw,
    DollarSign,
    Gift,
    Heart,
} from "lucide-react";
import { SingleTransactionFormValues } from "../types";
import {
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Account, Category, CashbackMode } from "@/types/moneyflow.types";
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
    const occurredAt = useWatch({ control: form.control, name: "occurred_at" });

    // Find active account
    const activeAccount = useMemo(() => {
        if (!sourceAccountId || !accounts) return null;
        return accounts.find(a => a.id === sourceAccountId) || null;
    }, [sourceAccountId, accounts]);

    // Find category
    const category = useMemo(() => {
        return categories.find(c => c.id === categoryId);
    }, [categories, categoryId]);

    // Calculate cycle info
    let cycleInfo = null;
    if (sourceAccountId && accounts && activeAccount?.credit_card_info?.statement_day) {
        const date = occurredAt ? new Date(occurredAt) : new Date();
        cycleInfo = calculateStatementCycle(date, activeAccount.credit_card_info.statement_day);
    }

    // Resolve cashback policy
    const policy = useMemo(() => {
        if (!activeAccount) return null;
        const cycleSpent = activeAccount.stats?.spent_this_cycle || 0;
        const projectedSpent = cycleSpent + Math.abs(amount);

        return resolveCashbackPolicy({
            account: activeAccount as Account,
            categoryId,
            amount: Math.abs(amount),
            cycleTotals: {
                spent: projectedSpent
            },
            categoryName: category?.name
        });
    }, [activeAccount, categoryId, amount, category]);

    // Calculate bank reward
    const { actualBankReward, remainsCap } = useMemo(() => {
        const rate = policy?.rate ?? 0;
        const raw = Math.abs(amount) * rate;
        const capped = policy?.maxReward !== undefined && policy.maxReward !== null ? Math.min(raw, policy.maxReward) : raw;
        const rawRemains = activeAccount?.stats?.remains_cap;
        const remains = (rawRemains === null || rawRemains === undefined) ? Infinity : rawRemains;

        return {
            remainsCap: rawRemains,
            actualBankReward: Math.min(capped, remains)
        };
    }, [amount, policy, activeAccount]);

    // Calculate shared values
    const totalSharedVal = useMemo(() => {
        return (Math.abs(amount) * ((sharePercent || 0) / 100)) + (shareFixed || 0);
    }, [amount, sharePercent, shareFixed]);

    // Check if over cap
    const isOverCap = useMemo(() => {
        return totalSharedVal > (actualBankReward + 0.9) && cashbackMode.includes('real');
    }, [totalSharedVal, actualBankReward, cashbackMode]);

    // Auto-fill when expanded
    useEffect(() => {
        if (isExpanded && policy && !form.getValues('cashback_share_percent') && !form.getValues('cashback_share_fixed')) {
            if (policy.rate > 0) {
                form.setValue('cashback_share_percent', Number((policy.rate * 100).toFixed(2)));
            }
        }
    }, [isExpanded, policy, form]);

    // Handle tab changes
    const handleTabChange = (val: string) => {
        let newMode: CashbackMode = 'percent';
        if (val === 'claim') newMode = 'percent';
        if (val === 'giveaway') newMode = 'real_percent';
        if (val === 'voluntary') newMode = 'voluntary';

        form.setValue('cashback_mode', newMode);

        // Auto-fill if empty
        if (policy && !form.getValues('cashback_share_percent') && !form.getValues('cashback_share_fixed')) {
            form.setValue('cashback_share_percent', Number((policy.rate * 100).toFixed(2)));
        }
    };

    // Hide for income/transfer
    if (transactionType === 'income' || transactionType === 'transfer') return null;

    const currentTab = (() => {
        if (['real_percent', 'real_fixed'].includes(cashbackMode)) return 'giveaway';
        if (cashbackMode === 'voluntary') return 'voluntary';
        return 'claim';
    })();

    const cycleSpent = activeAccount?.stats?.spent_this_cycle || 0;
    const minSpend = policy?.minSpend || activeAccount?.stats?.min_spend || 0;
    const minSpendPercent = minSpend > 0 ? Math.min(100, (cycleSpent / minSpend) * 100) : 100;

    return (
        <div className={cn(
            "rounded-lg transition-all duration-300 overflow-hidden",
            isExpanded ? "bg-slate-50/50 border border-slate-200/60 shadow-sm" : "bg-transparent border-none shadow-none"
        )}>
            {/* HEADER */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                        💰 Cashback
                    </span>
                    {cashbackMode !== 'none_back' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            Active
                        </span>
                    )}
                    {cycleInfo && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium border border-blue-200 ml-2">
                            {format(cycleInfo.start, "dd/MM")} - {format(cycleInfo.end, "dd/MM")}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Auto-Estimate</span>
                    <Switch
                        checked={isExpanded}
                        onCheckedChange={(checked) => form.setValue("ui_is_cashback_expanded", checked)}
                        className="scale-75 origin-right"
                    />
                </div>
            </div>

            {isExpanded && (
                <div className="px-3 pb-3 pt-3">
                    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-10 bg-transparent p-0 mb-4 gap-2">
                            <TabsTrigger
                                value="claim"
                                className={cn(
                                    "text-xs border border-slate-200 rounded-lg transition-all",
                                    "data-[state=active]:border-emerald-300 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm",
                                    "hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                                Claim
                            </TabsTrigger>
                            <TabsTrigger
                                value="giveaway"
                                className={cn(
                                    "text-xs border border-slate-200 rounded-lg transition-all",
                                    "data-[state=active]:border-amber-300 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm",
                                    "hover:border-slate-300 hover:bg-slate-50"
                                )}
                                disabled={!personId}
                            >
                                <Gift className="h-3.5 w-3.5 mr-1.5" />
                                Give Away
                            </TabsTrigger>
                            <TabsTrigger
                                value="voluntary"
                                className={cn(
                                    "text-xs border border-slate-200 rounded-lg transition-all",
                                    "data-[state=active]:border-rose-300 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 data-[state=active]:shadow-sm",
                                    "hover:border-slate-300 hover:bg-slate-50"
                                )}
                                disabled={!personId}
                            >
                                <Heart className="h-3.5 w-3.5 mr-1.5" />
                                Voluntary
                            </TabsTrigger>
                        </TabsList>

                        {/* RATE & AMOUNT INPUTS */}
                        <div className="space-y-4">
                            {(currentTab === 'claim' || currentTab === 'giveaway') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="cashback_share_percent"
                                        render={({ field }) => {
                                            const isOverPolicy = policy && field.value && field.value > (policy.rate * 100);
                                            return (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold text-slate-500">% Rate</FormLabel>
                                                    <div className="relative">
                                                        <SmartAmountInput
                                                            value={field.value ?? 0}
                                                            onChange={(val) => {
                                                                field.onChange(val);
                                                                if (currentTab === 'claim') form.setValue('cashback_mode', 'percent');
                                                                if (currentTab === 'giveaway') form.setValue('cashback_mode', 'real_percent');
                                                            }}
                                                            placeholder="0"
                                                            unit="%"
                                                            hideLabel={true}
                                                            className={cn(
                                                                "h-10",
                                                                (cashbackMode === 'percent' || cashbackMode === 'real_percent') ? "border-amber-500 ring-1 ring-amber-500" : ""
                                                            )}
                                                        />
                                                    </div>

                                                    {isOverPolicy && (
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[10px] leading-tight flex-wrap">
                                                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                                                <span>Higher than card rate ({(policy.rate * 100).toFixed(1)}%)</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    className="h-auto p-0 text-[10px] font-black underline uppercase text-rose-700 hover:text-rose-800 hover:bg-transparent"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        field.onChange(policy.rate * 100);
                                                                    }}
                                                                >
                                                                    <RotateCcw className="w-2.5 h-2.5 mr-1" /> Reset
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </FormItem>
                                            );
                                        }}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cashback_share_fixed"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-500">Amount</FormLabel>
                                                <SmartAmountInput
                                                    value={field.value ?? 0}
                                                    onChange={(val) => {
                                                        field.onChange(val);
                                                        if (currentTab === 'claim') form.setValue('cashback_mode', 'fixed');
                                                        if (currentTab === 'giveaway') form.setValue('cashback_mode', 'real_fixed');
                                                    }}
                                                    placeholder="0"
                                                    hideLabel={true}
                                                    className={cn(
                                                        "h-10",
                                                        (cashbackMode === 'fixed' || cashbackMode === 'real_fixed') ? "border-amber-500 ring-1 ring-amber-500" : ""
                                                    )}
                                                />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {/* VOLUNTARY TAB CONTENT */}
                            {currentTab === 'voluntary' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="cashback_share_percent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-500">% Back</FormLabel>
                                                <SmartAmountInput
                                                    value={field.value ?? 0}
                                                    onChange={field.onChange}
                                                    placeholder="0"
                                                    unit="%"
                                                    hideLabel={true}
                                                    className="h-10"
                                                />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cashback_share_fixed"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-500">Fixed Back</FormLabel>
                                                <SmartAmountInput
                                                    value={field.value ?? 0}
                                                    onChange={field.onChange}
                                                    placeholder="0"
                                                    hideLabel={true}
                                                    className="h-10"
                                                />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="col-span-2 text-[10px] text-slate-400 mt-1">
                                        * Voluntary cashback is tracked but not deducted from transaction total.
                                    </div>
                                </div>
                            )}

                            {/* BUDGET OVERFLOW WARNING */}
                            {isOverCap && (
                                <div className="mt-1 p-1.5 rounded bg-rose-50 border border-rose-100">
                                    <div className="flex items-start gap-1.5 text-rose-700 text-[10px] leading-tight">
                                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Budget Overflow!</p>
                                            <p className="opacity-80">Reward ({new Intl.NumberFormat('vi-VN').format(totalSharedVal)}) exceeds remaining cap ({new Intl.NumberFormat('vi-VN').format(remainsCap ?? 0)}).</p>
                                            <Button
                                                variant="link"
                                                className="h-auto p-0 text-[10px] font-black underline h-auto mt-1"
                                                onClick={() => {
                                                    form.setValue('cashback_mode', 'voluntary');
                                                }}
                                            >
                                                Switch to Voluntary Mode
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PROJECTED BANK REWARD */}
                            <div className="flex items-center justify-between p-2 bg-slate-100 rounded-md text-sm">
                                <span className="text-slate-500 font-medium">Projected Reward (Bank):</span>
                                <span className="font-bold text-slate-700">
                                    {new Intl.NumberFormat('vi-VN').format(Math.round(actualBankReward))}
                                </span>
                            </div>

                            {/* POLICY SUMMARY */}
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between text-xs border-b border-slate-100 pb-2 mb-2">
                                    <span className="text-slate-500 font-bold">Cycle Spent:</span>
                                    <span className="font-black text-indigo-600">
                                        {new Intl.NumberFormat('vi-VN').format(Math.round(cycleSpent))}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Match Policy:</span>
                                    <span className="font-medium text-right">
                                        {(() => {
                                            const source = policy?.metadata?.policySource;
                                            const reason = policy?.metadata?.reason || '';
                                            if (source === 'category_rule') return `Category Rule (${reason})`;
                                            if (source === 'level_default') return `Tier Level (${policy?.metadata?.levelName || 'Current'})`;
                                            if (source === 'program_default') return 'Card Default';
                                            if (source === 'legacy') return 'Legacy Rules';
                                            return 'Auto Math';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Bank Rate:</span>
                                    <span className="font-medium bg-slate-100 px-1 rounded">
                                        {(policy?.rate ? policy.rate * 100 : 0).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Your Share:</span>
                                    <span className="font-medium bg-slate-50 px-1 rounded">
                                        {(sharePercent ?? (policy?.rate ? policy.rate * 100 : 0)).toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            {/* DETAILED POLICY CARD */}
                            <div className="rounded-md border border-slate-200 bg-white p-3 space-y-2">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <Info className="w-3 h-3" /> Cashback Policy Details
                                </div>

                                <div className="grid grid-cols-2 gap-y-1 text-xs">
                                    <span className="text-slate-500">Summary:</span>
                                    <span className="text-right font-medium">
                                        {cashbackMode === 'none_back' ? 'None' : (cashbackMode.includes('real') ? 'Real' : 'Virtual')} • {(sharePercent || (policy?.rate ? policy.rate * 100 : 0)).toFixed(1)}%
                                    </span>

                                    <span className="text-slate-500">Source:</span>
                                    <span className="text-right font-medium">
                                        {(() => {
                                            const source = policy?.metadata?.policySource;
                                            if (source === 'category_rule') return 'Specific Category Rule';
                                            if (source === 'level_default') return 'Tier Achievement';
                                            if (source === 'program_default') return 'Standard Program';
                                            if (source === 'legacy') return 'Global Settings';
                                            return source || 'N/A';
                                        })()}
                                    </span>

                                    <span className="text-slate-500">Criteria:</span>
                                    <span className="text-right font-medium text-[10px] italic text-slate-400">
                                        {policy?.metadata?.reason || 'N/A'}
                                    </span>
                                </div>

                                {/* MIN SPEND PROGRESS */}
                                {minSpend > 0 && (
                                    <div className="text-[10px] text-slate-400 pt-1 flex flex-col gap-1.5 border-t border-slate-100 mt-2">
                                        <div className="flex justify-between">
                                            <span>Min Spend Progress:</span>
                                            <span className="text-amber-600 font-medium">
                                                {new Intl.NumberFormat('vi-VN').format(Math.round(cycleSpent))} / {new Intl.NumberFormat('vi-VN').format(Math.round(minSpend))}
                                            </span>
                                        </div>
                                        <Progress value={minSpendPercent} className="h-1.5" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
