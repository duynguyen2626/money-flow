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

type CashbackSectionProps = {
    accounts?: Account[];
};

export function CashbackSection({ accounts }: CashbackSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const isExpanded = useWatch({ control: form.control, name: "ui_is_cashback_expanded" });
    const cashbackMode = useWatch({ control: form.control, name: "cashback_mode" });

    const transactionType = useWatch({ control: form.control, name: "type" });
    const sourceAccountId = useWatch({ control: form.control, name: "source_account_id" });

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
        if (['real_percent', 'real_fixed'].includes(mode)) return 'real';
        if (mode === 'voluntary') return 'voluntary';
        return 'virtual'; // 'none_back', 'percent', 'fixed'
    };

    // Default to 'percent' if switching to virtual, 'real_percent' for real
    const handleTabChange = (val: string) => {
        if (val === 'virtual') form.setValue('cashback_mode', 'percent');
        if (val === 'real') form.setValue('cashback_mode', 'real_percent');
        if (val === 'voluntary') form.setValue('cashback_mode', 'voluntary');
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
                            <TabsTrigger value="virtual" className="text-xs">Virtual (Auto)</TabsTrigger>
                            <TabsTrigger value="real" className="text-xs">Real (Claimed)</TabsTrigger>
                            <TabsTrigger value="voluntary" className="text-xs">Voluntary</TabsTrigger>
                        </TabsList>

                        {/* VIRTUAL & REAL CONTENT (Shared Layout) */}
                        <div className="space-y-4">
                            {/* Row 1: Rate & Amount Inputs */}
                            {(currentTab === 'virtual' || currentTab === 'real') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="cashback_share_percent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <FormLabel className="text-xs font-semibold text-slate-500">% Rate</FormLabel>
                                                    <span className="text-[10px] text-slate-400">Max: 10%</span>
                                                </div>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            let val = Number(e.target.value);
                                                            if (val > 10) {
                                                                toast.warning("Rate cannot exceed 10%");
                                                                val = 10;
                                                            }
                                                            field.onChange(val);
                                                            // Auto-switch mode based on interaction
                                                            if (currentTab === 'virtual') form.setValue('cashback_mode', 'percent');
                                                            if (currentTab === 'real') form.setValue('cashback_mode', 'real_percent');
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
                                                            if (currentTab === 'virtual') form.setValue('cashback_mode', 'fixed');
                                                            if (currentTab === 'real') form.setValue('cashback_mode', 'real_fixed');
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
                </div>
            )}
        </div>
    );
}
