"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Percent, Info, Settings2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Account } from "@/types/moneyflow.types";
import { calculateStatementCycle } from "@/lib/cycle-utils";
import { format } from "date-fns";
import { normalizeCashbackConfig } from "@/lib/cashback";

type CashbackSectionProps = {
    accounts?: Account[];
};

export function CashbackSection({ accounts }: CashbackSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const isExpanded = useWatch({ control: form.control, name: "ui_is_cashback_expanded" });
    const cashbackMode = useWatch({ control: form.control, name: "cashback_mode" });

    const transactionType = useWatch({ control: form.control, name: "type" });
    const sourceAccountId = useWatch({ control: form.control, name: "source_account_id" });
    const personId = useWatch({ control: form.control, name: "person_id" });

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

        // Auto-fill rate if switching to percent modes
        if ((newMode === 'percent' || newMode === 'real_percent') && sourceAccountId && accounts) {
            const acc = accounts.find(a => a.id === sourceAccountId);
            if (acc?.cashback_config) {
                const config = normalizeCashbackConfig(acc.cashback_config as any);

                // Extract the best rate from the config
                let bestRate = config.program?.defaultRate ?? config.rate ?? 0;

                // Check levels for higher rates in category rules
                if (config.program?.levels && config.program.levels.length > 0) {
                    for (const level of config.program.levels) {
                        // Check level's default rate
                        if (level.defaultRate !== null && level.defaultRate !== undefined && level.defaultRate > bestRate) {
                            bestRate = level.defaultRate;
                        }
                        // Check category-specific rules
                        if (level.rules && level.rules.length > 0) {
                            for (const rule of level.rules) {
                                if (rule.rate > bestRate) {
                                    bestRate = rule.rate;
                                }
                            }
                        }
                    }
                }

                console.log('[CashbackSection] Auto-fill rate:', { account: acc.name, bestRate, config });

                if (bestRate > 0) {
                    // Convert decimal (0.2) to percentage (20) for UI display
                    // The form will convert back to decimal on submit
                    form.setValue('cashback_share_percent', bestRate * 100);
                }
            }
        }
    };

    if (transactionType === 'income' || transactionType === 'transfer') return null;

    const toggleExpand = () => {
        form.setValue("ui_is_cashback_expanded", !isExpanded);
    };

    const currentTab = getTabFromMode(cashbackMode);

    return (
        <div className="border rounded-lg bg-slate-50 overflow-hidden transition-all duration-300">
            {/* COMPACT HEADER */}
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
                <Button variant="ghost" size="sm" onClick={toggleExpand} className="h-7 w-7 p-0 hover:bg-slate-200" type="button">
                    <Settings2 className="w-4 h-4 text-slate-500" />
                </Button>
            </div>

            {isExpanded && (
                <div className="px-3 pb-3 border-t border-slate-200 pt-3">
                    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-9 bg-slate-100 p-1 mb-4">
                            <TabsTrigger value="claim" className="text-xs">Claim</TabsTrigger>
                            <TabsTrigger
                                value="giveaway"
                                className="text-xs"
                                disabled={!personId}
                            >
                                Give Away
                            </TabsTrigger>
                            <TabsTrigger
                                value="voluntary"
                                className="text-xs"
                                disabled={!personId}
                            >
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
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-500">% Rate</FormLabel>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            let val = Number(e.target.value);
                                                            // Removed hardcoded 10% limit to support higher rates (e.g. 20%)
                                                            field.onChange(val);
                                                            // Auto-switch mode based on interaction
                                                            if (currentTab === 'claim') form.setValue('cashback_mode', 'percent');
                                                            if (currentTab === 'giveaway') form.setValue('cashback_mode', 'real_percent');
                                                        }}
                                                        className={cn(
                                                            "pr-7 h-10 text-right",
                                                            (cashbackMode === 'percent' || cashbackMode === 'real_percent') ? "border-amber-500 ring-1 ring-amber-500" : ""
                                                        )}
                                                    />
                                                    <Percent className="absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cashback_share_fixed"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <FormLabel className="text-xs font-semibold text-slate-500">Amount</FormLabel>
                                                    <span className="text-[10px] text-slate-400">Max: 33</span>
                                                </div>
                                                <SmartAmountInput
                                                    value={field.value ?? 0}
                                                    onChange={(val) => {
                                                        const safeVal = Math.min((val || 0), 33);
                                                        field.onChange(safeVal);
                                                        // Auto-switch mode based on interaction
                                                        if (safeVal > 0) {
                                                            if (currentTab === 'claim') form.setValue('cashback_mode', 'fixed');
                                                            if (currentTab === 'giveaway') form.setValue('cashback_mode', 'real_fixed');
                                                        }
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

                            {/* VOLUNTARY CONTENT */}
                            {currentTab === 'voluntary' && (
                                <FormField
                                    control={form.control}
                                    name="cashback_share_fixed"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500">Voluntary Contribution</FormLabel>
                                            <SmartAmountInput
                                                value={field.value ?? 0}
                                                onChange={field.onChange}
                                                placeholder="Enter amount..."
                                            />
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                * This amount is tracked but not deducted from transaction total.
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* TOTAL GIVE AWAY ROW */}
                            <div className="flex items-center justify-between p-2 bg-slate-100 rounded-md text-sm">
                                <span className="text-slate-500 font-medium">Total Give Away:</span>
                                <span className="font-bold text-slate-700">0</span>
                            </div>

                            {/* POLICY SUMMARY */}
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Match Policy:</span>
                                    <span className="font-medium">Legacy</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Applied Rate:</span>
                                    <span className="font-medium bg-slate-100 px-1 rounded">10%</span>
                                </div>
                                <div className="flex justify-between text-xs pt-1">
                                    <span className="text-amber-600 font-medium">Budget Left:</span>
                                    <span className="text-amber-600 font-bold">294,900</span>
                                </div>
                            </div>

                            {/* COLLAPSIBLE DETAILS */}
                            <div className="rounded-md border border-slate-200 bg-white p-3 space-y-2">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <Info className="w-3 h-3" /> Cashback Policy Details
                                </div>

                                <div className="grid grid-cols-2 gap-y-1 text-xs">
                                    <span className="text-slate-500">Summary:</span>
                                    <span className="text-right font-medium">Virtual • 10.0%</span>

                                    <span className="text-slate-500">Source:</span>
                                    <span className="text-right font-medium">Auto-Policy</span>

                                    <span className="text-slate-500">Reason:</span>
                                    <span className="text-right font-medium">Legacy</span>
                                </div>

                                <div className="text-[10px] text-slate-400 pt-1 flex justify-between border-t border-slate-100 mt-2">
                                    <span>Min Spend Progress:</span>
                                    <span className="text-amber-600 font-medium">333 / 3,000,000</span>
                                </div>
                            </div>
                        </div>
                    </Tabs>
                </div >
            )
            }
        </div >
    );
}
