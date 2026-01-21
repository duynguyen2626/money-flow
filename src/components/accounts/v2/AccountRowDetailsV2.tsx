import React from 'react';
import { Account, TransactionWithDetails } from "@/types/moneyflow.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { loadTransactions } from "@/services/transaction.service";
import Link from "next/link";
import { Wallet, ArrowUpRight, ArrowDownLeft, RotateCcw, Copy, Check, CreditCard, Banknote, HandCoins, Link2, LucideIcon } from "lucide-react";
import { toast } from "sonner";

interface AccountRowDetailsProps {
    account: Account;
    isExpanded: boolean;
    allAccounts?: Account[];
}

export function AccountRowDetailsV2({ account, isExpanded, allAccounts = [] }: AccountRowDetailsProps) {
    const [transactions, setTransactions] = React.useState<TransactionWithDetails[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [copiedId, setCopiedId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (isExpanded && account.id) {
            setIsLoading(true);
            loadTransactions({ accountId: account.id, limit: 3 })
                .then(setTransactions)
                .finally(() => setIsLoading(false));
        }
    }, [isExpanded, account.id]);

    if (!isExpanded) return null;

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(Math.abs(amount));
    };

    const getAccountIcon = (type: string): LucideIcon => {
        switch (type) {
            case 'credit_card': return CreditCard;
            case 'bank': return Banknote;
            case 'ewallet': return Wallet;
            case 'savings': return ArrowUpRight;
            case 'debt': return HandCoins;
            default: return Wallet;
        }
    };

    const renderIcon = (type: string, url: string | null | undefined, name: string, sizeClass: string = "h-5 w-5") => {
        if (url) return <img src={url} className={cn(sizeClass, "object-contain rounded-sm")} />;
        const Icon = getAccountIcon(type);
        return (
            <div className={cn(sizeClass, "flex items-center justify-center bg-slate-100 rounded text-slate-400 p-0.5")}>
                <Icon className="w-full h-full" />
            </div>
        );
    };

    const copyToClipboard = (text: string, id: string) => {
        const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        navigator.clipboard.writeText(cleanText);
        setCopiedId(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Get parent account if this is a child
    const parentAccount = account.parent_account_id
        ? allAccounts.find(a => a.id === account.parent_account_id)
        : null;

    // Calculate totals or derived stats
    // Logic: Balance is interpreted as debt for credit cards in this app
    const totalSpentDebt = Math.abs(account.current_balance || 0);
    const spentThisCycle = account.stats?.spent_this_cycle || 0;
    const creditLimit = parentAccount ? (parentAccount.credit_limit || 0) : (account.credit_limit || 0);
    const isInheritedLimit = !!parentAccount;

    return (
        <div className="p-4 bg-muted/40 border-t animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Relationships + Stats + IDs */}
                <div className="space-y-4">
                    {/* Section A: Relationships */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-1">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Relationships & ID</h4>
                            {/* Main Account ID Copy */}
                            <button
                                onClick={() => copyToClipboard(account.account_number || account.id, account.id)}
                                className="text-[9px] font-mono text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white"
                            >
                                <span className="opacity-50">#</span>
                                {account.account_number ? `${account.account_number} • ${account.id.slice(0, 8)}` : account.id.slice(0, 12)}
                                {copiedId === account.id ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                            </button>
                        </div>

                        {/* Parent Relationship */}
                        {parentAccount && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-tight">
                                    <span>Parent Account</span>
                                    {parentAccount.account_number && (
                                        <span className="font-mono lowercase opacity-50">{parentAccount.account_number}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {renderIcon(parentAccount.type, parentAccount.image_url, parentAccount.name, "h-8 w-8")}
                                    <div className="flex flex-col min-w-0">
                                        <Link href={`/accounts/v2/${parentAccount.id}`} className="text-sm font-black text-indigo-600 hover:underline truncate">
                                            {parentAccount.name}
                                        </Link>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-slate-400 truncate">{parentAccount.id}</span>
                                            <button onClick={() => copyToClipboard(parentAccount.id, `parent-${parentAccount.id}`)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                                                {copiedId === `parent-${parentAccount.id}` ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Secured Relationship */}
                        {account.secured_by_account_id && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm space-y-2">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Secured By</span>
                                {(() => {
                                    const secured = allAccounts.find(a => a.id === account.secured_by_account_id);
                                    const securedKey = `secured-${account.secured_by_account_id}`;
                                    return secured ? (
                                        <div className="flex items-center gap-3">
                                            {renderIcon(secured.type, secured.image_url, secured.name, "h-8 w-8")}
                                            <div className="flex flex-col min-w-0">
                                                <Link href={`/accounts/v2/${secured.id}`} className="text-sm font-black text-blue-600 hover:underline truncate">
                                                    {secured.name}
                                                </Link>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono text-slate-400 truncate">{secured.id}</span>
                                                    <button onClick={() => copyToClipboard(secured.id, securedKey)} className="text-slate-300 hover:text-blue-500 transition-colors">
                                                        {copiedId === securedKey ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : <span className="text-slate-400 text-xs">Unknown collateral</span>;
                                })()}
                            </div>
                        )}

                        {/* Child Accounts */}
                        {account.relationships?.is_parent && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm space-y-3">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight">Child Accounts</p>
                                <div className="space-y-2">
                                    {allAccounts.filter(a => a.parent_account_id === account.id).map(child => (
                                        <div key={child.id} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {renderIcon(child.type, child.image_url, child.name, "h-7 w-7")}
                                                <div className="flex flex-col min-w-0">
                                                    <Link href={`/accounts/v2/${child.id}`} className="text-xs font-black text-slate-700 hover:text-indigo-600 truncate">
                                                        {child.name}
                                                    </Link>
                                                    <span className="text-[9px] font-mono text-slate-400 truncate lowercase">{child.id.slice(0, 16)}...</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="font-black text-slate-600 tabular-nums text-xs">
                                                    {formatMoney(child.current_balance || 0)}
                                                </span>
                                                <button onClick={() => copyToClipboard(child.id, `child-${child.id}`)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                                                    {copiedId === `child-${child.id}` ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2 w-2" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section B: Account Details (Financial Stats) */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Account Details</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                                <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Spent (Cycle)</p>
                                <p className="text-sm font-black text-slate-700">{formatMoney(spentThisCycle)}</p>
                            </div>
                            <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                                <p className="text-[9px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                                    Limit {isInheritedLimit && <span className="text-indigo-500" title="Inherited from parent">↑</span>}
                                </p>
                                {creditLimit > 0 ? (
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-slate-700">{formatMoney(creditLimit)}</p>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{((totalSpentDebt / creditLimit) * 100).toFixed(0)}%</span>
                                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all",
                                                        (totalSpentDebt / creditLimit) > 0.9 ? "bg-rose-500" :
                                                            (totalSpentDebt / creditLimit) > 0.7 ? "bg-amber-500" : "bg-indigo-500"
                                                    )}
                                                    style={{ width: `${Math.min(100, (totalSpentDebt / creditLimit) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm font-black text-slate-700">{formatMoney(creditLimit)}</p>
                                )}
                            </div>
                            <div className="p-2 bg-rose-50 rounded border border-rose-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-12 h-12 -mr-4 -mt-4 bg-rose-500/5 rounded-full" />
                                <p className="text-[9px] text-rose-500 uppercase font-black mb-1">Standalone Balance (Debt)</p>
                                <p className="text-sm font-black text-rose-700 tabular-nums">{formatMoney(totalSpentDebt)}</p>
                                <p className="text-[8px] text-rose-400 font-medium mt-1">Nợ tích lũy riêng thẻ này</p>
                            </div>
                            <div className="p-2 bg-slate-50 rounded border border-slate-100 shadow-sm">
                                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Shared Credit Status</p>
                                <div className="flex items-end gap-1.5">
                                    <p className="text-sm font-black text-slate-700 tabular-nums">
                                        {formatMoney(creditLimit - (parentAccount?.current_balance || account.current_balance || 0))}
                                    </p>
                                    <span className="text-[9px] text-slate-400 font-bold mb-0.5">Avail</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: IDs + Recent Transactions */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Recent Transactions</h4>
                    <div className="space-y-2">
                        {isLoading ? (
                            <>
                                <div className="h-10 bg-slate-100 rounded animate-pulse" />
                                <div className="h-10 bg-slate-100/50 rounded animate-pulse" />
                                <div className="h-10 bg-slate-100/30 rounded animate-pulse" />
                            </>
                        ) : transactions.length > 0 ? (
                            transactions.map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={cn(
                                            "h-7 w-7 rounded flex items-center justify-center shrink-0",
                                            txn.displayType === 'income' ? "bg-emerald-50 text-emerald-600" :
                                                txn.displayType === 'transfer' ? "bg-indigo-50 text-indigo-600" :
                                                    "bg-rose-50 text-rose-600"
                                        )}>
                                            {txn.displayType === 'income' ? <ArrowUpRight className="h-3.5 w-3.5" /> :
                                                txn.displayType === 'transfer' ? <RotateCcw className="h-3.5 w-3.5" /> :
                                                    <ArrowDownLeft className="h-3.5 w-3.5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-slate-700 truncate">{txn.note || txn.category_name || 'No Description'}</p>
                                            <p className="text-[9px] text-slate-400 font-medium">
                                                {new Date(txn.occurred_at).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "text-xs font-black tabular-nums whitespace-nowrap",
                                        txn.displayType === 'income' ? "text-emerald-600" : "text-slate-700"
                                    )}>
                                        {txn.displayType === 'income' ? '+' : '-'}{formatMoney(txn.amount)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-300">
                                <RotateCcw className="h-8 w-8 opacity-20 mb-2" />
                                <p className="text-[10px] font-bold uppercase tracking-tight">No recent activity</p>
                            </div>
                        )}
                        {transactions.length > 0 && (
                            <Link
                                href={`/accounts/v2/${account.id}`}
                                className="block text-[10px] text-center text-blue-600 font-bold uppercase tracking-widest hover:underline pt-1"
                            >
                                View all history
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
