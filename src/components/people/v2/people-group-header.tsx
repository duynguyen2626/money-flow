"use client";

import React from "react";
import { ChevronRight, CreditCard, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoneyVND } from "@/lib/utils";

interface PeopleGroupHeaderProps {
    accountId: string;
    accountName: string;
    accountImage?: string | null;
    memberCount: number;
    totalDebt: number;
    currentCycleDebt: number;
    colSpan: number;
    isExpanded: boolean;
    onToggle: () => void;
}

export function PeopleGroupHeader({
    accountId,
    accountName,
    accountImage,
    memberCount,
    totalDebt,
    currentCycleDebt,
    colSpan,
    isExpanded,
    onToggle,
}: PeopleGroupHeaderProps) {
    const hasDebt = totalDebt > 0;

    return (
        <tr
            className="bg-slate-50 hover:bg-slate-100/80 cursor-pointer border-b border-t border-slate-200 transition-colors"
            onClick={onToggle}
        >
            <td colSpan={colSpan} className="py-2.5 px-2">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 text-slate-400">
                        <ChevronRight
                            className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                isExpanded && "rotate-90"
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                        {accountImage ? (
                            <img src={accountImage} alt={accountName} className="w-5 h-5 rounded-sm object-cover" />
                        ) : (
                            <div className="w-5 h-5 rounded-sm bg-slate-200 flex items-center justify-center text-slate-500">
                                {accountId === 'no-account' ? <Wallet className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                            </div>
                        )}
                        <span className="font-semibold text-sm text-slate-700">{accountName}</span>
                        <span className="text-xs text-slate-500 font-normal ml-1">
                            • {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </span>

                        {/* Status label instead of just account name if requested */}
                        {hasDebt && (
                            <Badge variant="destructive" className="ml-2 font-normal text-[10px] h-4 px-1.5 bg-red-100 text-red-600 hover:bg-red-200 border-none tracking-tighter">
                                Outstanding
                            </Badge>
                        )}
                    </div>

                    <div className="pr-4 flex items-center gap-4">
                        {/* Show Current Cycle Debt as the main value (following user instruction) */}
                        <div className="text-right">
                            <p className={cn("text-xs font-bold", currentCycleDebt > 0 ? "text-rose-600" : "text-slate-400")}>
                                {currentCycleDebt > 0 ? formatMoneyVND(currentCycleDebt) : '-'}
                            </p>
                        </div>

                        {/* Total indicator if different */}
                        {isExpanded && totalDebt !== currentCycleDebt && (
                            <div className="px-2 py-0.5 rounded bg-slate-200/50 flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-500 leading-none">Total</span>
                                <span className="text-[11px] font-black text-slate-700 tabular-nums">
                                    {formatMoneyVND(totalDebt)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
}

// Internal dependencies for group header (Simplified)
import { Badge } from "@/components/ui/badge";
