"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Check } from "lucide-react";
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { formatShortVietnameseCurrency } from "@/lib/number-to-text";
import { SingleTransactionFormValues } from "../types";

export function AmountSection() {
    const form = useFormContext<SingleTransactionFormValues>();
    const amount = useWatch({ control: form.control, name: "amount" });

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Amount Field */}
            <div className="space-y-1.5">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem className="space-y-1">
                            <FormControl>
                                <SmartAmountInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    hideLabel={true}
                                    className="text-3xl font-black h-16 bg-white border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all border-2"
                                    placeholder="0"
                                />
                            </FormControl>
                            {field.value ? (
                                <p className="text-[11px] font-black text-rose-600 px-2 italic uppercase tracking-wider">
                                    {formatShortVietnameseCurrency(field.value)}
                                </p>
                            ) : null}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Service Fee (Optional) */}
                <FormField
                    control={form.control}
                    name="service_fee"
                    render={({ field }) => {
                        const fee = field.value || 0;
                        const hasFee = fee > 0;
                        const totalAmount = (Number(amount) || 0) + fee;

                        return (
                            <FormItem className="space-y-0">
                                <div className="flex items-center justify-between gap-3 bg-indigo-50/50 rounded-2xl px-5 py-4 border border-dashed border-indigo-200 shadow-inner">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">FEE</div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Service Fee</span>
                                                <span className="text-[9px] text-indigo-400 font-bold uppercase">Optional surcharge</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <FormControl>
                                            <SmartAmountInput
                                                value={field.value || undefined}
                                                onChange={field.onChange}
                                                hideLabel={true}
                                                placeholder="0"
                                                className="w-32 h-10 text-sm font-black text-right bg-white border-slate-200 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                compact={true}
                                                hideCurrencyText={true}
                                                hideCalculator={true}
                                            />
                                        </FormControl>
                                        {hasFee && (
                                            <div className="flex items-center gap-3 pl-4 border-l-2 border-indigo-100">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Total Payload</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-black text-slate-900 tabular-nums leading-none">
                                                            {new Intl.NumberFormat('vi-VN').format(totalAmount)}
                                                        </span>
                                                        <div className="p-1 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm animate-in zoom-in duration-300">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        );
                    }}
                />
            </div>
        </div>
    );
}
