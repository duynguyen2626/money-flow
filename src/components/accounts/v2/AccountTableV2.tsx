"use client"

import React, { useState, useMemo } from 'react';
import { Account, Category, Person } from "@/types/moneyflow.types";
import { useAccountColumnPreferences } from "@/hooks/useAccountColumnPreferences";
import { useAccountExpandableRows } from "@/hooks/useAccountExpandableRows";
import { AccountRowV2 } from "./AccountRowV2";
import { ChevronsUp, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccountGroupHeader } from "./AccountGroupHeader";
import { AccountGroupFooter } from "./AccountGroupFooter";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

interface AccountTableV2Props {
    accounts: Account[];
    allAccounts?: Account[]; // Added for looking up secured/parent accounts outside filtered list
    onEdit: (account: Account) => void;
    onLend: (account: Account) => void;
    onRepay: (account: Account) => void;
    onPay: (account: Account) => void;
    onTransfer: (account: Account) => void;
    categories?: Category[];
    people?: Person[];
}

export function AccountTableV2({
    accounts,
    allAccounts,
    onEdit,
    onLend,
    onRepay,
    onPay,
    onTransfer,
    categories,
    people,
}: AccountTableV2Props) {
    const {
        getVisibleColumns,
    } = useAccountColumnPreferences();

    const {
        expandedRows,
        isExpanded,
        toggleRow,
        collapseAll,
    } = useAccountExpandableRows();

    // Collapse details on ESC
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                collapseAll();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [collapseAll]);

    // Use derived state for robust lookup
    const robustAllAccounts = allAccounts || accounts;

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(['credit', 'loans', 'savings'])
    );

    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'asc' | 'desc';
    }>({ key: 'limit', direction: 'desc' });

    const toggleGroup = (section: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    const visibleCols = getVisibleColumns();

    // Grouping & Sorting Logic
    const groupedAccounts = useMemo(() => {
        const applySort = (list: Account[]) => {
            return [...list].sort((a, b) => {
                if (sortConfig.key === 'limit') {
                    const getRem = (acc: Account) => {
                        const l = acc.credit_limit || 0;
                        const d = Math.abs(acc.current_balance || 0);
                        return l - d;
                    };
                    const remA = getRem(a);
                    const remB = getRem(b);
                    return sortConfig.direction === 'desc' ? remB - remA : remA - remB;
                }

                if (sortConfig.key === 'rewards') {
                    const remA = (a.cb_min_spend || a.stats?.min_spend || 0) - (a.stats?.spent_this_cycle || 0);
                    const remB = (b.cb_min_spend || b.stats?.min_spend || 0) - (b.stats?.spent_this_cycle || 0);
                    return sortConfig.direction === 'desc' ? remB - remA : remA - remB;
                }

                if (sortConfig.key === 'balance') {
                    const getBal = (acc: Account) => {
                        const isCC = acc.type === 'credit_card';
                        const bal = acc.current_balance || 0;
                        if (isCC) return (acc.credit_limit || 0) - Math.abs(bal);
                        return bal;
                    };
                    const balA = getBal(a);
                    const balB = getBal(b);
                    return sortConfig.direction === 'desc' ? balB - balA : balA - balB;
                }

                // Default Sort (Status Urgency)
                const usageA = a.stats?.usage_percent || 0;
                const usageB = b.stats?.usage_percent || 0;
                if (usageA !== usageB) return usageB - usageA;

                const now = new Date();
                const getDueDays = (acc: Account) => {
                    if (!acc.stats?.due_date) return Infinity;
                    return Math.ceil((new Date(acc.stats.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                };
                const dueA = getDueDays(a);
                const dueB = getDueDays(b);

                if (dueA !== dueB) return dueA - dueB;
                return a.name.localeCompare(b.name);
            });
        };

        const groups = {
            'credit': {
                section: 'credit' as const,
                label: 'Credit Cards',
                accounts: applySort(accounts.filter(a => a.type === 'credit_card')),
            },
            'loans': {
                section: 'loans' as const,
                label: 'Loans & Debt',
                accounts: applySort(accounts.filter(a => a.type === 'debt')),
            },
            'savings': {
                section: 'savings' as const,
                label: 'Accounts & Savings',
                accounts: applySort(accounts.filter(a => a.type !== 'credit_card' && a.type !== 'debt')),
            },
        };

        return Object.values(groups).filter(g => g.accounts.length > 0);
    }, [accounts, sortConfig]);

    const getGroupTotal = (group: any) => {
        if (group.section === 'credit') {
            const totalDebt = group.accounts.reduce((sum: number, a: Account) => sum + Math.abs(a.current_balance || 0), 0);
            const totalLimit = group.accounts.reduce((sum: number, a: Account) => a.parent_account_id ? sum : sum + (a.credit_limit || 0), 0);
            return { debt: totalDebt, limit: totalLimit };
        }
        return group.accounts.reduce((sum: number, a: Account) => sum + (a.current_balance || 0), 0);
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[700px]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full text-sm text-left border-collapse relative">
                    <thead className="bg-white border-b border-slate-200 sticky top-0 z-[40]">
                        <tr className="h-11">
                            <th colSpan={visibleCols.length + 1} className="px-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-4 border-r border-slate-200 pr-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Qualified</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Needs Action</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Critical</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <HoverCard openDelay={100} closeDelay={100}>
                                                <HoverCardTrigger asChild>
                                                    <div className="flex items-center gap-2 cursor-help group">
                                                        <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 transition-colors">
                                                            <ArrowUpDown className="h-3 w-3 text-indigo-500 group-hover:text-white" />
                                                        </div>
                                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Intelligence Legend</span>
                                                    </div>
                                                </HoverCardTrigger>
                                                <HoverCardContent className="w-80 p-0 rounded-2xl shadow-2xl border-indigo-100 overflow-hidden" align="start">
                                                    <div className="p-3 bg-indigo-600 text-white">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                            <ArrowUpDown className="h-3 w-3" />
                                                            Table Logic Guide
                                                        </h4>
                                                    </div>
                                                    <div className="p-4 space-y-4">
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Sortable Columns</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {['Limit', 'Rewards', 'Balance'].map(c => (
                                                                    <div key={c} className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded border border-slate-100">
                                                                        <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                                        <span className="text-[9px] font-bold text-slate-600 uppercase">{c}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 border-t border-slate-100 pt-3">
                                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Amount Color Coding</p>
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="font-bold text-rose-600">High (&gt; 100M)</span>
                                                                    <span className="text-slate-400 font-medium">Attention Required</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="font-bold text-amber-600">Medium (50M - 100M)</span>
                                                                    <span className="text-slate-400 font-medium">Monitoring Zone</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="font-bold text-emerald-600">Standard (&lt; 50M)</span>
                                                                    <span className="text-slate-400 font-medium">Safe Zone</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </HoverCardContent>
                                            </HoverCard>

                                            {(sortConfig.key !== 'limit' || sortConfig.direction !== 'desc') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[10px] font-black text-rose-600 hover:bg-rose-50 uppercase tracking-tighter border border-transparent hover:border-rose-100"
                                                    onClick={() => setSortConfig({ key: 'limit', direction: 'desc' })}
                                                >
                                                    <X className="h-3 w-3 mr-1" />
                                                    Reset Sort
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {expandedRows.size > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[10px] font-black text-indigo-600 hover:bg-white uppercase tracking-tighter border border-indigo-100"
                                                onClick={collapseAll}
                                            >
                                                <ChevronsUp className="h-3 w-3 mr-1" />
                                                Collapse All
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y relative">
                        {groupedAccounts.length === 0 ? (
                            <tr>
                                <td colSpan={visibleCols.length + 1} className="p-8 text-center text-muted-foreground">
                                    No accounts found.
                                </td>
                            </tr>
                        ) : (
                            groupedAccounts.map((group) => {
                                const getGroupHeaderLabel = (key: string) => {
                                    if (group.section === 'credit') {
                                        if (key === 'limit') return 'Limit & Waiver';
                                        if (key === 'rewards') return 'Rewards & Target';
                                        if (key === 'due') return 'Due & Cycle';
                                    } else if (group.section === 'savings') {
                                        if (key === 'limit') return 'Status';
                                        if (key === 'rewards') return 'Interest & Benefits';
                                        if (key === 'due') return 'Activity';
                                    } else if (group.section === 'loans') {
                                        if (key === 'limit') return 'Debt Type';
                                        if (key === 'rewards') return 'Rate';
                                        if (key === 'due') return 'Target';
                                    }
                                    return visibleCols.find(c => c.key === key)?.label || key;
                                };

                                return (
                                    <React.Fragment key={group.section}>
                                        <AccountGroupHeader
                                            section={group.section}
                                            label={group.label}
                                            accountCount={group.accounts.length}
                                            totalAmount={getGroupTotal(group)}
                                            isExpanded={expandedGroups.has(group.section)}
                                            onToggle={() => toggleGroup(group.section)}
                                        />

                                        {expandedGroups.has(group.section) && (
                                            <>
                                                <tr className="bg-slate-50 border-b border-slate-100 sticky top-[44px] z-30 shadow-sm">
                                                    <td className="px-2 py-1.5 border-r border-slate-100" />
                                                    {visibleCols.map((col, idx) => {
                                                        const isSortable = col.key === 'limit' || col.key === 'rewards' || col.key === 'balance';
                                                        const isSorted = sortConfig.key === col.key;

                                                        return (
                                                            <td
                                                                key={`${group.section}-head-${col.key}`}
                                                                className={cn(
                                                                    "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap",
                                                                    idx < visibleCols.length - 1 && "border-r border-slate-100",
                                                                    isSortable && "cursor-pointer hover:text-indigo-500 hover:bg-indigo-50/50 transition-colors"
                                                                )}
                                                                onClick={() => {
                                                                    if (!isSortable) return;
                                                                    setSortConfig(prev => ({
                                                                        key: col.key,
                                                                        direction: prev.key === col.key && prev.direction === 'desc' ? 'asc' : 'desc'
                                                                    }));
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {getGroupHeaderLabel(col.key)}
                                                                    {isSortable && (
                                                                        <div className="shrink-0">
                                                                            {isSorted ? (
                                                                                sortConfig.direction === 'desc' ? <ArrowDown className="h-2.5 w-2.5" /> : <ArrowUp className="h-2.5 w-2.5" />
                                                                            ) : (
                                                                                <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>

                                                {group.accounts.map((account) => {
                                                    const familyBalance = account.relationships?.is_parent
                                                        ? accounts.filter(a => a.parent_account_id === account.id).reduce((sum, a) => sum + (a.current_balance || 0), 0) + account.current_balance
                                                        : account.current_balance;

                                                    return (
                                                        <AccountRowV2
                                                            key={account.id}
                                                            account={account}
                                                            allAccounts={robustAllAccounts}
                                                            familyBalance={familyBalance}
                                                            visibleColumns={visibleCols}
                                                            isExpanded={isExpanded(account.id)}
                                                            onToggleExpand={toggleRow}
                                                            onEdit={onEdit}
                                                            onLend={onLend}
                                                            onRepay={onRepay}
                                                            onPay={onPay}
                                                            onTransfer={onTransfer}
                                                            categories={categories}
                                                            people={people}
                                                        />
                                                    );
                                                })}
                                                <AccountGroupFooter
                                                    section={group.section}
                                                    accountCount={group.accounts.length}
                                                    totalAmount={group.section === 'credit' ? (getGroupTotal(group) as any).debt : getGroupTotal(group)}
                                                />
                                            </>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
