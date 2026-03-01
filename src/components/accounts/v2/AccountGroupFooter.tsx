import React from 'react';
import { cn } from "@/lib/utils";

interface AccountGroupFooterProps {
    section: 'credit' | 'loans' | 'savings' | 'banks' | 'investments';
    accountCount: number;
    totalAmount: number;
}

export function AccountGroupFooter({
    section,
    accountCount,
    totalAmount,
}: AccountGroupFooterProps) {
    const formatMoney = (amount: number) => {
        if (amount === 0) return '-';
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    return (
        <tr className={cn(
            "group-footer-row border-b",
            section === 'credit' && "bg-indigo-50/20",
            section === 'loans' && "bg-rose-50/20",
            section === 'banks' && "bg-blue-50/20",
            section === 'investments' && "bg-sky-50/20",
            section === 'savings' && "bg-slate-50/20"
        )}>
            <td colSpan={13} className="px-4 py-2">
                <div className="flex items-center justify-end gap-6">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Count</span>
                        <span className="text-xs font-bold text-slate-600">{accountCount} account{accountCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Group Sum</span>
                        <span className={cn(
                            "text-sm font-black tabular-nums",
                            section === 'credit' && "text-indigo-700",
                            section === 'loans' && "text-rose-700",
                            section === 'banks' && "text-blue-700",
                            section === 'investments' && "text-sky-700",
                            section === 'savings' && "text-emerald-700"
                        )}>
                            {formatMoney(totalAmount)}
                        </span>
                    </div>
                </div>
            </td>
        </tr>
    );
}
