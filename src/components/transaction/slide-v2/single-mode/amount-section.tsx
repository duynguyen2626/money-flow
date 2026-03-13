"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Check, Plus, X } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { formatShortVietnameseCurrency } from "@/lib/number-to-text";
import { SingleTransactionFormValues } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AmountSection() {
  const form = useFormContext<SingleTransactionFormValues>();
  const amount = useWatch({ control: form.control, name: "amount" });
  const serviceFee = useWatch({ control: form.control, name: "service_fee" });
  const type = useWatch({ control: form.control, name: "type" });
  const isHideFee = type === "income" || type === "repayment";

  const [isFeeVisible, setIsFeeVisible] = useState<boolean>(() => {
    const existing = form.getValues("service_fee");
    return typeof existing === "number" && existing > 0;
  });

  useEffect(() => {
    if (isHideFee) {
      if ((form.getValues("service_fee") || 0) > 0) {
        form.setValue("service_fee", null, { shouldDirty: true });
      }
      setIsFeeVisible(false);
    }
  }, [form, isHideFee]);

  useEffect(() => {
    if (isHideFee) return;
    if ((Number(serviceFee) || 0) > 0) setIsFeeVisible(true);
  }, [isHideFee, serviceFee]);

  const principal = Number(amount) || 0;
  const fee = isFeeVisible ? Number(serviceFee) || 0 : 0;
  const total = principal + fee;

  const totalText = useMemo(() => {
    return new Intl.NumberFormat("vi-VN").format(total);
  }, [total]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col gap-3 p-4 rounded-2xl border-2 border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
        {/* Principal */}
        <div className="space-y-1.5">
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

        {/* Fee + Total (compact, no overlapping clear button) */}
        {!isHideFee && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-50">
            <div className="min-w-0">
              {!isFeeVisible ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFeeVisible(true)}
                  className="h-8 px-2.5 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white hover:bg-slate-50"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add Fee
                </Button>
              ) : (
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name="service_fee"
                    render={({ field }) => (
                      <FormItem className="space-y-0 w-36">
                        <FormLabel className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 truncate">
                          Service Fee
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
                            hideClearButton={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      form.setValue("service_fee", null, { shouldDirty: true });
                      setIsFeeVisible(false);
                    }}
                    className="h-10 w-10 border-slate-200 bg-white hover:bg-slate-50 shrink-0"
                    aria-label="Remove service fee"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              )}
            </div>

            <div
              className={cn(
                "rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-sm ring-1",
                fee > 0
                  ? "bg-indigo-600 text-white shadow-indigo-100 ring-indigo-100"
                  : "bg-slate-50 text-slate-700 ring-slate-100",
              )}
            >
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-widest leading-none opacity-80">
                  Total
                </span>
                <span className="text-sm font-black tabular-nums leading-none">
                  {totalText}
                </span>
              </div>
              {fee > 0 && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>
        )}

        {/* Footer conversion and Total */}
        <div className="flex items-center justify-between pt-1">
          <div className="min-w-0">
            {principal > 0 ? (
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter truncate max-w-[260px]">
                {formatShortVietnameseCurrency(principal)}
              </p>
            ) : (
              <span className="text-[9px] text-slate-300 font-bold uppercase">
                Zero amount
              </span>
            )}
          </div>
          {fee > 0 && (
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest tabular-nums">
              Fee: {new Intl.NumberFormat("vi-VN").format(fee)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
