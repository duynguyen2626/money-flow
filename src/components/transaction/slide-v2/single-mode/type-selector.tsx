"use client";

import React, { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { RefreshCcw, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { SingleTransactionFormValues } from "../types";
import { toast } from "sonner";

export function TransactionTypeSelector() {
    const form = useFormContext<SingleTransactionFormValues>();
    const type = useWatch({ control: form.control, name: "type" });
    const personId = useWatch({ control: form.control, name: "person_id" });

    // Helper to switch types safely
    const setMode = (mode: 'transfer' | 'credit_pay' | 'expense') => {
        form.setValue('type', mode);
        // If switching to a special mode, we might want to preserve some fields but reset others
        // for now just changing the type is enough as labels will update.
    };

    return (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 grid grid-cols-2 gap-3">
            {/* Transfer Mode Toggle */}
            <div className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all",
                type === 'transfer' ? "bg-blue-50/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-200/50 border-dashed"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        type === 'transfer' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400 border border-slate-100"
                    )}>
                        <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight block">Transfer</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Internal Flow</span>
                    </div>
                </div>
                <div
                    className="relative cursor-pointer"
                    onClick={(e) => {
                        if (!!personId) {
                            e.preventDefault();
                            e.stopPropagation();
                            toast.error("Special modes disabled when person is involved", {
                                position: "top-right",
                                className: "bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest border-none shadow-xl",
                            });
                        }
                    }}
                >
                    <Switch
                        checked={type === 'transfer'}
                        disabled={!!personId}
                        onCheckedChange={(checked) => setMode(checked ? 'transfer' : 'expense')}
                        className={cn(
                            "data-[state=checked]:bg-blue-600 scale-90",
                            !!personId && "pointer-events-none"
                        )}
                    />
                </div>
            </div>

            {/* Card Payment Mode Toggle */}
            <div className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all",
                type === 'credit_pay' ? "bg-violet-50/50 border-violet-200 shadow-sm" : "bg-slate-50/50 border-slate-200/50 border-dashed"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        type === 'credit_pay' ? "bg-violet-600 text-white shadow-lg shadow-violet-200" : "bg-white text-slate-400 border border-slate-100"
                    )}>
                        <RefreshCcw className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight block">Card Pay</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Debt Settlement</span>
                    </div>
                </div>
                <div
                    className="relative cursor-pointer"
                    onClick={(e) => {
                        if (!!personId) {
                            e.preventDefault();
                            e.stopPropagation();
                            toast.error("Special modes disabled when person is involved", {
                                position: "top-right",
                                className: "bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest border-none shadow-xl",
                            });
                        }
                    }}
                >
                    <Switch
                        checked={type === 'credit_pay'}
                        disabled={!!personId}
                        onCheckedChange={(checked) => setMode(checked ? 'credit_pay' : 'expense')}
                        className={cn(
                            "data-[state=checked]:bg-violet-600 scale-90",
                            !!personId && "pointer-events-none"
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
