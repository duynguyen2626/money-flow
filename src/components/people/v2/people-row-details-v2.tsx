import React, { useEffect, useState } from 'react';
import { Person, TransactionWithDetails } from "@/types/moneyflow.types";
import { Badge } from "@/components/ui/badge";
import { loadTransactions } from "@/services/transaction.service"; // This is use server, so we can call it in a server action or a client-side wrapper.
import { formatMoneyVND, cn } from "@/lib/utils";
import {
    ExternalLink, CreditCard, Receipt, TrendingDown, TrendingUp,
    HandCoins, Banknote, History, ArrowRight, Pencil, Files
} from "lucide-react";
import Link from 'next/link';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";


interface PeopleRowDetailsProps {
    person: Person;
    isExpanded: boolean;
}

export function PeopleRowDetailsV2({ person, isExpanded }: PeopleRowDetailsProps) {
    const [recentTxns, setRecentTxns] = useState<TransactionWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isExpanded) {
            fetchRecent();
        }
    }, [isExpanded, person.id]);

    const fetchRecent = async () => {
        setIsLoading(true);
        try {
            const txns = await loadTransactions({
                personId: person.id,
                limit: 4 // Reduced to 4 to fit better
            });
            setRecentTxns(txns);
        } catch (error) {
            console.error("Failed to load recent transactions", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isExpanded) return null;

    const totalOutstanding = (person.current_cycle_debt || 0) + (person.outstanding_debt || 0);

    return (
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Column 1: Profile & Subscriptions */}
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Member Profiles</h4>
                            <div className="flex flex-col gap-2">
                                <TooltipProvider>
                                    {person.google_sheet_url && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <a
                                                    href={person.google_sheet_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 px-2 py-1 rounded w-fit"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Google Sheet Link
                                                </a>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Open Google Sheet in new tab</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </TooltipProvider>
                                <Link
                                    href={`/people/${person.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 px-2 py-1 rounded w-fit"
                                >
                                    <ArrowRight className="h-3 w-3" />
                                    Full Details Page
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Active Services</h4>
                        {person.subscription_details && person.subscription_details.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {person.subscription_details.map((sub, idx) => (
                                    <div key={`${sub.id}-${idx}`} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                                        {sub.image_url ? (
                                            <img src={sub.image_url} alt="" className="w-4 h-4 rounded-sm object-cover" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-sm bg-indigo-50 flex items-center justify-center">
                                                <CreditCard className="h-2 w-2 text-indigo-500" />
                                            </div>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-700">{sub.name}</span>
                                        <Badge variant="outline" className="h-3.5 px-1 text-[9px] border-indigo-100 bg-indigo-50 text-indigo-600 font-black">
                                            x{sub.slots}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">No active subscriptions</p>
                        )}
                    </div>
                </div>

                {/* Column 2: Financial Summary */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                    <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Financial Breakdown</h4>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded bg-amber-50 flex items-center justify-center">
                                    <Receipt className="h-3 w-3 text-amber-600" />
                                </div>
                                <span className="text-xs font-medium text-slate-600">Current Cycle</span>
                                {person.current_cycle_label && (
                                    <span className="text-[9px] px-1 bg-amber-50 text-amber-600 rounded font-bold">{person.current_cycle_label}</span>
                                )}
                            </div>
                            <span className="text-sm font-bold text-slate-900">{formatMoneyVND(person.current_cycle_debt || 0)} ₫</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded bg-slate-50 flex items-center justify-center">
                                    <History className="h-3 w-3 text-slate-500" />
                                </div>
                                <span className="text-xs font-medium text-slate-600">Previous Debt</span>
                            </div>
                            <span className="text-sm font-bold text-slate-500">{formatMoneyVND(person.outstanding_debt || 0)} ₫</span>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                            <span className="text-xs font-black text-slate-900">Total Outstanding</span>
                            <div className="text-right">
                                <span className={cn(
                                    "text-lg font-black tracking-tight",
                                    totalOutstanding > 0 ? "text-rose-600" : "text-emerald-600"
                                )}>
                                    {formatMoneyVND(totalOutstanding)} ₫
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Recent Activity */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Recent Activity</h4>
                        {recentTxns.length > 0 && (
                            <Link
                                href={`/people/${person.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-blue-600 hover:underline"
                            >
                                View All
                            </Link>
                        )}
                    </div>

                    <div className="space-y-1.5 grayscale-[0.5] opacity-90">
                        {isLoading ? (
                            <div className="flex flex-col gap-2">
                                {[1, 2, 3].map(i => <div key={i} className="h-10 w-full bg-slate-200/50 animate-pulse rounded" />)}
                            </div>
                        ) : recentTxns.length > 0 ? (
                            recentTxns.map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between p-2 rounded bg-white border border-slate-100/50 hover:bg-slate-50 transition-colors group/txn">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={cn(
                                            "w-7 h-7 rounded flex items-center justify-center shrink-0",
                                            txn.type === 'repayment' ? "bg-emerald-50" : "bg-rose-50"
                                        )}>
                                            {txn.type === 'repayment' ? (
                                                <TrendingDown className="h-3 w-3 text-emerald-600" />
                                            ) : (
                                                <TrendingUp className="h-3 w-3 text-rose-600" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-bold text-slate-700 truncate leading-tight">
                                                {txn.note || txn.shop_name || txn.category_name || 'No note'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-slate-400 font-medium shrink-0">
                                                    {new Date(txn.occurred_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/txn:opacity-100 transition-opacity">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <History className="h-2.5 w-2.5 text-slate-400 hover:text-blue-500 cursor-pointer" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>History</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Pencil className="h-2.5 w-2.5 text-slate-400 hover:text-blue-500 cursor-pointer" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Files className="h-2.5 w-2.5 text-slate-400 hover:text-blue-500 cursor-pointer" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>Clone</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black tabular-nums",
                                        txn.type === 'repayment' ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {formatMoneyVND(Math.abs(txn.amount))}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center bg-white border border-dashed border-slate-200 rounded">
                                <p className="text-xs text-slate-400">No recent transactions</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
