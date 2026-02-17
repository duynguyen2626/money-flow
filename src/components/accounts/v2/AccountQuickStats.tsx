"use client"

import React, { useMemo } from 'react';
import { Account } from "@/types/moneyflow.types";
import { Landmark, CreditCard, Banknote, AlertCircle, TrendingUp, ShieldCheck, Wallet, ArrowUpRight, ArrowDownRight, User2, Users2, ChevronRight, CalendarClock, Target, LineChart, Coins } from "lucide-react";
import { cn, formatMoneyVND } from "@/lib/utils";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { VietnameseCurrency } from "@/components/ui/vietnamese-currency"

interface AccountQuickStatsProps {
    accounts: Account[];
    lastTxnAccountId?: string; // Added for intelligence sync if needed
}

export function AccountQuickStats({ accounts, lastTxnAccountId }: AccountQuickStatsProps) {
    const stats = useMemo(() => {
        // Exclude closed/inactive accounts explicitly (!== false includes true and undefined)
        const activeAccounts = accounts.filter(a => a.is_active !== false);

        // 1. Liquid Assets (Spending cash)
        const liquidAccountsList = activeAccounts.filter(a => a.type === 'bank' || a.type === 'ewallet' || a.type === 'cash');
        const totalCash = Math.round(liquidAccountsList.reduce((sum, a) => sum + (a.current_balance || 0), 0));
        const topLiquidAccounts = liquidAccountsList.filter(a => (a.current_balance || 0) > 0).sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));

        // 2. Wealth & Growth (Savings & Investments)
        const wealthAccountsList = activeAccounts.filter(a => a.type === 'savings' || a.type === 'investment' || a.type === 'asset');
        const totalWealth = Math.round(wealthAccountsList.reduce((sum, a) => sum + (a.current_balance || 0), 0));
        const topWealthAccounts = wealthAccountsList.filter(a => (a.current_balance || 0) !== 0).sort((a, b) => Math.abs(b.current_balance || 0) - Math.abs(a.current_balance || 0));

        // 3. Credit
        const creditCards = activeAccounts.filter(a => a.type === 'credit_card');

        // Limit & Debt (Owner Summary - No double counting)
        const totalDebtRaw = creditCards.reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0);
        const totalDebt = Math.round(totalDebtRaw);
        const totalLimit = Math.round(creditCards.filter(a => !a.parent_account_id).reduce((sum, a) => sum + (a.credit_limit || 0), 0));

        // Utilization by Owner - Enhanced Detection: holder_type 'me' is ME. Anything else linked to a person is OTHERS.
        // Fallback: If no type and no person, assume ME.
        const myCards = creditCards.filter(a =>
            a.holder_type === 'me' ||
            (!a.holder_type && !a.holder_person_id)
        );
        const myDebt = Math.round(myCards.reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0));
        const myLimit = Math.round(myCards.filter(a => !a.parent_account_id).reduce((sum, a) => sum + (a.credit_limit || 0), 0));

        const othersCards = creditCards.filter(a =>
            (a.holder_type && a.holder_type !== 'me') ||
            (!a.holder_type && a.holder_person_id) ||
            (a.holder_type === 'me' && a.holder_person_id && a.name.toLowerCase().includes('mom')) // Specific safety for user's MOM card case
        );
        const othersDebt = Math.round(othersCards.reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0));
        const othersLimit = Math.round(othersCards.filter(a => !a.parent_account_id).reduce((sum, a) => sum + (a.credit_limit || 0), 0));

        const hasOthers = othersCards.length > 0;

        // 4. Tasks
        const soonestDue = accounts
            .filter(a => a.is_active === true && (a.type === 'credit_card' || a.type === 'debt') && a.stats?.due_date)
            .sort((a, b) => new Date(a.stats!.due_date!).getTime() - new Date(b.stats!.due_date!).getTime())[0];

        const dueSoonList = accounts.filter(a => {
            if (a.is_active !== true || !a.stats?.due_date) return false;
            const days = (new Date(a.stats.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
            return days >= 0 && days <= 7;
        }).sort((a, b) => new Date(a.stats!.due_date!).getTime() - new Date(b.stats!.due_date!).getTime());

        const needsSpendList = accounts.filter(a => {
            if (a.is_active !== true) return false;
            const spent = a.stats?.spent_this_cycle || 0;
            const target = a.cb_min_spend || a.stats?.min_spend || 0;
            return target > 0 && spent < target;
        }).sort((a, b) => {
            const remA = (a.cb_min_spend || a.stats?.min_spend || 0) - (a.stats?.spent_this_cycle || 0);
            const remB = (b.cb_min_spend || b.stats?.min_spend || 0) - (b.stats?.spent_this_cycle || 0);
            return remB - remA;
        });

        const needsWaiverList = accounts.filter(a => {
            if (a.is_active !== true || !a.stats?.annual_fee_waiver_target) return false;
            const spent = a.stats.spent_this_cycle || 0;
            const target = a.stats.annual_fee_waiver_target || 0;
            return target > 0 && spent < target;
        }).sort((a, b) => {
            const remA = (a.stats?.annual_fee_waiver_target || 0) - (a.stats?.spent_this_cycle || 0);
            const remB = (b.stats?.annual_fee_waiver_target || 0) - (b.stats?.spent_this_cycle || 0);
            return remB - remA;
        });

        return {
            totalCash, totalWealth, totalDebt, totalLimit,
            topLiquidAccounts, topWealthAccounts,
            myDebt, myLimit,
            othersDebt, othersLimit, hasOthers,
            soonestDue,
            dueSoonList,
            needsSpendList,
            needsWaiverList,
        };
    }, [accounts]);

    const utilization = stats.totalLimit > 0 ? (stats.totalDebt / stats.totalLimit) * 100 : 0;
    const myUtilization = stats.myLimit > 0 ? (stats.myDebt / stats.myLimit) * 100 : 0;
    const othersUtilization = stats.othersLimit > 0 ? (stats.othersDebt / stats.othersLimit) * 100 : 0;

    return (
        <div className="bg-slate-50 border-b border-slate-200 sticky top-14 z-10 transition-all duration-300">
            <div className="max-w-[1600px] mx-auto px-6 h-12 flex items-center justify-between gap-1">
                {/* 1. Liquid Portfolio */}
                <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <div className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group border border-transparent hover:border-emerald-100/50 flex-1 min-w-0">
                            <div className="h-7 w-7 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <Wallet className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Liquid Portfolio</span>
                                <span className="text-[11px] font-black text-slate-800 tabular-nums truncate">{formatMoneyVND(stats.totalCash)}</span>
                            </div>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-[320px] p-0 rounded-2xl shadow-2xl border-slate-200 overflow-hidden" align="start">
                        <div className="p-3 bg-emerald-600 text-white">
                            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Wallet className="h-3 w-3" />
                                Cash Liquidity
                            </h4>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1.5 scrollbar-hide">
                            <div className="px-2 pt-1.5 pb-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Positions</span>
                            </div>
                            {stats.topLiquidAccounts.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="h-7 w-7 rounded bg-white border border-slate-100 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                            {a.image_url ? <img src={a.image_url} className="w-full h-full object-contain" /> : <Landmark className="h-3 w-3 text-slate-400" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">{a.name}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">{a.type}</span>
                                        </div>
                                    </div>
                                    <VietnameseCurrency amount={a.current_balance} className="text-[11px]" variant="auto" />
                                </div>
                            ))}
                        </div>
                        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-4">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Total Available</span>
                            <span className="text-[11px] font-black text-emerald-600 tabular-nums">{formatMoneyVND(stats.totalCash)}</span>
                        </div>
                    </HoverCardContent>
                </HoverCard>

                <div className="h-6 w-px bg-slate-200" />

                {/* 2. Wealth Growth */}
                <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <div className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group border border-transparent hover:border-blue-100/50 flex-1 min-w-0">
                            <div className="h-7 w-7 rounded-md bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <LineChart className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest leading-none">Growth Wealth</span>
                                <span className="text-[11px] font-black text-slate-800 tabular-nums truncate">{formatMoneyVND(stats.totalWealth)}</span>
                            </div>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-[320px] p-0 rounded-2xl shadow-2xl border-slate-200 overflow-hidden" align="center">
                        <div className="p-3 bg-blue-600 text-white">
                            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <LineChart className="h-3 w-3" />
                                Investment Summary
                            </h4>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1.5 scrollbar-hide">
                            {stats.topWealthAccounts.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic p-4 text-center">No saving/investment accounts.</p>
                            ) : (
                                stats.topWealthAccounts.map(a => (
                                    <div key={a.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-7 w-7 rounded bg-white border border-slate-100 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                                {a.image_url ? <img src={a.image_url} className="w-full h-full object-contain" /> : <Landmark className="h-3 w-3 text-slate-400" />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">{a.name}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{a.type}</span>
                                            </div>
                                        </div>
                                        <VietnameseCurrency amount={a.current_balance} className="text-[11px]" variant="auto" />
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-4">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Capital Sum</span>
                            <span className="text-[11px] font-black text-blue-600 tabular-nums">{formatMoneyVND(stats.totalWealth)}</span>
                        </div>
                    </HoverCardContent>
                </HoverCard>

                <div className="h-6 w-px bg-slate-200" />

                {/* 3. Utilization Strategy */}
                <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <div className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group border border-transparent hover:border-slate-200 flex-[1.4] min-w-0 px-4">
                            <div className="h-7 w-7 rounded-md bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-colors group-hover:bg-indigo-600">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center justify-between leading-none pr-1">
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Utilization</span>
                                    <span className={cn(
                                        "text-[10px] font-black tabular-nums transition-all tracking-tight",
                                        utilization > 80 ? "text-rose-600" : utilization > 50 ? "text-amber-600" : "text-emerald-600"
                                    )}>
                                        {utilization.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                                    <div className="flex items-center gap-1 shrink-0">
                                        <User2 className="h-2.5 w-2.5 text-indigo-400" />
                                        <span className="text-[9px] font-bold text-slate-700 tabular-nums">{formatMoneyVND(stats.myDebt)}</span>
                                    </div>
                                    <div className="h-2 w-px bg-slate-200" />
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Users2 className="h-2.5 w-2.5 text-slate-300" />
                                        <span className="text-[9px] font-bold text-slate-400 tabular-nums">{formatMoneyVND(stats.othersDebt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-[360px] p-0 rounded-2xl shadow-2xl border-slate-200 overflow-hidden" align="center">
                        <div className="p-3 bg-slate-800 text-white flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                Capacity Analysis
                            </h4>
                            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded tracking-tighter">{utilization.toFixed(1)}% Usage</span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <User2 className="h-3 w-3 text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">My Active Limit</span>
                                </div>
                                <div className="flex justify-between items-end text-center">
                                    <div className="flex flex-col items-start px-2">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Debt</span>
                                        <span className="text-xs font-black text-rose-600 tabular-nums">{formatMoneyVND(stats.myDebt)}</span>
                                    </div>
                                    <div className="flex flex-col items-center flex-1 px-4 border-l border-r border-slate-200/50">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Limit</span>
                                        <span className="text-xs font-black text-indigo-600 tabular-nums">{formatMoneyVND(stats.myLimit)}</span>
                                    </div>
                                    <div className="flex flex-col items-end px-2">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Free</span>
                                        <span className="text-xs font-black text-emerald-600 tabular-nums">{formatMoneyVND(Math.max(0, stats.myLimit - stats.myDebt))}</span>
                                    </div>
                                </div>
                            </div>

                            {stats.hasOthers && (
                                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users2 className="h-3 w-3 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Others' Managed Assets</span>
                                    </div>
                                    <div className="flex justify-between items-end text-center">
                                        <div className="flex flex-col items-start px-2">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Debt</span>
                                            <span className="text-xs font-black text-rose-500 tabular-nums">{formatMoneyVND(stats.othersDebt)}</span>
                                        </div>
                                        <div className="flex flex-col items-center flex-1 px-4 border-l border-r border-slate-200/50">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Limit</span>
                                            <span className="text-xs font-black text-slate-400 tabular-nums">{stats.othersLimit > 0 ? formatMoneyVND(stats.othersLimit) : 'No Limit'}</span>
                                        </div>
                                        <div className="flex flex-col items-end px-2">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Free</span>
                                            <span className="text-xs font-black text-slate-400 tabular-nums">{stats.othersLimit > 0 ? formatMoneyVND(Math.max(0, stats.othersLimit - stats.othersDebt)) : '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </HoverCardContent>
                </HoverCard>

                <div className="h-6 w-px bg-slate-200" />

                {/* 4. Waiver Tracking - NEW SEPARATED UNIT */}
                <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <div className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group border border-transparent hover:border-amber-100/50 flex-1 min-w-0">
                            <div className="h-7 w-7 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest leading-none">Waiver Tracking</span>
                                <div className="flex items-center gap-1.5 leading-none mt-0.5">
                                    <span className="text-[11px] font-black text-slate-800 tabular-nums">{stats.needsWaiverList.length}</span>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Units Pending</span>
                                </div>
                            </div>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-[320px] p-0 rounded-2xl shadow-2xl border-slate-200 overflow-hidden" align="center">
                        <div className="p-3 bg-amber-600 text-white">
                            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3" />
                                Annual Fee Optimization
                            </h4>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1.5 scrollbar-hide">
                            {stats.needsWaiverList.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic p-4 text-center">No outstanding waiver targets.</p>
                            ) : (
                                stats.needsWaiverList.map(a => {
                                    const target = a.stats?.annual_fee_waiver_target || 0;
                                    const spent = a.stats?.spent_this_cycle || 0;
                                    const remaining = target - spent;
                                    const progress = (spent / target) * 100;
                                    return (
                                        <div key={a.id} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="h-7 w-7 rounded bg-white border border-slate-100 p-1 flex items-center justify-center shrink-0">
                                                        {a.image_url ? <img src={a.image_url} className="w-full h-full object-contain" /> : <Landmark className="h-3 w-3 text-slate-300" />}
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-800 truncate">{a.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-rose-600">-{formatMoneyVND(remaining)}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider tabular-nums">
                                                <span>{formatMoneyVND(spent)}</span>
                                                <span>Target {formatMoneyVND(target)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-4">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Attention Required</span>
                            <span className="text-[11px] font-black text-amber-600">{stats.needsWaiverList.length} Accounts</span>
                        </div>
                    </HoverCardContent>
                </HoverCard>

                <div className="h-6 w-px bg-slate-200" />

                {/* 5. Operational Awareness */}
                <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <div className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group border border-transparent hover:border-amber-100/50 flex-[1.2] min-w-0">
                            <div className="h-7 w-7 rounded-md bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <AlertCircle className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <span className="text-[8px] font-bold text-rose-600 uppercase tracking-widest leading-none">Operational Readiness</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-black text-rose-600 leading-none tabular-nums">{stats.dueSoonList.length}</span>
                                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Urgent</span>
                                    </div>
                                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                                        <span className="text-[10px] font-black text-amber-600 leading-none tabular-nums">{stats.needsSpendList.length}</span>
                                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Tasks</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-[420px] p-0 rounded-2xl shadow-2xl border-slate-200 overflow-hidden" align="end">
                        <div className="p-3 bg-rose-600 text-white">
                            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle className="h-3 w-3" />
                                Critical Decision Board
                            </h4>
                        </div>
                        <div className="p-4 max-h-[500px] overflow-y-auto space-y-4 scrollbar-hide pb-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-1 border-b border-rose-100">
                                    <CalendarClock className="h-3.5 w-3.5 text-rose-500" />
                                    <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Payment Required</span>
                                </div>
                                <div className="space-y-1.5">
                                    {stats.dueSoonList.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic py-2">No urgent payments detected.</p>
                                    ) : (
                                        stats.dueSoonList.map(a => {
                                            const days = Math.ceil((new Date(a.stats!.due_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            return (
                                                <div key={a.id} className="flex items-center justify-between p-2 rounded-xl bg-rose-50/30 border border-rose-100/50">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="h-7 w-7 rounded bg-white border border-rose-100 p-1 flex items-center justify-center shrink-0">
                                                            {a.image_url ? <img src={a.image_url} className="w-full h-full object-contain" /> : <Landmark className="h-3 w-3 text-slate-300" />}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-700 truncate">{a.name}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className={cn(
                                                            "text-[9px] font-black px-1.5 py-0.5 rounded uppercase leading-none",
                                                            days <= 2 ? "bg-rose-500 text-white animate-pulse" : "bg-white text-rose-600 border border-rose-100"
                                                        )}>{days === 0 ? 'Today' : `${days} d`}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{formatMoneyVND(Math.abs(a.current_balance || 0))}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2 pb-1 border-b border-amber-100">
                                    <Target className="h-3.5 w-3.5 text-amber-500" />
                                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Cashback Optimization</span>
                                </div>
                                <div className="space-y-2.5">
                                    {stats.needsSpendList.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic py-2">All reward buffers secured.</p>
                                    ) : (
                                        stats.needsSpendList.map(a => {
                                            const target = a.cb_min_spend || a.stats?.min_spend || 0;
                                            const spent = a.stats?.spent_this_cycle || 0;
                                            const remaining = target - spent;
                                            const progress = (spent / target) * 100;
                                            return (
                                                <div key={a.id} className="p-2.5 rounded-xl bg-amber-50/30 border border-amber-100/50 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {a.image_url ? <img src={a.image_url} className="h-6 w-6 object-contain rounded-none shrink-0" /> : <Landmark className="h-4 w-4 text-slate-300" />}
                                                            <span className="text-[10px] font-black text-slate-700 truncate">{a.name}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span className="text-[10px] font-black text-amber-600">-{formatMoneyVND(remaining)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            </div>
        </div>
    );
}
