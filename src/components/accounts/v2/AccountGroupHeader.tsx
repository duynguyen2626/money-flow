import React from 'react';
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountGroupHeaderProps {
    section: 'credit' | 'loans' | 'savings' | 'banks' | 'investments';
    label: string;
    accountCount: number;
    totalAmount: number | { debt: number; limit: number };
    isExpanded: boolean;
    onToggle: () => void;
}

export function AccountGroupHeader({
    section,
    label,
    accountCount,
    totalAmount,
    isExpanded,
    onToggle,
}: AccountGroupHeaderProps) {
    const formatMoney = (amount: number) => {
        if (amount === 0) return '-';
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    return (
        <tr
            className={cn(
                "group-header-row cursor-pointer transition-colors border-b select-none",
                section === 'credit' && "bg-indigo-50/50 hover:bg-indigo-50",
                section === 'loans' && "bg-rose-50/50 hover:bg-rose-50",
                section === 'banks' && "bg-blue-50/50 hover:bg-blue-50",
                section === 'investments' && "bg-sky-50/50 hover:bg-sky-50",
                section === 'savings' && "bg-white hover:bg-slate-50"
            )}
            onClick={onToggle}
        >
            <td colSpan={13} className="px-3 py-2">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center justify-center h-5 w-5 rounded transition-transform duration-200",
                        !isExpanded && "-rotate-90"
                    )}>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[11px] font-black uppercase tracking-widest",
                            section === 'credit' && "text-indigo-700",
                            section === 'loans' && "text-rose-700",
                            section === 'banks' && "text-blue-700",
                            section === 'investments' && "text-sky-700",
                            section === 'savings' && "text-slate-600"
                        )}>
                            {label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 rounded-full bg-white/50 border border-slate-100">
                            {accountCount}
                        </span>
                    </div>

                    <div className="ml-auto flex items-center gap-4">
                        {section === 'credit' && typeof totalAmount === 'object' && (
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end gap-0.5">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black tabular-nums">
                                        <span className="text-indigo-600">{formatMoney(totalAmount.debt)}</span>
                                        <span className="text-slate-300">/</span>
                                        <span className="text-slate-400">{formatMoney(totalAmount.limit)}</span>
                                    </div>
                                    <div className="w-24 h-1 bg-indigo-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${Math.min(100, (totalAmount.debt / (totalAmount.limit || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                {section === 'credit' ? 'Total Debt' : 'Total Balance'}
                            </span>
                            <span className={cn(
                                "text-xs font-black tabular-nums",
                                section === 'credit' && "text-indigo-600",
                                section === 'loans' && "text-rose-600",
                                section === 'banks' && "text-blue-600",
                                section === 'investments' && "text-sky-600",
                                section === 'savings' && "text-emerald-600"
                            )}>
                                {formatMoney(typeof totalAmount === 'number' ? totalAmount : totalAmount.debt)}
                            </span>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    );
}
