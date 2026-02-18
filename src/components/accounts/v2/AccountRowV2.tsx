'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Account, Category } from "@/types/moneyflow.types";
import { AccountColumnConfig, AccountColumnKey } from "@/hooks/useAccountColumnPreferences";
import { ExpandIcon } from "@/components/transaction/ui/ExpandIcon";
import { AccountRowDetailsV2 } from "./AccountRowDetailsV2";
import { Button } from "@/components/ui/button";
import { VietnameseCurrency } from "@/components/ui/vietnamese-currency";
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
    TrendingUp,
    Calculator,
    Info,
    Zap,
    Users,
    Building2,
    User,
    CircleDashed,
    Crown,
    UserSquare2,
    ArrowRight
} from "lucide-react";
import { normalizeCashbackConfig } from "@/lib/cashback";

import { cn, formatCompactMoney, formatMoneyVND } from '@/lib/utils';
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
import { isToday, isTomorrow, startOfDay } from 'date-fns';
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
    people?: Person[];
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

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
    people: initialPeople,
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
                            modalRefreshKey,
                            initialPeople
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
    modalRefreshKey?: number,
    people?: Person[]
) {
    const { onEdit, onLend, onRepay, onPay, onTransfer } = actions;
    const stats = account.stats;

    const badgeBase = "h-6 px-3 text-[10px] font-semibold uppercase tracking-wide rounded-full border flex items-center justify-center gap-1 min-w-[96px]";

    const renderRoleBadge = (role: 'parent' | 'child' | 'standalone') => {
        const base = "h-7 px-3 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg border-2 flex items-center justify-center gap-2 w-[115px] shadow-sm transition-all duration-300";
        if (role === 'parent') {
            return (
                <div className={cn(base, "bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5")}>
                    <Users className="w-3.5 h-3.5 fill-current" />
                    <span>Parent</span>
                </div>
            );
        }
        if (role === 'child') {
            return (
                <div className={cn(base, "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:-translate-y-0.5")}>
                    <UserSquare2 className="w-3.5 h-3.5" />
                    <span>Child</span>
                </div>
            );
        }
        return (
            <div className={cn(base, "bg-slate-50 text-slate-500 border-slate-200 shadow-none opacity-80")}>
                <User className="w-3.5 h-3.5 opacity-60" />
                <span>Solo</span>
            </div>
        );
    };

    const renderOwnershipBadge = (type: 'me' | 'relative' | 'other', personId?: string | null) => {
        const base = "w-8 h-8 flex items-center justify-center rounded-none border-2 shadow-sm transition-all duration-300 shrink-0 cursor-help group/owner";
        let content;
        let tooltipLabel = "Other";

        if (!type || type === 'me') {
            content = (
                <div className={cn(base, "bg-amber-400 text-amber-950 border-amber-500 hover:shadow-amber-400/30 hover:scale-110")}>
                    <Crown className="w-4 h-4 fill-current animate-pulse" />
                </div>
            );
            tooltipLabel = "Personal Ownership (Mine)";
        } else if (type === 'relative') {
            const p = people?.find(p => p.id === personId);
            tooltipLabel = p?.name ? `Owner: ${p.name}` : "Family Member";
            content = (
                <div className={cn(base, "bg-white border-sky-400 p-0 hover:border-sky-600 hover:scale-110")}>
                    {p?.image_url ? (
                        <img src={p.image_url} className="w-full h-full rounded-none object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-sky-50 text-sky-600">
                            <Users className="w-4 h-4" />
                        </div>
                    )}
                </div>
            );
        } else {
            content = (
                <div className={cn(base, "bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-500 hover:scale-110")}>
                    <Building2 className="w-4 h-4" />
                </div>
            );
            tooltipLabel = "Corporate / Other Ownership";
        }

        return (
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
                    <TooltipContent className="p-2 shadow-xl border-slate-200 rounded-xl">
                        {type === 'relative' ? (() => {
                            const p = people?.find(p => p.id === personId);
                            return (
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-none overflow-hidden bg-slate-100 border border-slate-200">
                                        {p?.image_url ? (
                                            <img src={p.image_url} className="w-full h-full object-contain" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-tighter text-[10px]">No Img</div>
                                        )}
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider">RELATIVE OWNER</p>
                                        <p className="text-[12px] font-bold text-slate-900 leading-tight">{p?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                            );
                        })() : (
                            <p className="text-[10px] font-black uppercase tracking-widest px-1">{tooltipLabel}</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
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
        if (url) return <img src={url} className={cn(sizeClass, "object-contain rounded-none")} alt="" />;
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
                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-none overflow-hidden">
                            {account.image_url ? (
                                <img src={account.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 p-2 rounded-none">
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

                                <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex items-center gap-2">
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
                                    {(account.receiver_name || account.account_number) && (
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {account.receiver_name && (
                                                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]" title={account.receiver_name}>
                                                    {account.receiver_name}
                                                </span>
                                            )}
                                            {account.receiver_name && account.account_number && <span className="h-0.5 w-0.5 rounded-full bg-slate-200" />}
                                            {account.account_number && (
                                                <code className="text-[9px] font-bold text-slate-400 tracking-tight bg-slate-50 px-1 rounded-sm border border-slate-100">
                                                    {account.account_number}
                                                </code>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-nowrap items-center gap-1.5 justify-end whitespace-nowrap">
                                {/* 1. Cashback Category Badges (Moved to first) */}
                                {(() => {
                                    if (!account.cashback_config) return null;
                                    try {
                                        const config = normalizeCashbackConfig(account.cashback_config, account);
                                        const levels = config.levels || [];
                                        const firstLevel = levels[0];
                                        const rules = firstLevel?.rules || [];
                                        const defaultRate = firstLevel?.defaultRate ?? config.defaultRate ?? 0;

                                        const hasRules = Array.isArray(rules) && rules.length > 0;
                                        if (!hasRules && defaultRate === 0) return null;

                                        const catIds = new Set<string>();
                                        if (hasRules) {
                                            rules.forEach((r: any) => {
                                                if (Array.isArray(r.categoryIds)) r.categoryIds.forEach((id: string) => catIds.add(id));
                                                if (r.categoryId) catIds.add(r.categoryId);
                                                if (Array.isArray(r.category_ids)) r.category_ids.forEach((id: string) => catIds.add(id));
                                            });
                                        }

                                        const allCatIds = Array.from(catIds);
                                        const mainCatId = allCatIds[0];
                                        const mainCat = categories?.find(c => c.id === mainCatId);
                                        const remainingCount = allCatIds.length - 1;

                                        const badgeLabel = hasRules
                                            ? (mainCat ? mainCat.name : "Rules")
                                            : "All Categories";

                                        const badgeRate = hasRules && rules[0]?.rate !== undefined
                                            ? rules[0].rate
                                            : defaultRate;

                                        return (
                                            <div className="flex items-center gap-1.5 font-sans">
                                                <TooltipProvider>
                                                    <Tooltip delayDuration={300}>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-md px-2 py-0.5 hover:bg-indigo-100/50 transition-all cursor-help group/rewards shadow-sm">
                                                                <Zap className="w-3 h-3 text-indigo-500 animate-pulse" />
                                                                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-700 uppercase tracking-tight">
                                                                    <span className="truncate max-w-[160px]">{badgeLabel}</span>
                                                                    <span className="text-indigo-400 font-bold ml-0.5">{(badgeRate * 100).toFixed(1)}%</span>
                                                                </div>
                                                                {remainingCount > 0 && (
                                                                    <span className="text-[9px] font-black text-indigo-400 border-l border-indigo-200/50 pl-1.5 ml-0.5">
                                                                        +{remainingCount}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="p-0 border-none bg-transparent shadow-2xl">
                                                            <div className="w-[300px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
                                                                <div className="bg-indigo-600 px-3.5 py-2.5 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Zap className="w-4 h-4 text-white fill-white/20" />
                                                                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Rewards Program</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-indigo-100 bg-white/10 px-2 py-0.5 rounded-full">
                                                                        {hasRules ? `${allCatIds.length} categories` : "Flat Rate"}
                                                                    </span>
                                                                </div>
                                                                <div className="p-3 space-y-1">
                                                                    {hasRules ? (
                                                                        allCatIds.map(cid => {
                                                                            const cat = categories?.find(c => c.id === cid);
                                                                            if (!cat) return null;
                                                                            return (
                                                                                <div key={cid} className="flex items-center justify-between gap-4 group/cat py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-1 rounded-lg transition-colors">
                                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                                        <span className="text-base leading-none drop-shadow-sm">{cat.icon || '🎯'}</span>
                                                                                        <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{cat.name}</span>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end">
                                                                                        <span className="text-[11px] font-black text-emerald-600">{((rules.find((r: any) => r.categoryIds?.includes(cid))?.rate ?? 0) * 100).toFixed(1)}%</span>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        })
                                                                    ) : (
                                                                        <div className="py-2 flex items-center justify-between">
                                                                            <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">General Spend</span>
                                                                            <span className="text-[11px] font-black text-emerald-600">{(defaultRate * 100).toFixed(1)}%</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {hasRules && defaultRate > 0 && (
                                                                    <div className="bg-slate-50/80 border-t border-slate-100 px-3 py-2 flex justify-between items-center">
                                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Other spend</span>
                                                                        <span className="text-[9px] font-black text-slate-700">{(defaultRate * 100).toFixed(1)}%</span>
                                                                    </div>
                                                                )}
                                                                <div className="bg-slate-50 border-t border-slate-100 px-3 py-1.5">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center italic">Detailed MCC matching is required for cashback eligibility</p>
                                                                </div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        );
                                    } catch (e) {
                                        return null;
                                    }
                                })()}
                            </div>
                        </div>
                    </div>

                    {
                        isExpanded && children.length > 0 && (
                            <div className="ml-10 flex flex-col gap-1 border-l-2 border-indigo-100 pl-3 py-1">
                                {children.map((child: Account) => (
                                    <div key={child.id} className="flex items-center justify-between gap-2 py-0.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-white rounded-none overflow-hidden p-1">
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
                        )
                    }
                </div >
            );
        }
        case 'role': {
            return (
                <div className="flex flex-row items-center justify-center min-w-[190px] group/role-cell">
                    {/* Role Badge (Left) */}
                    <div className="flex-shrink-0">
                        {account.relationships?.is_parent ? (
                            <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-help">{renderRoleBadge('parent')}</div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-900 text-white border-slate-800 p-3 rounded-xl shadow-2xl">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/10 pb-1.5">Child Accounts</p>
                                            {allAccounts?.filter(a => a.parent_account_id === account.id).map(child => (
                                                <div key={child.id} className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2">
                                                        {renderIcon(child.type, child.image_url, child.name, "w-5 h-5")}
                                                        <span className="text-xs font-medium text-slate-200">{child.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black tabular-nums text-slate-400">{formatMoneyVND(child.current_balance || 0)}</span>
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
                                    <TooltipContent className="bg-slate-900 text-white border-slate-800 p-3 rounded-xl shadow-2xl">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/10 pb-1.5">Parent Account</p>
                                            <div className="flex items-center gap-3">
                                                {renderIcon(account.relationships.parent_info.type, account.relationships.parent_info.image_url, account.relationships.parent_info.name, "w-8 h-8")}
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-200">{account.relationships.parent_info.name}</span>
                                                    <span className="text-[10px] text-slate-500 italic uppercase">Primary Authorized</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            renderRoleBadge('standalone')
                        )}
                    </div>

                    {/* Connector Arrow */}
                    <div className="flex items-center justify-center w-8 overflow-hidden">
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover/role-cell:text-indigo-400 group-hover/role-cell:translate-x-0.5 transition-all duration-300" />
                    </div>

                    {/* Ownership Badge (Right) */}
                    <div className="flex-shrink-0">
                        {renderOwnershipBadge(account.holder_type as any, account.holder_person_id)}
                    </div>
                </div>
            )
        }
        case 'limit': {
            const isCC = account.type === 'credit_card';

            if (!isCC) {
                return (
                    <div className="flex flex-col items-end justify-center min-w-[140px] py-1 text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-2">Status / Type</span>
                        <div className="flex items-center gap-1.5">
                            {account.secured_by_account_id ? (
                                <span className="h-5 px-2.5 flex items-center bg-indigo-500/10 text-indigo-600 border border-indigo-200 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-sm shadow-sm shadow-indigo-500/5">Secured</span>
                            ) : (
                                <span className="h-5 px-2.5 flex items-center bg-slate-500/5 text-slate-500 border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-sm">
                                    {account.type === 'savings' ? 'Savings' : account.type === 'ewallet' ? 'Digital Wallet' : 'Checking'}
                                </span>
                            )}
                        </div>
                    </div>
                );
            }

            const isParent = account.relationships?.is_parent;
            const parentId = account.parent_account_id;
            const parentAccount = parentId ? allAccounts?.find(a => a.id === parentId) : null;

            const displayLimit = parentAccount ? (parentAccount.credit_limit || 0) : (account.credit_limit || 0);
            const cardDebtAbs = Math.abs(account.current_balance || 0);
            let familyDebt = account.current_balance || 0;
            let parentBalance = account.parent_account_id ? (parentAccount?.current_balance || 0) : (account.current_balance || 0);
            let childrenBalances = 0;

            if (isParent && allAccounts) {
                childrenBalances = allAccounts
                    .filter(a => a.parent_account_id === account.id)
                    .reduce((sum, child) => sum + (child.current_balance || 0), 0);
                familyDebt = (account.current_balance || 0) + childrenBalances;
            } else if (parentId && parentAccount && allAccounts) {
                childrenBalances = allAccounts
                    .filter(a => a.parent_account_id === parentId)
                    .reduce((sum, child) => sum + (child.current_balance || 0), 0);
                familyDebt = (parentAccount.current_balance || 0) + childrenBalances;
            }

            const familyDebtAbs = Math.abs(familyDebt);
            const limit = displayLimit;
            // Logic: High remaining (100%) is Good/Indigo, Low remaining (<10%) is Danger/Rose
            const remainingPercent = limit > 0 ? Math.max(0, 100 - (familyDebtAbs / limit) * 100) : 0;
            const remainingPercLabel = remainingPercent.toFixed(0);
            const hasWaiver = !!(account.stats?.annual_fee_waiver_target && account.stats.annual_fee_waiver_target > 0);

            return (
                <div className="flex flex-col items-end gap-2 min-w-[140px] py-1">
                    <div className="flex flex-col items-end gap-1.5 w-full group/limit">
                        <div className="flex items-center gap-2 justify-end w-full px-0.5 min-h-[16px]">
                            {!!account.secured_by_account_id && (
                                <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <div className="h-4 px-1.5 flex items-center justify-center bg-indigo-600 text-white border border-indigo-700 rounded-[4px] text-[8px] font-black uppercase tracking-widest cursor-help leading-none shadow-md shadow-indigo-600/10">
                                                SECURED
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
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
                            {!!(account.stats?.annual_fee_waiver_target && account.stats.annual_fee_waiver_target > 0) && (
                                (() => {
                                    const target = account.stats.annual_fee_waiver_target || 0;
                                    const rawSpent = account.stats.spent_this_cycle || 0;
                                    const currentBalanceAbs = Math.abs(account.current_balance || 0);
                                    const spent = Math.max(rawSpent, currentBalanceAbs);
                                    const remaining = target - spent;
                                    const isMet = remaining <= 0;

                                    const formatWaiverAmount = (val: number) => {
                                        const absVal = Math.abs(val);
                                        if (absVal >= 1000000) return (val / 1000000).toFixed(1) + "tr";
                                        return formatCompactMoney(val);
                                    };

                                    return (
                                        <div className={cn(
                                            "h-4 px-2 flex items-center justify-center border rounded-[4px] text-[8px] font-black leading-none shadow-sm uppercase tracking-wider",
                                            isMet
                                                ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                                                : "bg-amber-100 text-amber-900 border-amber-300"
                                        )}>
                                            {isMet ? 'Waiver met' : `Needs ${formatWaiverAmount(remaining)}`}
                                        </div>
                                    );
                                })()
                            )}
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Limit</span>
                            <span className={cn(
                                "font-black text-[11px] tabular-nums leading-none",
                                displayLimit > 100000000 ? "text-rose-600" : displayLimit >= 50000000 ? "text-amber-600" : "text-emerald-600"
                            )}>
                                {displayLimit ? formatMoneyVND(displayLimit) : '—'}
                            </span>
                        </div>

                        {displayLimit > 0 && (
                            <div className={cn(
                                "relative w-full h-6 bg-slate-100/50 rounded-lg border border-slate-200 overflow-hidden group transition-all duration-300 hover:border-indigo-300 hover:shadow-inner",
                                hasWaiver && "border-amber-200 shadow-[inset_0_0_8px_rgba(245,158,11,0.05)]"
                            )}>
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

                                <div
                                    className={cn(
                                        "absolute inset-0 h-full transition-all duration-700 ease-in-out shadow-[0_0_15px_rgba(0,0,0,0.1)]",
                                        remainingPercent < 10 ? "bg-gradient-to-r from-rose-500 to-rose-600" :
                                            remainingPercent < 30 ? "bg-gradient-to-r from-amber-500 to-amber-600" :
                                                "bg-gradient-to-r from-indigo-500 to-indigo-600"
                                    )}
                                    style={{ width: `${Math.max(remainingPercent, 0)}%` }}
                                />
                                {hasWaiver && (
                                    <div className="absolute top-0 left-0 w-full h-[1.5px] bg-amber-400/80 blur-[0.5px] z-10" />
                                )}

                                <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
                                    <div className="flex items-center gap-1">
                                        {hasWaiver && (
                                            <Zap className="w-2.5 h-2.5 text-white animate-pulse drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]" />
                                        )}
                                        <span className="text-[10px] font-black text-white drop-shadow-sm tabular-nums">
                                            {remainingPercLabel}% <span className="text-[7px] opacity-70 ml-0.5">REMAINING</span>
                                        </span>
                                    </div>
                                    <div />
                                </div>

                                <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <div className="absolute inset-0 flex items-center justify-end px-2.5 cursor-help pointer-events-auto">
                                                <span className="text-[9px] font-black text-slate-700/80 tabular-nums bg-white/40 backdrop-blur-sm px-1.5 py-0.5 rounded transition-colors group-hover:bg-white/80 flex items-center gap-1">
                                                    <Calculator className="w-2.5 h-2.5 opacity-60" />
                                                    {numberFormatter.format(familyDebtAbs)}
                                                </span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="p-4 min-w-[280px] bg-slate-900/95 backdrop-blur-xl text-slate-100 border-white/10 shadow-2xl z-[9999] rounded-2xl font-sans">
                                            <div className="space-y-5">
                                                {/* Section 1: Balance Calculation */}
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-indigo-400 underline underline-offset-4 decoration-2 uppercase tracking-widest flex items-center gap-2">
                                                        <Calculator className="w-4 h-4" />
                                                        Balance Formula
                                                    </p>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-slate-400">Card Active Balance:</span>
                                                            <span className="font-bold tabular-nums text-white">{formatMoneyVND(parentBalance)}</span>
                                                        </div>
                                                        {childrenBalances > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-slate-400">Supplementary Cards:</span>
                                                                <span className="font-bold tabular-nums text-indigo-300">+ {formatMoneyVND(childrenBalances)}</span>
                                                            </div>
                                                        )}
                                                        <div className="pt-2 mt-2 border-t border-white/10 flex justify-between gap-4">
                                                            <span className="text-indigo-400 font-black uppercase text-[10px]">Family Liability:</span>
                                                            <span className="font-black text-indigo-400 text-lg tabular-nums">{formatMoneyVND(familyDebtAbs)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section 2: Waiver Progress (Integrated) */}
                                                {hasWaiver && (
                                                    <div className="space-y-3 pt-3 border-t border-white/10">
                                                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                                            <Zap className="w-4 h-4 fill-amber-400" />
                                                            Fee Waiver Progress
                                                        </p>
                                                        <div className="space-y-2 text-sm bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-slate-400">Total Spent:</span>
                                                                <span className="font-bold tabular-nums text-amber-200">{formatMoneyVND(account.stats?.spent_this_cycle || 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-slate-400">Annual Target:</span>
                                                                <span className="font-bold tabular-nums text-white">{formatMoneyVND(account.stats?.annual_fee_waiver_target || 0)}</span>
                                                            </div>

                                                            {/* Mini Progress Bar in Tooltip */}
                                                            <div className="h-2 w-full bg-white/10 rounded-full mt-2 overflow-hidden border border-white/5">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000"
                                                                    style={{ width: `${Math.min(100, account.stats?.annual_fee_waiver_progress || 0)}%` }}
                                                                >
                                                                    <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] pt-1 font-black">
                                                                <span className="text-slate-500 uppercase">Current Progress</span>
                                                                <span className="text-amber-400">{(account.stats?.annual_fee_waiver_progress || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        case 'rewards': {
            const isCC = account.type === 'credit_card';

            if (!isCC) {
                // For non-credit cards, the "Rewards" column is used for "Interest & Fees"
                return (
                    <div className="flex flex-col items-end justify-center min-w-[150px] py-1 text-right  group/rewards">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-2 text-nowrap">Interest & Benefits</span>
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs font-black text-emerald-600 tabular-nums bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 group-hover/rewards:bg-emerald-500 group-hover/rewards:text-white transition-all duration-300">0.0% / yr</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">No Maint. Fees</span>
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-end justify-center min-w-[150px] transition-transform duration-300 hover:scale-[1.02]">
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
        }
        case 'due': {
            const isDueAccount = account.type === 'credit_card' || account.type === 'debt';
            const dueDate = stats?.due_date ? new Date(stats.due_date) : null;
            let daysLeft = Infinity;
            if (dueDate) {
                const diffTime = dueDate.getTime() - new Date().getTime();
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            const formatDate = (date: Date | null) => date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date) : '';

            const badgeWidth = "w-[140px]";
            const baseClass = cn(badgeBase, badgeWidth);

            if (!isDueAccount || daysLeft === Infinity) {
                return (
                    <div className="flex justify-center">
                        <span className={cn(baseClass, "bg-slate-50 text-slate-300 border-slate-100 italic shadow-none")}>
                            No Due Date
                        </span>
                    </div>
                );
            }

            const dayDate = startOfDay(dueDate!);
            const isDueToday = isToday(dayDate);
            const isDueTomorrow = isTomorrow(dayDate);

            const tone = isDueToday
                ? "bg-rose-100 text-rose-800 border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.2)]"
                : isDueTomorrow || (daysLeft > 0 && daysLeft <= 10)
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : daysLeft <= 0
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-emerald-100 text-emerald-800 border-emerald-300";

            const labelDate = formatDate(dueDate);
            const [month, day] = labelDate.split(' ');

            return (
                <div className="flex justify-center">
                    <span className={cn(baseClass, tone, isDueToday && "animate-pulse")}>
                        {isDueToday ? (
                            <span className="font-black text-xs uppercase tracking-tighter">Today Due</span>
                        ) : isDueTomorrow ? (
                            <span className="font-black text-xs uppercase tracking-tighter">Tomorrow</span>
                        ) : (
                            <>
                                <span className="font-medium text-xs"><b className="font-extrabold">{Math.abs(daysLeft)}</b> Days</span>
                                <span className="text-slate-400 mx-0.5 opacity-30">|</span>
                                <span className="font-medium text-xs uppercase tracking-tighter">{month} <b className="font-extrabold">{day}</b></span>
                            </>
                        )}
                    </span>
                </div>
            );
        }
        case 'balance': {
            const isCC = account.type === 'credit_card';
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

            // For Credit Cards, Balance means Available (Limit - Debt)
            const limit = isCC ? (balParentAccount ? (balParentAccount.credit_limit || 0) : (account.credit_limit || 0)) : 0;
            const debt = isCC ? Math.abs(displayBalance || 0) : 0;
            const finalBalance = isCC ? (limit - debt) : (displayBalance || 0);

            return (
                <TooltipProvider>
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <div className="flex flex-col items-end text-right gap-0.5 cursor-help min-w-[120px]">
                                <div className={cn(
                                    "tabular-nums text-[13px] font-black tracking-tight",
                                    Math.abs(finalBalance) > 100000000 ? "text-rose-600" : Math.abs(finalBalance) >= 50000000 ? "text-amber-600" : "text-emerald-600"
                                )}>
                                    {finalBalance < 0 ? "-" : ""}{formatMoneyVND(Math.round(Math.abs(finalBalance)))}
                                </div>
                                <VietnameseCurrency
                                    amount={finalBalance}
                                    variant="stylized"
                                    className="text-[11px]"
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="p-3 min-w-[200px] bg-slate-900 text-slate-100 border-slate-800 shadow-xl">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-700">
                                    <div className="h-5 w-5 rounded bg-emerald-500/20 flex items-center justify-center">
                                        <Calculator className="h-3 w-3 text-emerald-400" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                                        {isCC ? 'Available Balance' : 'Account Balance'}
                                    </span>
                                </div>

                                {isCC ? (
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-400">Credit Limit:</span>
                                            <span className="font-bold">{formatMoneyVND(limit)}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-400">Solid Debt:</span>
                                            <span className="font-bold text-rose-400">- {formatMoneyVND(debt)}</span>
                                        </div>
                                        <div className="pt-1.5 border-t border-slate-700 flex justify-between text-[11px]">
                                            <span className="text-emerald-400 font-bold">Remaining:</span>
                                            <span className="font-black text-emerald-400">{formatMoneyVND(finalBalance)}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 italic mt-2 border-t border-slate-800 pt-1">
                                            Formula: Limit + Total In - Total Out
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-[11px] pt-1 leading-relaxed text-slate-300">
                                        Direct balance from linked transactions and starting balance.
                                    </div>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
        case 'action': {
            const isCC = account.type === 'credit_card';
            const isDebt = account.type === 'debt';

            return (
                <TooltipProvider>
                    <div className="action-cell flex flex-nowrap items-center gap-1 justify-end whitespace-nowrap">
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
