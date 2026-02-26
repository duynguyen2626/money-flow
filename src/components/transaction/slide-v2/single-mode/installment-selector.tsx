"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CreditCard, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { SingleTransactionFormValues } from "../types";
import { Combobox, ComboboxGroup } from "@/components/ui/combobox";
import { getActiveInstallments, Installment } from "@/services/installment.service";
import { CreateInstallmentDialog } from "@/components/installments/create-installment-dialog";

export function InstallmentSelector() {
    const form = useFormContext<SingleTransactionFormValues>();
    const isInstallment = useWatch({ control: form.control, name: "is_installment" });
    const transactionType = useWatch({ control: form.control, name: "type" });
    const amount = useWatch({ control: form.control, name: "amount" });
    const note = useWatch({ control: form.control, name: "note" });

    const [installments, setInstallments] = useState<Installment[]>([]);
    const [loading, setLoading] = useState(false);

    // Unified fetch on mount to decide visibility and populate list
    const fetchInstallments = async () => {
        setLoading(true);
        try {
            const data = await getActiveInstallments();
            setInstallments(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstallments();
    }, []);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Only show for Expense, Repayment, Credit Pay, Income, or Debt
    const shouldShowByType = ['expense', 'repayment', 'credit_pay', 'income', 'debt'].includes(transactionType);

    // Don't show if type doesn't match
    if (!shouldShowByType) return null;

    const installmentGroups: ComboboxGroup[] = [
        {
            label: "Active Plans",
            items: installments.map(inst => ({
                value: inst.id,
                label: `${inst.name} (${new Intl.NumberFormat('en-US').format(inst.monthly_amount)}/mo)`,
            }))
        }
    ];

    const isIncomeType = transactionType === 'income';

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">
                            {isIncomeType ? "Plan Repayment" : "Installment"}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                            {isIncomeType ? "Debt Settlement" : "Plan Payment"}
                        </span>
                    </div>
                </div>
                <div>
                    <FormField
                        control={form.control}
                        name="is_installment"
                        render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="data-[state=checked]:bg-indigo-600"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {isInstallment && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                    <FormField
                        control={form.control}
                        name="installment_plan_id"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between mb-1">
                                    <FormLabel className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                        {isIncomeType ? "Link to Plan (Repay)" : "Link to Plan (Pay)"}
                                    </FormLabel>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                        <Combobox
                                            groups={installmentGroups}
                                            value={field.value || undefined}
                                            onValueChange={field.onChange}
                                            placeholder={isIncomeType ? "Which plan are they paying?" : "Pick an installment plan"}
                                            className="w-full h-11 bg-slate-50/50 border-slate-200 rounded-xl"
                                            isLoading={loading}
                                            onAddNew={!isIncomeType ? () => setIsCreateDialogOpen(true) : undefined}
                                            addLabel="Manual Plan"
                                        />
                                        {!isIncomeType && (
                                            <CreateInstallmentDialog
                                                open={isCreateDialogOpen}
                                                onOpenChange={setIsCreateDialogOpen}
                                                initialData={{
                                                    name: note || "",
                                                    totalAmount: amount || 0,
                                                }}
                                                trigger={<div className="hidden" />}
                                            />
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
        </div>
    );
}
