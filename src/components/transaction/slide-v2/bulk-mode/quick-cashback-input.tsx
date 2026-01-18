"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Percent, X, Info } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Account } from "@/types/moneyflow.types";
import { calculateStatementCycle } from "@/lib/cycle-utils";
import { format } from "date-fns";

type QuickCashbackInputProps = {
    index: number;
    accounts: Account[];
};
export function QuickCashbackInput({ index, accounts }: QuickCashbackInputProps) {
    const form = useFormContext();
    const basePath = `rows.${index}`;

    const mode = useWatch({ control: form.control, name: `${basePath}.cashback_mode` });
    const percent = useWatch({ control: form.control, name: `${basePath}.cashback_share_percent` });
    const fixed = useWatch({ control: form.control, name: `${basePath}.cashback_share_fixed` });

    const globalDate = useWatch({ control: form.control, name: 'occurred_at' });
    const rowSourceAccountId = useWatch({ control: form.control, name: `${basePath}.source_account_id` });
    const defaultSourceAccountId = useWatch({ control: form.control, name: 'default_source_account_id' });

    const effectiveSourceAccountId = rowSourceAccountId || defaultSourceAccountId;

    let cycleInfo = null;
    if (effectiveSourceAccountId && globalDate) {
        const acc = accounts?.find(a => a.id === effectiveSourceAccountId);
        if (acc?.credit_card_info?.statement_day) {
            cycleInfo = calculateStatementCycle(new Date(globalDate), acc.credit_card_info.statement_day);
        }
    }

    // Helper to get display text
    const getButtonLabel = () => {
        if (mode === 'none_back') return <span className="text-slate-400">Add Cashback</span>;
        if (mode === 'percent') return <span className="text-amber-700 font-medium">{percent}% Back</span>;
        if (mode === 'fixed') return <span className="text-amber-700 font-medium">Fix Back</span>;
        if (mode === 'real_percent') return <span className="text-green-600 font-medium">Real {percent}%</span>;
        if (mode === 'real_fixed') return <span className="text-green-600 font-medium">Real Fix</span>;
        if (mode === 'voluntary') return <span className="text-blue-600 font-medium">Voluntary</span>;
        return <span>Cashback</span>;
    };

    // Derive active Tab from mode
    const getTabFromMode = (m: string) => {
        if (['real_percent', 'real_fixed'].includes(m)) return 'real';
        if (m === 'voluntary') return 'voluntary';
        return 'virtual'; // 'none_back', 'percent', 'fixed'
    };

    const currentTab = getTabFromMode(mode);

    // Handle tab switching default values
    const handleTabChange = (val: string) => {
        if (val === 'virtual') form.setValue(`${basePath}.cashback_mode`, 'percent');
        if (val === 'real') form.setValue(`${basePath}.cashback_mode`, 'real_percent');
        if (val === 'voluntary') form.setValue(`${basePath}.cashback_mode`, 'voluntary');
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 px-2 text-xs w-[110px] justify-center transition-all",
                        mode === 'none_back' && "border border-dashed text-slate-500 hover:bg-slate-50",
                        mode.includes('percent') && "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200",
                        (mode.includes('real') || mode === 'real_fixed') && "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200",
                        mode === 'voluntary' && "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                    )}
                >
                    {getButtonLabel()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-lg border-slate-100" align="end">
                {/* Header with Cycle Info */}
                <div className="px-3 py-2 border-b bg-slate-50 flex justify-between items-center rounded-t-md">
                    <span className="text-xs font-semibold text-slate-700">Cashback</span>
                    {cycleInfo && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium border border-blue-200">
                            {format(cycleInfo.start, "dd/MM")} - {format(cycleInfo.end, "dd/MM")}
                        </span>
                    )}
                </div>
                <div className="p-3">
                    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-9 bg-slate-100 p-1 rounded-lg mb-4">
                            <TabsTrigger value="virtual" className="text-[10px] h-7 px-0 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Virtual</TabsTrigger>
                            <TabsTrigger value="real" className="text-[10px] h-7 px-0 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Real</TabsTrigger>
                            <TabsTrigger value="voluntary" className="text-[10px] h-7 px-0 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Voluntary</TabsTrigger>
                        </TabsList>

                        {/* VIRTUAL & REAL CONTENT */}
                        {(currentTab === 'virtual' || currentTab === 'real') && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name={`${basePath}.cashback_share_percent`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center mb-1">
                                                    <FormLabel className="text-[10px] font-semibold text-slate-500">% Rate</FormLabel>
                                                    <span className="text-[10px] text-slate-400">Max: 10%</span>
                                                </div>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        {...field}
                                                        onChange={e => {
                                                            const val = Math.min(Number(e.target.value), 10);
                                                            field.onChange(val);
                                                            if (currentTab === 'virtual') form.setValue(`${basePath}.cashback_mode`, 'percent');
                                                            if (currentTab === 'real') form.setValue(`${basePath}.cashback_mode`, 'real_percent');
                                                        }}
                                                        className={cn(
                                                            "pr-6 h-8 text-xs text-right",
                                                            (mode.includes('percent')) ? "border-amber-500 ring-1 ring-amber-500" : ""
                                                        )}
                                                    />
                                                    <Percent className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name={`${basePath}.cashback_share_fixed`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center mb-1">
                                                    <FormLabel className="text-[10px] font-semibold text-slate-500">Fixed</FormLabel>
                                                    <span className="text-[10px] text-slate-400">Max: 33</span>
                                                </div>
                                                <SmartAmountInput
                                                    value={field.value ?? 0}
                                                    onChange={(val) => {
                                                        const safeVal = Math.min((val || 0), 33);
                                                        field.onChange(safeVal);
                                                        if (safeVal > 0) {
                                                            if (currentTab === 'virtual') form.setValue(`${basePath}.cashback_mode`, 'fixed');
                                                            if (currentTab === 'real') form.setValue(`${basePath}.cashback_mode`, 'real_fixed');
                                                        }
                                                    }}
                                                    placeholder="0"
                                                    hideLabel
                                                    className={cn(
                                                        "h-8 text-xs",
                                                        (mode.includes('fixed')) ? "border-amber-500 ring-1 ring-amber-500" : ""
                                                    )}
                                                />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {cycleInfo && (
                                    <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-500 mt-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Info className="w-3 h-3" />
                                            <span className="font-semibold">Info</span>
                                        </div>
                                        <p>Cycle: <span className="font-mono bg-white px-1 border rounded relative group cursor-help">
                                            {format(cycleInfo.start, 'dd/MM')} - {format(cycleInfo.end, 'dd/MM')}
                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none mb-1 z-50">
                                                Statement Date: {format(cycleInfo.end, 'dd/MM/yyyy')}
                                            </span>
                                        </span></p>
                                    </div>
                                )}
                            </div>
                        )}



                        {/* HINT / SUMMARY SECTION (Visual Only) */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                            {/* Summary Stats */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Match Policy:</span>
                                    <span className="font-medium text-slate-700">Legacy</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Applied Rate:</span>
                                    <span className="font-medium bg-slate-50 px-1 rounded text-slate-700">10%</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-amber-600 font-medium">Budget Left:</span>
                                    <span className="text-amber-600 font-bold">294,900</span>
                                </div>
                            </div>

                            {/* Collapsible Details (Static Open) */}
                            <div className="rounded-md border border-slate-100 bg-slate-50/50 p-2 space-y-1.5">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <Info className="w-3 h-3" /> Policy Details
                                </div>
                                <div className="grid grid-cols-2 gap-y-1 text-[10px]">
                                    <span className="text-slate-400">Summary:</span>
                                    <span className="text-right font-medium text-slate-600">Virtual • 10.0%</span>
                                    <span className="text-slate-400">Source:</span>
                                    <span className="text-right font-medium text-slate-600">Auto-Policy</span>
                                    <span className="text-slate-400">Reason:</span>
                                    <span className="text-right font-medium text-slate-600">Legacy</span>
                                </div>
                                <div className="pt-1 mt-1 border-t border-slate-200 flex justify-between text-[10px] text-amber-600">
                                    <span>Min Spend:</span>
                                    <span className="font-medium">333 / 3,000,000</span>
                                </div>
                            </div>
                        </div>

                        {/* VOLUNTARY CONTENT (Existing placeholder or moved) */}
                        {currentTab === 'voluntary' && (
                            <FormField
                                control={form.control}
                                name={`${basePath}.cashback_share_fixed`}
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] font-semibold text-slate-500">Contribution</FormLabel>
                                        </div>
                                        <SmartAmountInput
                                            value={field.value ?? 0}
                                            onChange={field.onChange}
                                            placeholder="Enter amount..."
                                            hideLabel
                                            className="h-8 text-xs"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Tracked but not deducted from total.
                                        </p>
                                    </FormItem>
                                )}
                            />
                        )}
                    </Tabs>
                </div>
            </PopoverContent >
        </Popover >
    );
}
