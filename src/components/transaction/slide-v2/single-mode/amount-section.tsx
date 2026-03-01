"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Check, Plus } from "lucide-react";
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    FormLabel
} from "@/components/ui/form";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { formatShortVietnameseCurrency } from "@/lib/number-to-text";
import { SingleTransactionFormValues } from "../types";
import { cn } from "@/lib/utils";

export function AmountSection() {
    const form = useFormContext<SingleTransactionFormValues>();
    const amount = useWatch({ control: form.control, name: "amount" });
    const type = useWatch({ control: form.control, name: "type" });
    const isHideFee = type === 'income' || type === 'repayment';

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-3 p-4 rounded-2xl border-2 border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
                <div className="flex items-end gap-3 h-full">
                    {/* Main Amount */}
                    <div className="flex-1 space-y-1.5">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem className="space-y-0">
                                    <FormLabel className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 opacity-70">
                                        Principal Amount
                                    </FormLabel>
                                    <FormControl>
                                        <SmartAmountInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            hideLabel={true}
                                            className="text-3xl font-black h-14 bg-white border-slate-100 shadow-none focus-visible:ring-0 focus-visible:border-indigo-500 transition-all p-0 border-none"
                                            placeholder="0"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Service Fee Integrated */}
                    {!isHideFee && (
                        <div className="flex items-center gap-2 pb-2">
                            <div className="h-8 w-px bg-slate-100 mx-1 shrink-0" />
                            <FormField
                                control={form.control}
                                name="service_fee"
                                render={({ field }) => (
                                    <FormItem className="space-y-0 w-28">
                                        <FormLabel className="flex items-center gap-1 text-[9px] font-black text-indigo-400 uppercase tracking-tighter mb-1 truncate">
                                            + Service Fee
                                        </FormLabel>
                                        <FormControl>
                                            <SmartAmountInput
                                                value={field.value || undefined}
                                                onChange={field.onChange}
                                                hideLabel={true}
                                                placeholder="0"
                                                className="h-10 text-lg font-black bg-slate-50/50 border-transparent focus-visible:border-indigo-200 focus-visible:bg-white transition-all text-right px-2"
                                                compact={true}
                                                hideCurrencyText={true}
                                                hideCalculator={true}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                </div>

                {/* Footer conversion and Total */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex flex-col">
                        {amount ? (
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter truncate max-w-[200px]">
                                {formatShortVietnameseCurrency(amount)}
                            </p>
                        ) : (
                            <span className="text-[9px] text-slate-300 font-bold uppercase">Zero amount</span>
                        )}
                    </div>

                    {!isHideFee && (form.getValues("service_fee") || 0) > 0 && (
                        <div className="bg-indigo-600 text-white rounded-lg px-2.5 py-1.5 flex items-center gap-2 animate-in zoom-in duration-300 shadow-lg shadow-indigo-100">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black uppercase tracking-widest leading-none opacity-80">Total</span>
                                <span className="text-sm font-black tabular-nums leading-none">
                                    {new Intl.NumberFormat('vi-VN').format((Number(amount) || 0) + (Number(form.getValues("service_fee")) || 0))}
                                </span>
                            </div>
                            <Check className="w-3.5 h-3.5" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
