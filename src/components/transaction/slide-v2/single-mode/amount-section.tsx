"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Plus, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function AmountSection() {
  const form = useFormContext<SingleTransactionFormValues>();
  const amount = useWatch({ control: form.control, name: "amount" });
  const serviceFee = useWatch({ control: form.control, name: "service_fee" });
  const type = useWatch({ control: form.control, name: "type" });
  const isHideFee = type === "income" || type === "repayment";
  const isCashbackExpanded = useWatch({
    control: form.control,
    name: "ui_is_cashback_expanded",
  });

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

  const totalText = useMemo(
    () => new Intl.NumberFormat("vi-VN").format(total),
    [total],
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
          <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 mb-2">
              Amount
            </p>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <SmartAmountInput
                      value={field.value}
                      onChange={field.onChange}
                      hideLabel
                      className="text-3xl font-black h-14 bg-transparent border-none focus-visible:ring-0 focus-visible:border-indigo-500 px-0"
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {!isHideFee && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                <span>Fee</span>
                {!isFeeVisible && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFeeVisible(true)}
                    className="h-7 px-2 text-[10px] font-black uppercase tracking-[0.35em] text-indigo-600"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
              {isFeeVisible && (
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="service_fee"
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-0">
                        <FormControl>
                          <SmartAmountInput
                            value={field.value || undefined}
                            onChange={field.onChange}
                            hideLabel
                            placeholder="0"
                            className="h-11 font-black bg-slate-50 border border-slate-200 rounded-lg focus-visible:border-indigo-500 focus-visible:ring-0 text-right px-2"
                            compact
                            hideCurrencyText
                            hideCalculator
                            hideClearButton
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("service_fee", null, { shouldDirty: true });
                      setIsFeeVisible(false);
                    }}
                    className="h-11 w-11 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 transition"
                    aria-label="Remove service fee"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!isFeeVisible && (
                <p className="text-[9px] text-slate-400">
                  Optional. Click Add to include a fee.
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-indigo-100 bg-indigo-600/90 text-white p-3 shadow-lg flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em]">
              <span>Total</span>
              {!isHideFee && fee > 0 && (
                <span className="text-[9px] text-indigo-100">
                  Fee: {new Intl.NumberFormat("vi-VN").format(fee)}
                </span>
              )}
            </div>
            <div className="text-2xl font-black tabular-nums leading-tight">
              {totalText}
            </div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em]">
              <span>Share cashback?</span>
              <Switch
                checked={Boolean(isCashbackExpanded)}
                onCheckedChange={(checked) =>
                  form.setValue("ui_is_cashback_expanded", checked)
                }
                className="data-[state=checked]:bg-white data-[state=checked]:text-indigo-600"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-slate-400 px-1">
          <span>
            {principal > 0
              ? formatShortVietnameseCurrency(principal)
              : "Enter amount"}
          </span>
        </div>
      </div>
    </div>
  );
}
