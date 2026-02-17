"use client"

import React, { useMemo, useEffect, useState } from 'react';
import { Account } from "@/types/moneyflow.types";
import { CalendarClock, Target, History, Landmark, CreditCard, ChevronRight } from "lucide-react";
import { cn, formatMoneyVND } from "@/lib/utils";
import { VietnameseCurrency } from "@/components/ui/vietnamese-currency";

interface AccountInsightsProps {
    accounts: Account[];
    lastTxnAccountId?: string | null;
}

export function AccountInsights({ accounts, lastTxnAccountId }: AccountInsightsProps) {
    const activeAccounts = useMemo(() => accounts.filter(a => a.is_active !== false), [accounts]);

    const insights = useMemo(() => {
        // 1. Recent Added (Transaction-wise)
        const recentAccount = lastTxnAccountId
            ? activeAccounts.find(a => a.id === lastTxnAccountId)
            : null;

        // 2. Due Soonest
        const dueSoonest = activeAccounts
            .filter(a => (a.type === 'credit_card' || a.type === 'debt') && a.stats?.due_date)
            .sort((a, b) => new Date(a.stats!.due_date!).getTime() - new Date(b.stats!.due_date!).getTime())[0];

        // 3. Needs Spend More (Top 2) - Cashback Targets
        const needsSpendMore = activeAccounts
            .filter(a => {
                const spent = a.stats?.spent_this_cycle || 0;
                const target = a.cb_min_spend || a.stats?.min_spend || 0;
                return target > 0 && spent < target;
            })
            .sort((a, b) => {
                const remA = (a.cb_min_spend || a.stats?.min_spend || 0) - (a.stats?.spent_this_cycle || 0);
                const remB = (b.cb_min_spend || b.stats?.min_spend || 0) - (b.stats?.spent_this_cycle || 0);
                return remB - remA;
            })
            .slice(0, 2);

        // 4. Annual Fee Waivers
        const needsWaiver = activeAccounts
            .filter(a => {
                const target = a.stats?.annual_fee_waiver_target || 0;
                const spent = a.stats?.spent_this_cycle || 0;
                return target > 0 && spent < target;
            })
            .sort((a, b) => {
                const remA = (a.stats?.annual_fee_waiver_target || 0) - (a.stats?.spent_this_cycle || 0);
                const remB = (b.stats?.annual_fee_waiver_target || 0) - (b.stats?.spent_this_cycle || 0);
                return remB - remA;
            })
            .slice(0, 2);

        return { recentAccount, dueSoonest, needsSpendMore, needsWaiver };
    }, [activeAccounts, lastTxnAccountId]);

    if (!insights.recentAccount && !insights.dueSoonest && insights.needsSpendMore.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {/* Recent Transaction */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex items-start gap-3 hover:bg-white hover:border-indigo-100 transition-all group">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <History className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Recent Activity</span>
                    {insights.recentAccount ? (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Landmark className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate">{insights.recentAccount.name}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Last used card</span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-400 italic">No recent activity</span>
                    )}
                </div>
            </div>

            {/* Nearest Due */}
            <div className="bg-rose-50/30 border border-rose-100/30 rounded-xl p-3 flex items-start gap-3 hover:bg-rose-50/50 hover:border-rose-200 transition-all group">
                <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <CalendarClock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Nearest Due</span>
                    {insights.dueSoonest ? (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate">{insights.dueSoonest.name}</span>
                                <span className="text-[10px] font-black text-rose-600 bg-rose-100/50 px-1.5 rounded tabular-nums">
                                    {insights.dueSoonest.stats?.due_date_display || 'N/A'}
                                </span>
                            </div>
                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">Immediate payment needed</span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-400 italic">No upcoming dues</span>
                    )}
                </div>
            </div>

            {/* Needs Spend More (Cashback) */}
            <div className="bg-amber-50/30 border border-amber-100/30 rounded-xl p-3 flex items-start gap-3 hover:bg-amber-50/50 hover:border-amber-200 transition-all group">
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Target className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Cashback Targets</span>
                    <div className="flex flex-col gap-1.5">
                        {insights.needsSpendMore.length > 0 ? (
                            insights.needsSpendMore.map(a => (
                                <div key={a.id} className="flex items-center justify-between gap-2 border-b border-amber-100/50 pb-1 last:border-0 last:pb-0">
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{a.name}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[9px] font-black text-amber-600 tabular-nums">
                                            {formatMoneyVND(Math.round((a.cb_min_spend || a.stats?.min_spend || 0) - (a.stats?.spent_this_cycle || 0)))}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">All targets met</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
