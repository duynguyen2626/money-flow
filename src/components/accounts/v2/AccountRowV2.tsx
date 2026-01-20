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
    AlertTriangle,
    ArrowUpRight,
    Loader2,
    Info,
    LucideIcon
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
import { normalizeCashbackConfig } from "@/lib/cashback";

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
                    "transition-all duration-200 cursor-pointer group/row",
                    isExpanded ? "bg-indigo-50/30 border-b-0" : "hover:bg-slate-50 border-b",
                    (() => {
                        if (account.type !== 'credit_card' && account.type !== 'debt') return "";
                        const now = new Date();

                        // Priority 1: High Urgency (Due or Rule < 5 days)
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

                        if (dueDays < 5 || ruleDays < 5) {
                            return "bg-rose-100 border-rose-200 hover:bg-rose-200 shadow-[inset_4px_0_0_0_#e11d48]";
                        }
                        if (dueDays !== Infinity || ruleDays !== Infinity) {
                            return "bg-rose-50/50 border-rose-100 hover:bg-rose-100/50 shadow-[inset_4px_0_0_0_#fb7185]";
                        }

                        // Priority 2: Spend More Needed (Yellow)
                        const remaining = (account.stats?.min_spend || 0) - (account.stats?.spent_this_cycle || 0);
                        if (account.stats?.min_spend && !account.stats?.is_qualified && remaining > 0) {
                            return "bg-amber-50 border-amber-200 hover:bg-amber-100 shadow-[inset_4px_0_0_0_#f59e0b]";
                        }

                        // Qualified status
                        if (account.stats?.is_qualified) {
                            return "bg-emerald-50/30 border-emerald-100 hover:bg-emerald-100/30";
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

    // Helper for compact money
    const formatCompactMoney = (amount: number) => {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(0) + 'k';
        }
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    const formatMoneyVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(Math.abs(amount));
    };

    switch (key) {
        case 'account':
            const children = allAccounts?.filter((a: Account) => a.parent_account_id === account.id) || [];

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

            const renderIcon = (type: string, url: string | null | undefined, name: string, sizeClass: string = "w-4 h-4", fontSizeClass: string = "text-[9px]") => {
                if (url) return <img src={url} className={cn(sizeClass, "object-contain rounded-sm")} />;
                const Icon = getPlaceholderIcon(type);
                return (
                    <div className={cn(sizeClass, "flex items-center justify-center bg-slate-100 rounded text-slate-400 p-0.5")}>
                        <Icon className="w-full h-full" />
                    </div>
                );
            };

            const MainPlaceholderIcon = getPlaceholderIcon(account.type);

            return (
                <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded overflow-hidden">
                            {account.image_url ? (
                                <img src={account.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 p-2 rounded">
                                    <MainPlaceholderIcon className="w-full h-full" />
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
                                                                {renderIcon(child.type, child.image_url, child.name)}
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
                                                        {renderIcon(account.relationships.parent_info.type, account.relationships.parent_info.image_url, account.relationships.parent_info.name)}
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
                <div className="flex flex-col gap-1.5 min-w-[120px] items-end justify-center py-1">
                    <div className="tabular-nums font-black text-slate-600 text-[11px] text-right">
                        {displayLimit ? formatMoneyVND(displayLimit) : '—'}
                    </div>
                    {displayLimit > 0 && (
                        <div className="w-full max-w-[100px] space-y-1">
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
        case 'rewards':
            if (account.type !== 'credit_card') return <span className="text-slate-300">—</span>;

            // --- SPENT LOGIC ---
            let spentContent = <div className="text-slate-400 text-[11px] font-black italic text-right w-full">No Target</div>;

            // Helper to render Rules Badge
            const renderRulesBadge = () => {
                let ruleCount = 0;
                const config = normalizeCashbackConfig(account.cashback_config);
                if (config?.levels) {
                    config.levels.forEach(lvl => ruleCount += (lvl.rules?.length || 0));
                }

                return ruleCount > 0 ? (
                    <Popover>
                        <PopoverTrigger>
                            <div className="h-3.5 px-1 rounded-full text-[8px] bg-purple-100 text-purple-700 border border-purple-200 font-black whitespace-nowrap hover:bg-purple-200 cursor-pointer flex items-center">
                                {ruleCount} RULES
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end" side="left">
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-500 border-b pb-1">Cashback Rules</h4>
                                <div className="space-y-1">
                                    {(() => {
                                        const rulesDetails: { level: string, desc: string }[] = [];
                                        if (config?.levels) {
                                            config.levels.forEach(lvl => {
                                                if (lvl.rules) {
                                                    lvl.rules.forEach(r => {
                                                        rulesDetails.push({
                                                            level: lvl.name || `Level ${new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(lvl.minTotalSpend)}`,
                                                            desc: r.description
                                                        });
                                                    });
                                                }
                                            });
                                        }
                                        return rulesDetails.map((rule, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-600 font-medium truncate max-w-[120px]" title={rule.level}>{rule.level}</span>
                                                <span className="font-bold text-emerald-600 truncate max-w-[120px]" title={rule.desc}>{rule.desc}</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                ) : null;
            };

            const rulesBadge = renderRulesBadge();

            if (stats?.min_spend) {
                const progress = Math.min((stats.spent_this_cycle / stats.min_spend) * 100, 100);
                const isMet = stats.spent_this_cycle >= stats.min_spend;
                const remaining = Math.max(0, stats.min_spend - stats.spent_this_cycle);

                spentContent = (
                    <div className="w-full max-w-[100px] space-y-1">
                        <div className="flex items-center justify-end gap-1.5 h-4 mb-0.5">
                            {/* Reorganized: Rules - Amount - Info */}
                            {rulesBadge}

                            <span className={cn(
                                "text-[11px] font-black tabular-nums",
                                !isMet ? "text-amber-600" : "text-emerald-600"
                            )}>
                                {!isMet ? new Intl.NumberFormat('vi-VN').format(remaining) : 'QUALIFIED'}
                            </span>

                            <TooltipProvider>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Info className={cn("w-3 h-3 cursor-help shrink-0", !isMet ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600")} />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[11px] font-bold p-2 bg-slate-900 text-white z-50">
                                        <div className="flex flex-col gap-1">
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                                                <span className="text-slate-400">Spent:</span>
                                                <span className="text-right text-emerald-400">{new Intl.NumberFormat('vi-VN').format(stats.spent_this_cycle)}</span>
                                                <span className="text-slate-400">Target:</span>
                                                <span className="text-right text-indigo-400">{new Intl.NumberFormat('vi-VN').format(stats.min_spend)}</span>
                                                <span className="text-slate-400 border-t border-slate-700 pt-1">Spend More:</span>
                                                <span className="text-right text-amber-400 border-t border-slate-700 pt-1 font-black">
                                                    {remaining > 0 ? new Intl.NumberFormat('vi-VN').format(remaining) : '0'}
                                                </span>
                                            </div>
                                            {!isMet && <p className="text-[9px] text-amber-500 italic text-center mt-1">Cần chi thêm để đạt cashback</p>}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <Progress value={progress} className="h-1.5" indicatorClassName={isMet ? "bg-emerald-500" : "bg-indigo-500"} />
                        <div className="flex justify-end items-center text-[9px] text-slate-400 font-bold gap-1 mt-0.5 whitespace-nowrap">
                            {!isMet && (
                                <span className="text-amber-600 flex items-center gap-1">
                                    SPEND MORE {formatCompactMoney(remaining)}
                                </span>
                            )}
                            {isMet && <span className="text-emerald-600">TARGET MET</span>}
                        </div>
                    </div>
                );
            } else if (rulesBadge) {
                // Fallback: No min_spend but has rules (e.g., complex tier cards)
                // Show Rules Badge + Actual Spent
                spentContent = (
                    <div className="w-full max-w-[100px] space-y-1">
                        <div className="flex items-center justify-end gap-1.5 h-4 mb-0.5">
                            {rulesBadge}
                            <span className="text-[11px] font-black text-slate-700 tabular-nums">
                                {new Intl.NumberFormat('vi-VN').format(stats?.spent_this_cycle || 0)}
                            </span>
                        </div>
                        <div className="flex justify-end text-[9px] text-slate-400 font-bold gap-1 mt-0.5">
                            <span>No Fixed Target</span>
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-end justify-center gap-1.5 py-1 min-w-[120px]">
                    {spentContent}
                </div>
            );
        case 'due':
            if (account.type !== 'credit_card' && account.type !== 'debt') return <span className="text-slate-300">—</span>;

            const dueDate = stats?.due_date ? new Date(stats.due_date) : null;
            let daysLeft = Infinity;
            if (dueDate) {
                const diffTime = dueDate.getTime() - new Date().getTime();
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            if (daysLeft === Infinity) return <span className="text-slate-300">—</span>;

            return (
                <div className="flex flex-col gap-1 items-end">
                    <div className={cn(
                        "text-xs font-normal text-slate-700 tracking-tight flex items-center justify-end gap-1",
                        daysLeft <= 5 && "text-rose-700"
                    )}>
                        <span className="font-black text-sm">{Math.abs(daysLeft)}</span>
                        <span className="font-bold opacity-80 uppercase text-[9px]">{daysLeft === 0 ? 'today' : (daysLeft < 0 ? 'days ago' : 'days')}</span>
                        <span className="text-slate-300 mx-0.5">-</span>
                        <span className={cn("font-black text-sm", daysLeft <= 5 ? "text-rose-700" : "text-slate-600")}>
                            {dueDate ? new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(dueDate) : ''}
                        </span>
                        {daysLeft <= 5 && <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-rose-600 shrink-0" />}
                    </div>
                </div>
            );
        case 'balance':
            // Logic: Balance column displays family balance if it's a parent
            // If it's a Child (has parent), it should display PARENT's balance (Shared Debt).
            let displayBalance = familyBalance ?? account.current_balance;

            if (account.parent_account_id && allAccounts) {
                const parent = allAccounts.find(a => a.id === account.parent_account_id);
                if (parent) {
                    displayBalance = parent.current_balance;
                }
            }

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
