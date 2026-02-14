"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Percent, Info, Settings2, AlertTriangle, RotateCcw, DollarSign, Gift, Heart } from "lucide-react";
import { SingleTransactionFormValues } from "../types";
import { toast } from "sonner";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Account, Category } from "@/types/moneyflow.types";
import { calculateStatementCycle } from "@/lib/cycle-utils";
import { format } from "date-fns";
import { normalizeCashbackConfig, parseCashbackConfig } from "@/lib/cashback";
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

    const { actualBankReward, bankRewardRaw, bankRewardCapped, remainsCap } = useMemo(() => {
        const rate = policy?.rate ?? 0;
        const raw = Math.abs(amount) * rate;
        const capped = policy?.maxReward !== undefined && policy.maxReward !== null ? Math.min(raw, policy.maxReward) : raw;

        // MF5.4.3: Use Infinity for Unlimited to avoid Math.min(capped, null) returning 0
        const rawRemains = activeAccount?.stats?.remains_cap;
        const remains = (rawRemains === null || rawRemains === undefined) ? Infinity : rawRemains;

        return {
            bankRewardRaw: raw,
            bankRewardCapped: capped,
            remainsCap: rawRemains, // Keep raw version for UI checks
            actualBankReward: Math.min(capped, remains)
        };
    }, [amount, policy, activeAccount]);

    const totalSharedVal = useMemo(() => {
        return (Math.abs(amount) * ((sharePercent || 0) / 100)) + (shareFixed || 0);
    }, [amount, sharePercent, shareFixed]);

    const isOverCap = useMemo(() => {
        return totalSharedVal > (actualBankReward + 0.5) && cashbackMode.includes('real');
    }, [totalSharedVal, actualBankReward, cashbackMode]);

    const effectiveDisplayPercent = useMemo(() => {
        const val = (Math.abs(amount) > 0 ? (totalSharedVal / Math.abs(amount)) * 100 : 0);
        if (val > 0) return val.toFixed(1);
        return (policy?.rate ? policy.rate * 100 : 0).toFixed(1);
    }, [amount, totalSharedVal, policy]);

    // Calculate Cycle
    let cycleInfo = null;
    if (sourceAccountId && accounts) {
        const acc = accounts.find(a => a.id === sourceAccountId);
        const date = form.getValues('occurred_at') || new Date();
        if (acc?.credit_card_info?.statement_day) {
            cycleInfo = calculateStatementCycle(new Date(date), acc.credit_card_info.statement_day);
        }
    }

    // Derive active Tab from mode
    const getTabFromMode = (mode: string) => {
        if (['real_percent', 'real_fixed'].includes(mode)) return 'giveaway';
        if (mode === 'voluntary') return 'voluntary';
        return 'claim'; // 'none_back', 'percent', 'fixed'
    };

    // Handle tab changes with auto-fill logic
    const handleTabChange = (val: string) => {
        let newMode: any = 'percent';
        if (val === 'claim') newMode = 'percent';
        if (val === 'giveaway') newMode = 'real_percent';
        if (val === 'voluntary') newMode = 'voluntary';

        form.setValue('cashback_mode', newMode);

        // Auto-fill rate if switching to percent modes - use policy resolver for accuracy
        if ((newMode === 'percent' || newMode === 'real_percent') && policy) {
            const policyRate = policy.rate;
            const currentShare = form.getValues('cashback_share_percent');

            // Only auto-fill if the current share is 0 or null/undefined
            // This satisfies the user's request: "khi nào nhập mới bắt đầu tính"
            if (!currentShare || currentShare === 0) {
                // We show it in policy summary but don't force it into the input 
                // unless it's a new transaction and we want to be helpful.
                // However, user specifically asked to not input until they do.
                // So let's NOT auto-fill it here to keep it at 0.
                console.log('[CashbackSection] Tab change - keeping share at 0 as requested');
            }
        }
    };

    if (transactionType === 'income' || transactionType === 'transfer') return null;

    const toggleExpand = () => {
        form.setValue("ui_is_cashback_expanded", !isExpanded);
    };

    const currentTab = getTabFromMode(cashbackMode);

    return (
        <div className={cn(
            "rounded-lg transition-all duration-300",
            isExpanded ? "bg-slate-50/50 border border-slate-200/60 shadow-sm" : "bg-transparent border-none shadow-none"
        )}>
            {/* COMPACT HEADER - Removed border-b */}
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
                        <TabsList className="grid w-full grid-cols-3 h-auto bg-transparent p-0 mb-4 gap-2 border-none shadow-none rounded-none">
                            <TabsTrigger
                                value="claim"
                                className={cn(
                                    "text-xs border border-slate-200 rounded-lg transition-all h-10",
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
                                    "text-xs border border-slate-200 rounded-lg transition-all h-10",
                                    "data-[state=active]:border-amber-300 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm",
                                    "hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <Gift className="h-3.5 w-3.5 mr-1.5" />
                                Give Away
                            </TabsTrigger>
                            <TabsTrigger
                                value="voluntary"
                                className={cn(
                                    "text-xs border border-slate-200 rounded-lg transition-all h-10",
                                    "data-[state=active]:border-rose-300 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 data-[state=active]:shadow-sm",
                                    "hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <Heart className="h-3.5 w-3.5 mr-1.5" />
                                Voluntary
                            </TabsTrigger>
                        </TabsList>

                        {/* CLAIM & GIVE AWAY CONTENT (Shared Layout) */}
                        <div className="space-y-4">
                            {/* Row 1: Rate & Amount Inputs */}
                            {(currentTab === 'claim' || currentTab === 'giveaway') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="cashback_share_percent"
                                        render={({ field }) => {
                                            // The user share could be partially from fixed amount
                                            const currentFixed = form.getValues('cashback_share_fixed') || 0;
                                            const remainingForPercent = Math.max(0, actualBankReward - currentFixed);
                                            const maxAllowedPercent = (Math.abs(amount) > 0) ? (remainingForPercent / Math.abs(amount)) * 100 : 0;

                                            const isOverPolicy = field.value && field.value > (policy?.rate ? policy.rate * 100 : 0);
                                            const totalShared = (Math.abs(amount) * ((field.value || 0) / 100)) + currentFixed;
                                            const isOverCap = totalShared > (actualBankReward + 0.5);
                                            // Linkage logic: adjust other field if total exceeds reward
                                            const syncFields = (newPercent?: number, newFixed?: number) => {
                                                if (!cashbackMode.includes('real')) return;

                                                const p = newPercent ?? field.value ?? 0;
                                                const f = newFixed ?? form.getValues('cashback_share_fixed') ?? 0;
                                                const total = (Math.abs(amount) * (p / 100)) + f;

                                                if (total > actualBankReward + 0.1) {
                                                    if (newPercent !== undefined) {
                                                        // Percent changed -> adjust fixed
                                                        const pVal = Math.abs(amount) * (p / 100);
                                                        const allowedFixed = Math.max(0, actualBankReward - pVal);
                                                        form.setValue('cashback_share_fixed', Math.round(allowedFixed));
                                                    } else if (newFixed !== undefined) {
                                                        // Fixed changed -> adjust percent
                                                        const allowedRewardForPercent = Math.max(0, actualBankReward - f);
                                                        const allowedPercent = (Math.abs(amount) > 0) ? (allowedRewardForPercent / Math.abs(amount)) * 100 : 0;
                                                        form.setValue('cashback_share_percent', Number(allowedPercent.toFixed(2)));
                                                    }
                                                }
                                            };

                                            return (
                                                <FormItem>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <FormLabel className="text-xs font-semibold text-slate-500">% Rate</FormLabel>
                                                        <span className="text-[10px] opacity-70">
                                                            Up to {maxAllowedPercent.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="relative">
                                                        <SmartAmountInput
                                                            value={field.value ?? 0}
                                                            onChange={(val) => {
                                                                const newVal = val ?? 0;
                                                                field.onChange(newVal);
                                                                // Auto-switch mode based on interaction
                                                                if (currentTab === 'claim') form.setValue('cashback_mode', 'percent');
                                                                if (currentTab === 'giveaway') form.setValue('cashback_mode', 'real_percent');

                                                                syncFields(newVal, undefined);
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

                                                    {/* Validation & Reset */}
                                                    {!!isOverPolicy && (
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[10px] leading-tight flex-wrap">
                                                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                                                <span>Higher than card rate ({(policy?.rate ? policy.rate * 100 : 0).toFixed(1)}%)</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    className="h-auto p-0 text-[10px] font-black underline uppercase text-rose-700 hover:text-rose-800 hover:bg-transparent"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        if (policy) field.onChange(policy.rate * 100);
                                                                    }}
                                                                >
                                                                    <RotateCcw className="w-2.5 h-2.5 mr-1" /> Reset
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Compact Budget Warning */}
                                                    {isOverCap && cashbackMode.includes('real') && !!personId && (
                                                        <div className="mt-1 px-2 py-1.5 rounded-md bg-rose-50 border border-rose-200 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 text-rose-700 text-[10px] leading-none">
                                                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                                                    <span className="font-bold">Budget Overflow!</span>
                                                                    <span className="opacity-70 font-medium">
                                                                        Limit: {new Intl.NumberFormat('vi-VN').format(Math.round(actualBankReward))}
                                                                    </span>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-1.5 text-[9px] font-black underline uppercase text-rose-700 hover:text-rose-800 hover:bg-rose-100/50"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        form.setValue('cashback_mode', 'voluntary');
                                                                        // Keep the values but switch mode
                                                                    }}
                                                                >
                                                                    Voluntary?
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
                                        render={({ field }) => {
                                            const bankRate = policy?.rate ?? 0;
                                            const bankRewardRaw = Math.abs(amount) * bankRate;
                                            const bankRewardCapped = policy?.maxReward ? Math.min(bankRewardRaw, policy.maxReward) : bankRewardRaw;

                                            // The user share could be partially from percent
                                            const currentPercent = form.getValues('cashback_share_percent') || 0;
                                            const percentValue = Math.abs(amount) * (currentPercent / 100);
                                            const remainingForFixed = Math.max(0, actualBankReward - percentValue);
                                            const availableMax = remainingForFixed;

                                            // Local linkage logic for Amount field
                                            const syncFromFixed = (newFixed: number) => {
                                                if (!cashbackMode.includes('real')) return;
                                                const currentPercent = form.getValues('cashback_share_percent') || 0;
                                                const total = (Math.abs(amount) * (currentPercent / 100)) + newFixed;

                                                if (total > actualBankReward + 0.1) {
                                                    const allowedRewardForPercent = Math.max(0, actualBankReward - newFixed);
                                                    const allowedPercent = (Math.abs(amount) > 0) ? (allowedRewardForPercent / Math.abs(amount)) * 100 : 0;
                                                    form.setValue('cashback_share_percent', Number(allowedPercent.toFixed(2)));
                                                }
                                            };

                                            return (
                                                <FormItem>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <FormLabel className="text-xs font-semibold text-slate-500">Amount</FormLabel>
                                                        <span className="text-[10px] text-slate-400">
                                                            Max: {new Intl.NumberFormat('vi-VN').format(Math.round(availableMax))}
                                                        </span>
                                                    </div>
                                                    <SmartAmountInput
                                                        value={field.value ?? 0}
                                                        onChange={(val) => {
                                                            const newVal = val ?? 0;
                                                            field.onChange(newVal);
                                                            // Auto-switch mode based on interaction
                                                            if (newVal > 0) {
                                                                if (currentTab === 'claim') form.setValue('cashback_mode', 'fixed');
                                                                if (currentTab === 'giveaway') form.setValue('cashback_mode', 'real_fixed');
                                                            }

                                                            syncFromFixed(newVal);
                                                        }}
                                                        placeholder="0"
                                                        hideLabel={true}
                                                        className={cn(
                                                            "h-10",
                                                            (cashbackMode === 'fixed' || cashbackMode === 'real_fixed') ? "border-amber-500 ring-1 ring-amber-500" : ""
                                                        )}
                                                    />
                                                </FormItem>
                                            );
                                        }}
                                    />
                                </div>
                            )}

                            {/* Global Budget Over-limit Warning - Centralized */}
                            {isOverCap && (
                                <div className="mx-0 py-2 px-3 rounded-lg bg-rose-50 border border-rose-200 shadow-sm animate-in fade-in zoom-in duration-300">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-rose-700 text-xs">
                                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                                            <div>
                                                <p className="font-black leading-none">Budget Overflow!</p>
                                                <p className="text-[10px] opacity-80 mt-1">Sharing more than effective reward ({new Intl.NumberFormat('vi-VN').format(Math.round(actualBankReward))})</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] font-black px-2 border-rose-200 text-rose-700 hover:bg-rose-100 uppercase"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                form.setValue('cashback_mode', 'voluntary');
                                            }}
                                        >
                                            Switch to Voluntary
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* VOLUNTARY CONTENT - Match Give Away Styling */}
                            {currentTab === 'voluntary' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="cashback_share_percent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-500">% Back</FormLabel>
                                                <div className="relative">
                                                    <SmartAmountInput
                                                        value={field.value ?? 0}
                                                        onChange={field.onChange}
                                                        placeholder="0"
                                                        unit="%"
                                                        hideLabel={true}
                                                        className="h-10"
                                                    />
                                                </div>
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

                            {/* TOTAL PROJECTED REWARD (BANK) */}
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
                                        {activeAccount?.stats?.spent_this_cycle
                                            ? new Intl.NumberFormat('vi-VN').format(activeAccount.stats.spent_this_cycle)
                                            : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Match Policy:</span>
                                    <span className="font-medium text-right">
                                        {(() => {
                                            const source = policy?.metadata.policySource;
                                            const reason = policy?.metadata.reason || '';
                                            if (source === 'category_rule') return `Category Rule (${reason})`;
                                            if (source === 'level_default') return `Tier Level (${policy?.metadata.levelName || 'Current'})`;
                                            if (source === 'program_default') return 'Card Default';
                                            if (source === 'legacy') return 'Legacy Rules';
                                            return 'Auto Math';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Bank Rate:</span>
                                    <span className="font-medium bg-slate-100 px-1 rounded flex items-center gap-1">
                                        {(policy?.rate ? policy.rate * 100 : 0).toFixed(1)}%
                                        <span className="text-[10px] opacity-70">
                                            ({new Intl.NumberFormat('vi-VN').format(Math.round(actualBankReward))})
                                        </span>
                                        {bankRewardRaw > actualBankReward && (
                                            <span className="text-[9px] text-amber-600 font-black ml-0.5">
                                                ({(remainsCap !== null && remainsCap !== undefined && remainsCap <= 0) ? 'OVER BUDGET' : 'CAPPED'})
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-bold">Your Share:</span>
                                    <span className="font-black bg-indigo-50 text-indigo-700 px-1 rounded flex items-center gap-1">
                                        {effectiveDisplayPercent}%
                                        <span className="text-[10px] opacity-70">
                                            ({new Intl.NumberFormat('vi-VN').format(Math.round(totalSharedVal))})
                                        </span>
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs pt-1 border-t border-slate-50 mt-1">
                                    <span className="text-slate-500">Profit:</span>
                                    <span className="font-black text-emerald-600 flex items-center gap-1">
                                        {(() => {
                                            const profitVal = Math.max(0, actualBankReward - totalSharedVal);
                                            const profitPercent = Math.abs(amount) > 0 ? (profitVal / Math.abs(amount)) * 100 : 0;
                                            return profitPercent.toFixed(1);
                                        })()}%
                                        <span className="text-[10px] opacity-70">
                                            ({new Intl.NumberFormat('vi-VN').format(Math.round(Math.max(0, actualBankReward - totalSharedVal)))} )
                                        </span>
                                    </span>
                                </div>
                                {activeAccount?.stats?.remains_cap !== undefined && activeAccount.stats.remains_cap !== null && (
                                    <div className="flex justify-between text-xs pt-2">
                                        <span className="text-amber-600 font-medium">Budget Left:</span>
                                        <span className="text-amber-600 font-bold">
                                            {new Intl.NumberFormat('vi-VN').format(activeAccount.stats.remains_cap)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* COLLAPSIBLE DETAILS */}
                            <div className="rounded-md border border-slate-200 bg-white p-3 space-y-2">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <Info className="w-3 h-3" /> Cashback Policy Details
                                </div>

                                <div className="grid grid-cols-2 gap-y-1 text-xs">
                                    <span className="text-slate-500">Summary:</span>
                                    <span className="text-right font-medium">
                                        {cashbackMode === 'none_back' ? 'None' : (cashbackMode.includes('real') ? 'Real' : 'Virtual')} • {(() => {
                                            if (Number(effectiveDisplayPercent) > 0) return effectiveDisplayPercent;
                                            // Handle case where share is 0 but we want to show card potential or effective award
                                            if (actualBankReward > 0 && Math.abs(amount) > 0) {
                                                return ((actualBankReward / Math.abs(amount)) * 100).toFixed(1);
                                            }
                                            return (policy?.rate ? policy.rate * 100 : 0).toFixed(1);
                                        })()}%
                                    </span>

                                    <span className="text-slate-500">Source:</span>
                                    <span className="text-right font-medium text-indigo-600">
                                        {(() => {
                                            const source = policy?.metadata.policySource;
                                            if (source === 'category_rule') return 'Specific Category Rule';
                                            if (source === 'level_default') return 'Tier Achievement';
                                            if (source === 'program_default') return 'Standard Program';
                                            if (source === 'legacy') return 'Global Settings';
                                            return 'Auto Math';
                                        })()}
                                    </span>

                                    {policy?.maxReward !== undefined && policy.maxReward !== null && (
                                        <>
                                            <span className="text-slate-500">Rule Cap:</span>
                                            <span className="text-right font-medium text-amber-600">
                                                {new Intl.NumberFormat('vi-VN').format(policy.maxReward)}
                                            </span>
                                        </>
                                    )}

                                    <span className="text-slate-500">Cycle Cap:</span>
                                    <span className="text-right font-medium text-slate-700">
                                        {activeAccount?.stats?.max_budget
                                            ? new Intl.NumberFormat('vi-VN').format(activeAccount.stats.max_budget)
                                            : 'Unlimited'}
                                    </span>

                                    <span className="text-slate-500">Criteria:</span>
                                    <span className="text-right font-medium text-[10px] italic text-slate-400">
                                        {policy?.metadata.reason || 'N/A'}
                                    </span>
                                </div>

                                <div className="text-[10px] text-slate-400 pt-1 flex justify-between border-t border-slate-100 mt-2">
                                    <span>Min Spend Progress:</span>
                                    <span className="text-amber-600 font-medium">
                                        {(() => {
                                            const minSpend = policy?.minSpend || activeAccount?.stats?.min_spend || 0;
                                            const spent = activeAccount?.stats?.spent_this_cycle || 0;
                                            if (!minSpend || minSpend <= 0) return '—';
                                            return `${new Intl.NumberFormat('vi-VN').format(spent)} / ${new Intl.NumberFormat('vi-VN').format(minSpend)}`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Tabs>
                </div>
            )
            }
        </div>
    );
}
