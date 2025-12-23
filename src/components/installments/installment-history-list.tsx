"use client";

import { useEffect, useState } from "react";
import { getInstallmentRepayments } from "@/services/installment.service";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function InstallmentHistoryList({ planId }: { planId: string }) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getInstallmentRepayments(planId).then((data) => {
            setTransactions(data || []);
            setLoading(false);
        });
    }, [planId]);

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>;
    }

    if (!transactions || transactions.length === 0) {
        return <div className="text-sm text-slate-500 italic">No payments recorded yet.</div>;
    }

    return (
        <div className="space-y-3">
            {transactions.map((txn: any) => (
                <div key={txn.id} className="flex items-center justify-between p-2 rounded-md border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${txn.type === 'expense' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {txn.type === 'expense' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-slate-900">{format(new Date(txn.occurred_at), "dd/MM/yyyy")}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{txn.note || "Payment"}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold font-mono text-slate-900">{formatCurrency(txn.amount)}</p>
                        <p className="text-[10px] text-slate-400">by {txn.profiles?.name || "Unknown"}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
