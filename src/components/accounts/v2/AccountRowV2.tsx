import React from 'react';
import Link from 'next/link';
import { Account } from "@/types/moneyflow.types";
import { AccountColumnConfig } from "@/hooks/useAccountColumnPreferences";
import { ExpandIcon } from "@/components/transaction/ui/ExpandIcon";
import { AccountRowDetailsV2 } from "./AccountRowDetailsV2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Edit,
    Wallet,
    HandCoins,
    Banknote,
    ArrowRightLeft,
    CreditCard,
    Link2,
    Lock,
    AlertTriangle,
    Clock,
    TrendingDown,
    ArrowUpRight,
    Loader2,
    ChevronRight,
    ChevronDown,
    ArrowDownLeft,
    MoreHorizontal,
    RotateCcw,
    Eye,
    Info
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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
}: AccountRowProps) {
    const handleRowClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.action-cell')) {
            onToggleExpand(account.id);
        }
    };

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpand(account.id);
    };

    return (
        <>
            <tr
                className={cn(
                    "group transition-all hover:bg-muted/50 cursor-pointer border-b",
                    isExpanded && "bg-muted/50 shadow-[inset_4px_0_0_0_#6366f1]",
                    // Highlighting
                    (() => {
                        const stats = account.stats;
                        const dueDate = stats?.due_date ? new Date(stats.due_date) : null;
                        if (dueDate) {
                            const diffTime = dueDate.getTime() - new Date().getTime();
                            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (daysLeft <= 3 && account.current_balance < 0) return "bg-rose-50/70 border-rose-200 hover:bg-rose-100/70";
                        }
                        if (stats?.min_spend && stats.min_spend > 0 && !stats.is_qualified && (stats.spent_this_cycle || 0) > 0) {
                            return "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70";
                        }
                        return "";
                    })()
                )}
                onClick={handleRowClick}
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
                        {renderCell(account, col.key as any, { onEdit, onLend, onRepay, onPay, onTransfer }, familyBalance, allAccounts, isExpanded)}
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
                        />
                    </td>
                </tr>
            )}
        </>
    );
}

function renderCell(account: Account, key: string, actions: any, familyBalance?: number, allAccounts?: Account[], isExpanded?: boolean) {
    const { onEdit, onLend, onRepay, onPay, onTransfer } = actions;
    const stats = account.stats;

    switch (key) {
        case 'account':
            const children = allAccounts?.filter((a: Account) => a.parent_account_id === account.id) || [];
            return (
                <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded overflow-hidden">
                            {account.image_url ? (
                                <img src={account.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase rounded">
                                    {account.name?.[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                {/* Type Icon BEFORE name */}
                                {account.type === 'credit_card' && <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                {account.type === 'bank' && <Banknote className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                {account.type === 'ewallet' && <Wallet className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                {account.type === 'savings' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                {account.type === 'debt' && <HandCoins className="w-3.5 h-3.5 text-rose-500 shrink-0" />}

                                <Link
                                    href={`/accounts/v2/${account.id}`}
                                    className="font-black text-base leading-none hover:underline hover:text-indigo-600 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {account.name}
                                </Link>

                                <div className="flex items-center gap-1.5 ml-auto">
                                    {account.secured_by_account_id && (
                                        <TooltipProvider>
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <Link2 className="w-3 h-3 text-indigo-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="flex items-center gap-2">
                                                        {(() => {
                                                            const secured = allAccounts?.find(a => a.id === account.secured_by_account_id);
                                                            return secured ? (
                                                                <>
                                                                    {secured.image_url && <img src={secured.image_url} className="w-4 h-4 object-contain" />}
                                                                    <span>Secured by {secured.name}</span>
                                                                </>
                                                            ) : 'Secured by collateral';
                                                        })()}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {account.relationships?.is_parent && (
                                        <TooltipProvider>
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <Badge variant="secondary" className="h-5 px-2 text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200 font-black whitespace-nowrap min-w-[60px] justify-center cursor-help">
                                                        PARENT
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="space-y-1">
                                                        <p className="font-bold">Child Accounts:</p>
                                                        {allAccounts?.filter(a => a.parent_account_id === account.id).map(child => (
                                                            <div key={child.id} className="flex items-center gap-2">
                                                                {child.image_url && <img src={child.image_url} className="w-4 h-4 object-contain" />}
                                                                <span>{child.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {account.relationships?.parent_info && (
                                        <TooltipProvider>
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <Badge variant="secondary" className="h-5 px-2 text-[9px] bg-slate-100 text-slate-600 border-slate-200 font-black whitespace-nowrap min-w-[60px] justify-center cursor-help">
                                                        CHILD
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="flex items-center gap-2">
                                                        {account.relationships.parent_info.image_url && <img src={account.relationships.parent_info.image_url} className="w-4 h-4 object-contain" />}
                                                        <span>Parent: {account.relationships.parent_info.name}</span>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Vertical Child List when expanded */}
                    {isExpanded && children.length > 0 && (
                        <div className="ml-10 flex flex-col gap-1 border-l-2 border-indigo-100 pl-3 py-1">
                            {children.map((child: Account) => (
                                <div key={child.id} className="flex items-center justify-between gap-2 py-0.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-white rounded-sm overflow-hidden">
                                            {child.image_url ? (
                                                <img src={child.image_url} alt="" className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="text-[10px] font-bold text-slate-300 uppercase">{child.name?.[0]}</div>
                                            )}
                                        </div>
                                        <Link
                                            href={`/accounts/v2/${child.id}`}
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
        case 'limit':
            const isParent = account.relationships?.is_parent;
            const parentId = account.parent_account_id;
            const parentAccount = parentId ? allAccounts?.find(a => a.id === parentId) : null;

            // Limit to display: Own limit or Parent's limit
            const displayLimit = parentAccount ? (parentAccount.credit_limit || 0) : (account.credit_limit || 0);

            // For credit cards, current_balance represents debt (can be positive or negative)
            // We want the absolute value to show how much is owed
            const debtAbs = Math.abs(account.current_balance || 0);
            const limitProgress = displayLimit > 0 ? Math.min(100, (debtAbs / displayLimit) * 100) : 0;

            return (
                <div className="flex flex-col gap-1.5 min-w-[120px] items-end justify-center">
                    <div className="flex items-center gap-2 w-full justify-end">
                        <div className="tabular-nums font-black text-slate-600 text-xs text-right">
                            {displayLimit ? formatMoneyVND(displayLimit) : '—'}
                        </div>
                    </div>
                    {displayLimit > 0 && (
                        <div className="w-full max-w-[100px] space-y-0.5">
                            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden relative border border-slate-300/50">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        limitProgress > 90 ? "bg-rose-500" : limitProgress > 70 ? "bg-amber-500" : "bg-indigo-500"
                                    )}
                                    style={{ width: `${Math.max(limitProgress, 2)}%` }}
                                />
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 text-right flex items-center justify-end gap-1">
                                <span>{formatMoneyVND(debtAbs)}</span>
                                <span className="text-slate-300">/</span>
                                <span>{limitProgress.toFixed(0)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        case 'spent':
            const minSpend = stats?.min_spend || 0;
            const spent = stats?.spent_this_cycle || 0;
            const isQualified = stats?.is_qualified || false;
            const progress = minSpend > 0 ? Math.min(100, (spent / minSpend) * 100) : 0;
            const needAmount = Math.max(0, minSpend - spent);

            if (account.type !== 'credit_card' && spent === 0) return <span className="text-slate-300">—</span>;

            return (
                <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                        <span className={cn(spent > 0 ? "text-slate-700" : "text-slate-400")}>
                            {formatMoneyVND(spent)} / {minSpend > 0 ? formatMoneyVND(minSpend) : 'No Target'}
                        </span>
                        {minSpend > 0 && !isQualified && spent > 0 && (
                            <span className="text-amber-600 flex items-center gap-0.5 font-bold">
                                <TrendingDown className="w-3 h-3" />
                                {formatMoneyVND(needAmount)}
                            </span>
                        )}
                        {isQualified && (
                            <span className="text-emerald-600 font-black">OK</span>
                        )}
                    </div>
                    {minSpend > 0 && (
                        <Progress value={progress} className={cn("h-1.5", isQualified ? "bg-emerald-100 [&>div]:bg-emerald-500" : "bg-amber-100 [&>div]:bg-amber-500")} />
                    )}
                </div>
            );
        case 'due':
            if (account.type !== 'credit_card' && account.type !== 'debt') return <span className="text-slate-300">—</span>;

            const dueDate = stats?.due_date ? new Date(stats.due_date) : null;
            let daysLeft: number | null = null;
            if (dueDate) {
                const diffTime = dueDate.getTime() - new Date().getTime();
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            return (
                <div className="flex flex-col gap-1 items-end">
                    {daysLeft !== null && (
                        <div className={cn(
                            "text-xs font-black uppercase tracking-tight flex items-center gap-1",
                            daysLeft <= 3 ? "text-rose-600" : "text-slate-700"
                        )}>
                            {daysLeft <= 0 ? (daysLeft === 0 ? 'Due Today' : `${Math.abs(daysLeft)}D LATE`) : `${daysLeft}D Left`}
                            {daysLeft <= 3 && <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />}
                        </div>
                    )}
                    <div className="text-[10px] font-bold text-slate-400">
                        {stats?.due_date_display || 'No Date'}
                    </div>
                </div>
            );
        case 'balance':
            // Logic: Balance column displays family balance if it's a parent
            const displayBalance = familyBalance ?? account.current_balance;
            return (
                <div className="flex flex-col items-end text-right gap-0.5">
                    <div className={cn(
                        "tabular-nums text-sm font-black tracking-tight",
                        displayBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                        {formatMoneyVND(displayBalance)}
                    </div>
                    {/* Family badge removed from here */}
                </div>
            );
            let ruleCount = 0;
            let rulesDetails: any[] = [];

            // Handle legacy structure (categoryRules at root)
            const config = account.cashback_config as any;
            if (config?.categoryRules) {
                ruleCount = Object.keys(config.categoryRules).length;
                rulesDetails = Object.entries(config.categoryRules).map(([catId, rule]: [string, any]) => ({
                    level: 'Legacy',
                    rate: rule.rate,
                    desc: `${(rule.rate * 100).toFixed(1)}%`
                }));
            }
            // Handle new structure (program.levels -> rules)
            else if (config?.program?.levels) {
                // Sum up rules across all levels
                config.program.levels.forEach((lvl: any) => {
                    if (lvl.rules) {
                        lvl.rules.forEach((r: any) => {
                            ruleCount++;
                            rulesDetails.push({
                                level: lvl.name,
                                rate: r.rate,
                                desc: `${(r.rate * 100).toFixed(1)}%`
                            });
                        });
                    }
                });
            }

            if (ruleCount === 0) {
                return <div className="text-slate-400 text-xs">\u2014</div>;
            }

            return (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="h-5 px-2 text-[9px] bg-purple-50 text-purple-700 border-purple-200 font-black whitespace-nowrap">
                        {ruleCount} {ruleCount === 1 ? 'RULE' : 'RULES'}
                    </Badge>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-purple-600">
                                <Eye className="h-3 w-3" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-500 border-b pb-1">Cashback Rules</h4>
                                <div className="space-y-1">
                                    {rulesDetails.map((rule, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs">
                                            <span className="text-slate-600 font-medium truncate max-w-[120px]" title={rule.level}>{rule.level}</span>
                                            <span className="font-bold text-emerald-600">{rule.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            );
        case 'action':
            const isCC = account.type === 'credit_card';
            const isDebt = account.type === 'debt';
            const canPay = isCC || isDebt;
            const canTransfer = !isCC; // Only allow transfer for bank/cash/ewallet

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
        default:
            return '—';
    }
}

function ActionButtonsWithLoading({ actions, account, isCC, isDebt }: any) {
    const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

    const handleAction = async (action: string, callback: any) => {
        setLoadingAction(action);
        // Simulate loading for UI feedback if sync, or wait if async
        // Since callbacks are void, we just show it briefly or until slide opens?
        // Slide opening is fast. User asked for "loading indicator... avoiding freeze feeling".
        // Just setting state will re-render with spinner.

        // This relies on React flush.
        setTimeout(() => {
            callback(account);
            setLoadingAction(null);
        }, 300); // 300ms fake delay to show spinner? or just 0? User asked for visible indicator. 
        // 0 might be too fast to see. 
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

function formatMoneyVND(amount: number) {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('vi-VN').format(amount);
}
