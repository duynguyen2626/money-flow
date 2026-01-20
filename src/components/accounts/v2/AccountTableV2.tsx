"use client"

import React, { useState, useMemo } from 'react';
import { Account } from "@/types/moneyflow.types";
import { useAccountColumnPreferences } from "@/hooks/useAccountColumnPreferences";
import { useAccountExpandableRows } from "@/hooks/useAccountExpandableRows";
import { AccountRowV2 } from "./AccountRowV2";
import { Settings2, ChevronsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccountGroupHeader } from "./AccountGroupHeader";
import { AccountGroupFooter } from "./AccountGroupFooter";

interface AccountTableV2Props {
    accounts: Account[];
    allAccounts?: Account[]; // Added for looking up secured/parent accounts outside filtered list
    onEdit: (account: Account) => void;
    onLend: (account: Account) => void;
    onRepay: (account: Account) => void;
    onPay: (account: Account) => void;
    onTransfer: (account: Account) => void;
}

export function AccountTableV2({
    accounts,
    allAccounts,
    onEdit,
    onLend,
    onRepay,
    onPay,
    onTransfer
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

    // Use derived state for robust lookup
    const robustAllAccounts = allAccounts || accounts;

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(['credit', 'loans', 'savings'])
    );

    const toggleGroup = (section: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    const visibleCols = getVisibleColumns();

    // Grouping Logic
    const groupedAccounts = useMemo(() => {
        const groups = {
            'credit': {
                section: 'credit' as const,
                label: 'Credit Cards',
                accounts: accounts.filter(a => a.type === 'credit_card'),
            },
            'loans': {
                section: 'loans' as const,
                label: 'Loans & Debt',
                accounts: accounts.filter(a => a.type === 'debt'),
            },
            'savings': {
                section: 'savings' as const,
                label: 'Accounts & Savings',
                accounts: accounts.filter(a => a.type !== 'credit_card' && a.type !== 'debt'),
            },
        };

        return Object.values(groups).filter(g => g.accounts.length > 0);
    }, [accounts]);

    const getGroupTotal = (group: any) => {
        if (group.section === 'credit') {
            // Debt / Limit
            const totalDebt = group.accounts.reduce((sum: number, a: Account) => {
                // For this user, it seems credit card balance is stored as positive for debt
                // safely taking Math.abs to cover both conventions (negative or positive debt representation)
                return sum + Math.abs(a.current_balance || 0);
            }, 0);
            const totalLimit = group.accounts.reduce((sum: number, a: Account) => {
                // Only count limit for parents to avoid doubling
                if (a.parent_account_id) return sum;
                return sum + (a.credit_limit || 0);
            }, 0);
            return { debt: totalDebt, limit: totalLimit };
        }
        return group.accounts.reduce((sum: number, a: Account) => sum + (a.current_balance || 0), 0);
    };

    return (
        <div className="rounded-md border bg-card">
            <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/95 backdrop-blur-sm text-xs uppercase font-black text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="w-10 px-2 py-3 text-center border-r border-slate-200 bg-slate-50/95 align-middle">
                                {expandedRows.size > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                        onClick={collapseAll}
                                        title="Collapse All"
                                    >
                                        <ChevronsUp className="h-4 w-4" />
                                    </Button>
                                )}
                            </th>
                            {visibleCols.map((col, idx) => (
                                <th key={col.key} className={cn(
                                    "px-4 py-3 whitespace-nowrap group bg-slate-50/95", // bg required for sticky coverage
                                    idx < visibleCols.length - 1 && "border-r border-slate-200"
                                )}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span>{col.label}</span>
                                        {col.key === 'action' && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-50 hover:opacity-100"
                                                >
                                                    <Settings2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
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
                            groupedAccounts.map((group) => (
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
