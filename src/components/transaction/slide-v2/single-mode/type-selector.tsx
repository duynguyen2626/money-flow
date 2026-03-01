"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { RefreshCcw, ArrowRightLeft, PiggyBank, ArrowUpRight, ArrowDownLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { SingleTransactionFormValues } from "../types";
import { Account, Person } from "@/types/moneyflow.types";
import { toast } from "sonner";

export function TransactionTypeSelector({ accounts, people }: { accounts: Account[], people: Person[] }) {
    const form = useFormContext<SingleTransactionFormValues>();
    const type = useWatch({ control: form.control, name: "type" });
    const personId = useWatch({ control: form.control, name: "person_id" });
    const sourceId = useWatch({ control: form.control, name: "source_account_id" });
    const targetId = useWatch({ control: form.control, name: "target_account_id" });
    const params = useParams();
    const currentAccountId = params?.id as string | undefined;

    const selectedPerson = people?.find(p => p.id === personId);
    const isIncomeFlow = !sourceId && !!targetId;
    const isExpenseFlow = !!sourceId && !targetId;
    const isTransferFlow = ['transfer', 'credit_pay', 'invest'].includes(type) || (!!sourceId && !!targetId);

    // Helper to switch types safely
    const setMode = (mode: 'transfer' | 'credit_pay' | 'expense' | 'invest') => {
        if (!!personId) {
            toast.error("Special modes disabled when person is involved", {
                position: "top-right",
                className: "bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest border-none shadow-xl",
            });
            return;
        }

        const newType = type === mode ? 'expense' : mode;
        form.setValue('type', newType);

        if (newType === 'credit_pay' && currentAccountId) {
            form.setValue('target_account_id', currentAccountId);
            form.setValue('source_account_id', undefined as any);
        }
    };

    return (
        <div className="space-y-3 p-3 rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-3 gap-2">
                {/* Transfer Mode Button */}
                <button
                    type="button"
                    onClick={() => setMode('transfer')}
                    className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border transition-all text-left group",
                        type === 'transfer'
                            ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-100 ring-2 ring-blue-100"
                            : "bg-slate-50 border-slate-200/50 border-dashed hover:bg-slate-100 hover:border-slate-300",
                        !!personId && "opacity-40 cursor-not-allowed grayscale"
                    )}
                >
                    <div className={cn(
                        "w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-colors",
                        type === 'transfer' ? "bg-white/20 text-white" : "bg-white text-slate-400 border border-slate-100 shadow-sm"
                    )}>
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tight block truncate leading-none",
                            type === 'transfer' ? "text-white" : "text-slate-800"
                        )}>Transfer</span>
                        <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest block truncate leading-none mt-0.5",
                            type === 'transfer' ? "text-blue-100" : "text-slate-400"
                        )}>Internal</span>
                    </div>
                </button>

                {/* Card Payment Mode Button */}
                <button
                    type="button"
                    onClick={() => setMode('credit_pay')}
                    className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border transition-all text-left group",
                        type === 'credit_pay'
                            ? "bg-violet-600 border-violet-600 shadow-lg shadow-violet-100 ring-2 ring-violet-100"
                            : "bg-slate-50 border-slate-200/50 border-dashed hover:bg-slate-100 hover:border-slate-300",
                        !!personId && "opacity-40 cursor-not-allowed grayscale"
                    )}
                >
                    <div className={cn(
                        "w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-colors",
                        type === 'credit_pay' ? "bg-white/20 text-white" : "bg-white text-slate-400 border border-slate-100 shadow-sm"
                    )}>
                        <RefreshCcw className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tight block truncate leading-none",
                            type === 'credit_pay' ? "text-white" : "text-slate-800"
                        )}>Card Pay</span>
                        <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest block truncate leading-none mt-0.5",
                            type === 'credit_pay' ? "text-violet-100" : "text-slate-400"
                        )}>Repay</span>
                    </div>
                </button>

                {/* Invest Mode Button */}
                <button
                    type="button"
                    onClick={() => setMode('invest')}
                    className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border transition-all text-left group",
                        type === 'invest'
                            ? "bg-sky-600 border-sky-600 shadow-lg shadow-sky-100 ring-2 ring-sky-100"
                            : "bg-slate-50 border-slate-200/50 border-dashed hover:bg-slate-100 hover:border-slate-300",
                        !!personId && "opacity-40 cursor-not-allowed grayscale"
                    )}
                >
                    <div className={cn(
                        "w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-colors",
                        type === 'invest' ? "bg-white/20 text-white" : "bg-white text-slate-400 border border-slate-100 shadow-sm"
                    )}>
                        <PiggyBank className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tight block truncate leading-none",
                            type === 'invest' ? "text-white" : "text-slate-800"
                        )}>Invest</span>
                        <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest block truncate leading-none mt-0.5",
                            type === 'invest' ? "text-sky-100" : "text-slate-400"
                        )}>Assets</span>
                    </div>
                </button>
            </div>

            {/* Automated Flow Summary Container */}
            <div className="bg-slate-50 rounded-xl p-2.5 flex items-start gap-3 transition-all overflow-hidden border border-slate-200/80">
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm transition-all duration-500",
                    type === 'invest' ? "bg-sky-600 text-white border-sky-700 shadow-sky-100" :
                        type === 'credit_pay' ? "bg-violet-600 text-white border-violet-700 shadow-violet-100" :
                            type === 'transfer' || (!!sourceId && !!targetId) ? "bg-blue-500 text-white border-blue-600 shadow-blue-100" :
                                isIncomeFlow ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-100" :
                                    isExpenseFlow ? "bg-rose-500 text-white border-rose-600 shadow-rose-100" :
                                        "bg-white text-slate-400 border-slate-200"
                )}>
                    {type === 'invest' ? <PiggyBank className="w-5 h-5 animate-pulse" /> :
                        type === 'credit_pay' ? <RefreshCcw className="w-5 h-5 animate-spin-slow" /> :
                            type === 'transfer' || (!!sourceId && !!targetId) ? <ArrowRightLeft className="w-5 h-5" /> :
                                isIncomeFlow ? <ArrowUpRight className="w-5 h-5 animate-pulse" /> :
                                    isExpenseFlow ? <ArrowDownLeft className="w-5 h-5 animate-pulse" /> :
                                        <User className="w-5 h-5" />}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Automated Flow Summary</span>
                    <p className="text-[10px] text-slate-600 leading-snug font-bold">
                        {type === 'credit_pay' ? (
                            sourceId && targetId ? "Card Repayment Match: Moving funds to settle credit debt." : "Card Repayment Mode: Please choose source bank and target credit card."
                        ) : type === 'invest' ? (
                            sourceId && targetId ? "Investment Match: Securing funds into asset accounts." : "Invest Mode: Please choose funding source and target asset."
                        ) : isTransferFlow ? (
                            sourceId && targetId ? "Internal Transfer: Moving funds between your own assets." : "Transfer Mode: Please select both source and destination accounts."
                        ) : isIncomeFlow ? (
                            personId ? `Repayment Flow: ${selectedPerson?.name} is paying you back into ${accounts.find(a => a.id === targetId)?.name}.` :
                                `Income Flow: Receiving funds into ${accounts.find(a => a.id === targetId)?.name}.`
                        ) : isExpenseFlow ? (
                            personId ? `Lending Flow: You are lending to ${selectedPerson?.name} from ${accounts.find(a => a.id === sourceId)?.name}.` :
                                `Expense Flow: Paying from ${accounts.find(a => a.id === sourceId)?.name}.`
                        ) : (
                            "Intelligent Transaction Flow: Start by picking an account or person."
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
