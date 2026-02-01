'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Account, Category } from "@/types/moneyflow.types";
import { AccountColumnConfig, AccountColumnKey } from "@/hooks/useAccountColumnPreferences";
import { ExpandIcon } from "@/components/transaction/ui/ExpandIcon";
import { AccountRowDetailsV2 } from "./AccountRowDetailsV2";
import { Button } from "@/components/ui/button";
import {
    Edit,
    Wallet,
    HandCoins,
    Banknote,
    ArrowRightLeft,
    CreditCard,
    ArrowUpRight,
    Loader2,
    LucideIcon,
    Network,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { AccountCycleTransactionsModal } from "./AccountCycleTransactionsModal";
// Quick Edit
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2";
import { getPeopleAction } from "@/actions/people-actions";
import { getShopsAction } from "@/actions/shop-actions";
import { Person } from "@/types/moneyflow.types";
import { Shop } from "@/types/moneyflow.types";
import { toast } from 'sonner';
import { AccountRewardsCell } from "./cells/account-rewards-cell";

interface AccountRowProps {
    account: Account;
    visibleColumns: AccountColumnConfig[];
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onEdit: (account: Account) => void;
    onLend: (account: Account) => void;
    onRepay: (account: Account) => void;
    onPay: (account: Account) => void;
    onTransfer: (account: Account) => void;
    familyBalance?: number;
    allAccounts?: Account[];
    categories?: Category[];
}

export function AccountRowV2({
    account,
    visibleColumns,
    isExpanded,
    onToggleExpand,
    onEdit,
    onLend,
    onRepay,
    onPay,
    onTransfer,
    familyBalance,
    allAccounts,
    categories,
}: AccountRowProps) {
    const router = useRouter();
    const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
    const [modalRefreshKey, setModalRefreshKey] = useState(0);

    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [people, setPeople] = useState<Person[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);

    const handleEditTransaction = (id: string) => {
        if (people.length === 0 || shops.length === 0) {
            Promise.all([getPeopleAction(), getShopsAction()]).then(([p, s]) => {
                setPeople(p);
                setShops(s);
                setEditingTransactionId(id);
            });
        } else {
            setEditingTransactionId(id);
        }
    };

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpand(account.id);
    };

    const onEditTransaction = (id: string) => {
        handleEditTransaction(id);
    };

    return (
        <>
            <tr
                className={cn(
                    "transition-all duration-200 group/row",
                    isExpanded ? "bg-indigo-50/20 border-b-0" : "hover:bg-indigo-50/10 border-b",
                    (() => {
                        if (account.type !== 'credit_card' && account.type !== 'debt') return "";
                        const now = new Date();

                        let dueDays = Infinity;
                        if (account.stats?.due_date) {
                            dueDays = Math.ceil((new Date(account.stats.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        }

                        let ruleDays = Infinity;
                        if (account.stats?.min_spend && !account.stats?.is_qualified && account.stats?.cycle_range) {
                            const parts = account.stats.cycle_range.split(' - ');
                            if (parts.length >= 2) {
                                try {
                                    const cycleEnd = new Date(parts[1]);
                                    ruleDays = Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                } catch { }
                            }
                        }

                        if (dueDays < 10 || ruleDays < 10) {
                            return "bg-rose-50/50 border-rose-200 hover:bg-rose-100/60 shadow-[inset_4px_0_0_0_#e11d48] transition-all duration-300";
                        }
                        if (dueDays !== Infinity || ruleDays !== Infinity) {
                            return "bg-slate-50/30 border-slate-100 hover:bg-indigo-50/20 shadow-[inset_4px_0_0_0_#94a3b8]";
                        }

                        const remaining = (account.stats?.min_spend || 0) - (account.stats?.spent_this_cycle || 0);
                        if (account.stats?.min_spend && !account.stats?.is_qualified && remaining > 0) {
                            return "bg-amber-50/20 border-amber-100 shadow-[inset_4px_0_0_0_#f59e0b]";
                        }

                        if (account.stats?.is_qualified) {
                            return "bg-emerald-50/10 border-emerald-100 shadow-[inset_4px_0_0_0_#10b981]";
                        }

                        return "bg-white border-b";
                    })()
                )}
            >
                <td className="w-10 px-2 py-3 text-center border-r border-slate-200">
                    <ExpandIcon
                        isExpanded={isExpanded}
                        onClick={handleIconClick}
                    />
                </td>

                {visibleColumns.map((col, idx) => (
                    <td key={`${account.id}-${col.key}`} className={cn(
                        "px-4 py-3 align-middle text-sm font-normal text-foreground",
                        idx < visibleColumns.length - 1 && "border-r border-slate-200"
                    )}>
                        {renderCell(
                            account,
                            col.key,
                            { onEdit, onLend, onRepay, onPay, onTransfer },
                            familyBalance,
                            allAccounts,
                            isExpanded,
                            categories,
                            setIsTransactionsModalOpen,
                            isTransactionsModalOpen,
                            onEditTransaction,
                            modalRefreshKey
                        )}
                    </td>
                ))}
            </tr>

            {isExpanded && (
                <tr className="bg-muted/30">
                    <td colSpan={visibleColumns.length + 1} className="p-0 border-b">
                        <AccountRowDetailsV2
                            account={account}
                            isExpanded={isExpanded}
                            allAccounts={allAccounts}
                            onEditTransaction={onEditTransaction}
                        />
                    </td>
                </tr>
            )}

            {editingTransactionId && (
                <TransactionSlideV2
                    open={!!editingTransactionId}
                    onOpenChange={(open) => !open && setEditingTransactionId(null)}
                    mode="single"
                    editingId={editingTransactionId}
                    initialData={undefined}
                    accounts={allAccounts || []}
                    categories={categories || []}
                    people={people}
                    shops={shops}
                    onSuccess={() => {
                        setEditingTransactionId(null);
                        setModalRefreshKey(prev => prev + 1);
                        router.refresh();
                        toast.success("Transaction updated");
                    }}
                />
            )}
        </>
    );
}

interface AccountRowActions {
    onEdit: (account: Account) => void;
    onLend: (account: Account) => void;
    onRepay: (account: Account) => void;
    onPay: (account: Account) => void;
    onTransfer: (account: Account) => void;
}

function renderCell(
    account: Account,
    key: AccountColumnKey,
    actions: AccountRowActions,
    familyBalance?: number,
    allAccounts?: Account[],
    isExpanded?: boolean,
    categories?: Category[],
    setIsTransactionsModalOpen?: (open: boolean) => void,
    isTransactionsModalOpen?: boolean,
    onEditTransaction?: (id: string) => void,
    modalRefreshKey?: number
) {
    const { onEdit, onLend, onRepay, onPay, onTransfer } = actions;
    const stats = account.stats;

    const badgeBase = "h-6 px-3 text-[10px] font-semibold uppercase tracking-wide rounded-full border flex items-center justify-center gap-1 min-w-[96px]";

    const renderRoleBadge = (role: 'parent' | 'child' | 'standalone') => {
        if (role === 'parent') {
            return <span className={`${badgeBase} bg-amber-50 text-amber-700 border-amber-200`}><ArrowRightLeft className="w-3 h-3" />Parent</span>;
        }
        if (role === 'child') {
            return <span className={`${badgeBase} bg-indigo-50 text-indigo-700 border-indigo-200`}><Network className="w-3 h-3" />Child</span>;
        }
        return <span className={`${badgeBase} bg-slate-50 text-slate-500 border-slate-200`}>Standalone</span>;
    };

    const formatMoneyVND = (amount: number) => new Intl.NumberFormat('vi-VN').format(Math.abs(amount));

    const getPlaceholderIcon = (type: string): LucideIcon => {
        switch (type) {
            case 'credit_card': return CreditCard;
            case 'bank': return Banknote;
            case 'ewallet': return Wallet;
            case 'savings': return ArrowUpRight;
            case 'debt': return HandCoins;
            default: return Wallet;
        }
    };

    const renderIcon = (type: string, url: string | null | undefined, name: string, sizeClass: string = "w-4 h-4") => {
        if (url) return <img src={url} className={cn(sizeClass, "object-contain rounded-sm")} alt="" />;
        const Icon = getPlaceholderIcon(type);
        return (
            <div className={cn(sizeClass, "flex items-center justify-center bg-indigo-50/50 rounded text-indigo-400 p-0.5 shadow-inner")}>
                <Icon className="w-full h-full" />
            </div>
        );
    };

    switch (key) {
        case 'account': {
            const children = allAccounts?.filter((a: Account) => a.parent_account_id === account.id) || [];

            const MainPlaceholderIcon = getPlaceholderIcon(account.type);

            return (
                <div className="flex flex-col gap-2 min-w-[170px]">
                    <div className="flex items-center gap-3 w-full">
                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded overflow-hidden">
                            {account.image_url ? (
                                <img src={account.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 p-2 rounded">
                                    <MainPlaceholderIcon className="w-full h-full" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                {account.type === 'credit_card' && <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                {account.type === 'bank' && <Banknote className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                {account.type === 'ewallet' && <Wallet className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                {account.type === 'savings' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                {account.type === 'debt' && <HandCoins className="w-3.5 h-3.5 text-rose-500 shrink-0" />}

                                <Link
                                    href={`/accounts/${account.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-black text-base leading-none hover:underline hover:text-indigo-600 transition-colors truncate"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {account.name}
                                </Link>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                                {account.relationships?.is_parent ? (
                                    <TooltipProvider>
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <div className="cursor-help">{renderRoleBadge('parent')}</div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="space-y-1">
                                                    <p className="font-bold">Child Accounts:</p>
                                                    {allAccounts?.filter(a => a.parent_account_id === account.id).map(child => (
                                                        <div key={child.id} className="flex items-center gap-2">
                                                            {renderIcon(child.type, child.image_url, child.name)}
                                                            <span>{child.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : account.relationships?.parent_info ? (
                                    <TooltipProvider>
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <div className="cursor-help">{renderRoleBadge('child')}</div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="flex items-center gap-2">
                                                    {renderIcon(account.relationships.parent_info.type, account.relationships.parent_info.image_url, account.relationships.parent_info.name)}
                                                    <span>Parent: {account.relationships.parent_info.name}</span>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    renderRoleBadge('standalone')
                                )}

                                {/* MCC Badges - placeholder for now, will be aggregated from transactions */}
                                {/* TODO: Aggregate MCC codes from account transactions */}

                                {(() => {
                                    const isDueAccount = account.type === 'credit_card' || account.type === 'debt';
                                    const dueDate = stats?.due_date ? new Date(stats.due_date) : null;
                                    let daysLeft = Infinity;
                                    if (dueDate) {
                                        const diffTime = dueDate.getTime() - new Date().getTime();
                                        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    }

                                    const formatDate = (date: Date | null) => date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date) : '';

                                    if (!isDueAccount) return null;

                                    if (daysLeft === Infinity) {
                                        return (
                                            <span className={`${badgeBase} bg-slate-50 text-slate-500 border-slate-200 w-[100px]`}>
                                                No Due
                                            </span>
                                        );
                                    }

                                    const tone = daysLeft <= 0
                                        ? "bg-rose-100 text-rose-800 border-rose-300"
                                        : daysLeft <= 10
                                            ? "bg-amber-100 text-amber-800 border-amber-300"
                                            : "bg-emerald-100 text-emerald-800 border-emerald-300";

                                    const dayNumber = Math.abs(daysLeft);
                                    const labelDate = formatDate(dueDate);
                                    // Split labelDate "Feb 5" -> ["Feb", "5"]
                                    const [month, day] = labelDate.split(' ');

                                    return (
                                        <span className={`${badgeBase} ${tone} w-[140px]`}>
                                            <span className="font-medium text-xs"><b className="font-extrabold">{dayNumber}</b> Days</span>
                                            <span className="text-slate-400 mx-0.5">-</span>
                                            <span className="font-medium text-xs">{month} <b className="font-extrabold">{day}</b></span>
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {isExpanded && children.length > 0 && (
                        <div className="ml-10 flex flex-col gap-1 border-l-2 border-indigo-100 pl-3 py-1">
                            {children.map((child: Account) => (
                                <div key={child.id} className="flex items-center justify-between gap-2 py-0.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-white rounded-sm overflow-hidden p-1">
                                            {child.image_url ? (
                                                <img src={child.image_url} alt="" className="w-full h-full object-contain" />
                                            ) : (
                                                (() => {
                                                    const Placeholder = getPlaceholderIcon(child.type);
                                                    return <Placeholder className="w-full h-full text-slate-200" />;
                                                })()
                                            )}
                                        </div>
                                        <Link
                                            href={`/accounts/${child.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 truncate"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {child.name}
                                        </Link>
                                    </div>
                                    <span className="text-[10px] font-black tabular-nums text-slate-400">
                                        {formatMoneyVND(child.current_balance || 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        case 'limit': {
            const isParent = account.relationships?.is_parent;
            const parentId = account.parent_account_id;
            const parentAccount = parentId ? allAccounts?.find(a => a.id === parentId) : null;

            const displayLimit = parentAccount ? (parentAccount.credit_limit || 0) : (account.credit_limit || 0);

            let familyDebt = account.current_balance || 0;

            if (isParent && allAccounts) {
                const childrenBalances = allAccounts
                    .filter(a => a.parent_account_id === account.id)
                    .reduce((sum, child) => sum + (child.current_balance || 0), 0);
                familyDebt = (account.current_balance || 0) + childrenBalances;
            } else if (parentId && parentAccount && allAccounts) {
                const childrenBalances = allAccounts
                    .filter(a => a.parent_account_id === parentId)
                    .reduce((sum, child) => sum + (child.current_balance || 0), 0);
                familyDebt = (parentAccount.current_balance || 0) + childrenBalances;
            }

            const debtAbs = Math.abs(familyDebt);
            const limitProgress = displayLimit > 0 ? Math.min(100, (debtAbs / displayLimit) * 100) : 0;

            return (
                <div className="flex flex-col items-end gap-1 min-w-[140px] py-1">
                    {/* Line 1: Badge + Limit Amount (Aligned with Rewards status) */}
                    <div className="flex items-center gap-1.5 justify-end w-full px-0.5 min-h-[17px]">
                        {account.secured_by_account_id && (
                            <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <div className="h-3.5 px-1 flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-[3px] text-[8px] font-black uppercase tracking-tight cursor-help leading-none">
                                            SECURED
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const secured = allAccounts?.find(a => a.id === account.secured_by_account_id);
                                                return secured ? (
                                                    <>
                                                        {renderIcon(secured.type, secured.image_url, secured.name)}
                                                        <span>Secured by {secured.name}</span>
                                                    </>
                                                ) : 'Secured by collateral';
                                            })()}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <span className="font-black text-slate-700 text-[11px] tabular-nums leading-none">
                            {displayLimit ? formatMoneyVND(displayLimit) : '—'}
                        </span>
                    </div>

                    {/* Line 2: Progress Bar with Embedded Usage Text */}
                    {displayLimit > 0 && (
                        <div className="relative w-full h-6 bg-slate-50 rounded-md border border-slate-200 overflow-hidden group">
                            {/* Progress Fill */}
                            <div
                                className={cn(
                                    "absolute inset-0 h-full transition-all duration-500 ease-out opacity-20 group-hover:opacity-30",
                                    limitProgress > 90 ? "bg-rose-500" : limitProgress > 70 ? "bg-amber-500" : "bg-indigo-500"
                                )}
                                style={{ width: `${Math.max(limitProgress, 0)}%` }}
                            />
                            {/* Line at bottom */}
                            <div
                                className={cn(
                                    "absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-out",
                                    limitProgress > 90 ? "bg-rose-500" : limitProgress > 70 ? "bg-amber-500" : "bg-indigo-500"
                                )}
                                style={{ width: `${Math.max(limitProgress, 0)}%` }}
                            />

                            {/* Embedded Text */}
                            <div className="absolute inset-0 flex items-center justify-end px-2 pointer-events-none">
                                <span className="text-[10px] font-bold text-slate-600 tabular-nums drop-shadow-sm">
                                    {formatMoneyVND(debtAbs)} <span className="text-slate-400 mx-0.5">/</span> {limitProgress.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        case 'rewards':
            return (
                <div className="flex flex-col items-end justify-center min-w-[150px]">
                    <AccountRewardsCell
                        account={account}
                        categories={categories}
                        onOpenTransactions={() => setIsTransactionsModalOpen?.(true)}
                    />
                    <AccountCycleTransactionsModal
                        open={isTransactionsModalOpen || false}
                        onOpenChange={setIsTransactionsModalOpen || (() => { })}
                        accountId={account.id}
                        accountName={account.name}
                        cycleDisplay={(stats?.cycle_range as string) || ''}
                        onEditTransaction={onEditTransaction || (() => { })}
                        refreshKey={modalRefreshKey}
                    />
                </div>
            );
        case 'due':
            return <span className="text-[10px] text-slate-400">Due is shown in the Account column</span>;
        case 'balance': {
            let displayBalance = familyBalance ?? account.current_balance;

            const balIsParent = account.relationships?.is_parent;
            const balParentId = account.parent_account_id;
            const balParentAccount = balParentId ? allAccounts?.find(a => a.id === balParentId) : null;

            if (balIsParent && allAccounts) {
                const childrenBalances = allAccounts
                    .filter(a => a.parent_account_id === account.id)
                    .reduce((sum, child) => sum + (child.current_balance || 0), 0);
                displayBalance = (account.current_balance || 0) + childrenBalances;
            } else if (balParentId && balParentAccount && allAccounts) {
                const childrenBalances = allAccounts
                    .filter(a => a.parent_account_id === balParentId)
                    .reduce((sum, child) => sum + (child.current_balance || 0), 0);
                displayBalance = (balParentAccount.current_balance || 0) + childrenBalances;
            }

            return (
                <div className="flex flex-col items-end text-right gap-0.5">
                    <div className={cn(
                        "tabular-nums text-sm font-black tracking-tight",
                        displayBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                        {formatMoneyVND(displayBalance)}
                    </div>
                </div>
            );
        }
        case 'action': {
            const isCC = account.type === 'credit_card';
            const isDebt = account.type === 'debt';

            return (
                <TooltipProvider>
                    <div className="action-cell flex items-center gap-1 justify-end">
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); onLend(account); }}>
                                    <HandCoins className="h-[18px] w-[18px]" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Lend / Add Debt</p></TooltipContent>
                        </Tooltip>

                        <ActionButtonsWithLoading
                            actions={{ onEdit, onLend, onRepay, onPay, onTransfer }}
                            account={account}
                            isCC={isCC}
                            isDebt={isDebt}
                        />
                    </div>
                </TooltipProvider>
            );
        }
        default:
            return <span className="text-slate-300">—</span>;
    }
}

interface ActionButtonsProps {
    actions: AccountRowActions;
    account: Account;
    isCC: boolean;
    isDebt: boolean;
}

function ActionButtonsWithLoading({ actions, account, isCC, isDebt }: ActionButtonsProps) {
    const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

    const handleAction = (action: string, callback: (account: Account) => void) => {
        setLoadingAction(action);
        setTimeout(() => {
            callback(account);
            setLoadingAction(null);
        }, 300);
    };

    return (
        <>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); handleAction('repay', actions.onRepay); }}>
                        {loadingAction === 'repay' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-[18px] w-[18px]" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Repay / Income</p></TooltipContent>
            </Tooltip>

            {(isCC || isDebt) && (
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); handleAction('pay', actions.onPay); }}>
                            {loadingAction === 'pay' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-[18px] w-[18px]" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Pay Bill</p></TooltipContent>
                </Tooltip>
            )}

            {!isCC && (
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); handleAction('transfer', actions.onTransfer); }}>
                            {loadingAction === 'transfer' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-[18px] w-[18px]" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Transfer</p></TooltipContent>
                </Tooltip>
            )}

            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleAction('edit', actions.onEdit); }}>
                        {loadingAction === 'edit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-[18px] w-[18px]" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Settings</p></TooltipContent>
            </Tooltip>
        </>
    );
}
