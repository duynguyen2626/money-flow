import React from 'react';
import { Account, TransactionWithDetails } from "@/types/moneyflow.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { loadTransactions } from "@/services/transaction.service";
import Link from "next/link";
import { Wallet, ArrowUpRight, ArrowDownLeft, RotateCcw, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface AccountRowDetailsProps {
    account: Account;
    isExpanded: boolean;
    allAccounts?: Account[];
}

export function AccountRowDetailsV2({ account, isExpanded, allAccounts = [] }: AccountRowDetailsProps) {
    const [transactions, setTransactions] = React.useState<TransactionWithDetails[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);

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

    // Get parent account if this is a child
    const parentAccount = account.parent_account_id
        ? allAccounts.find(a => a.id === account.parent_account_id)
        : null;

    // Calculate totals or derived stats
    const totalOutstanding = Math.abs(account.current_balance < 0 ? account.current_balance : 0);
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
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Relationships</h4>

                        {/* Parent Relationship */}
                        {parentAccount && (
                            <div className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100">
                                <span className="text-slate-500 font-medium">Parent Account</span>
                                <Link href={`/accounts/v2/${parentAccount.id}`} className="flex items-center gap-1.5 text-indigo-600 font-bold hover:underline">
                                    {parentAccount.image_url && <img src={parentAccount.image_url} className="h-4 w-4 object-contain" />}
                                    {parentAccount.name}
                                </Link>
                            </div>
                        )}

                        {/* Secured Relationship */}
                        {account.secured_by_account_id && (
                            <div className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100">
                                <span className="text-slate-500 font-medium">Secured By</span>
                                {(() => {
                                    const secured = allAccounts.find(a => a.id === account.secured_by_account_id);
                                    return secured ? (
                                        <Link href={`/accounts/v2/${secured.id}`} className="flex items-center gap-1.5 text-emerald-600 font-bold hover:underline">
                                            {secured.image_url && <img src={secured.image_url} className="h-4 w-4 object-contain" />}
                                            {secured.name}
                                        </Link>
                                    ) : <span className="text-slate-400">Unknown</span>;
                                })()}
                            </div>
                        )}

                        {/* Child Accounts */}
                        {account.relationships?.is_parent && (
                            <div className="bg-white p-2 rounded border border-slate-100">
                                <p className="text-[9px] text-slate-400 uppercase font-black mb-1.5">Child Accounts</p>
                                <div className="space-y-1">
                                    {allAccounts.filter(a => a.parent_account_id === account.id).map(child => (
                                        <div key={child.id} className="flex justify-between items-center text-[11px] bg-slate-50 p-1.5 rounded hover:bg-slate-100 transition-colors">
                                            <Link href={`/accounts/v2/${child.id}`} className="flex items-center gap-2 text-slate-700 font-bold truncate hover:text-indigo-600">
                                                {child.image_url && <img src={child.image_url} className="h-3.5 w-3.5 object-contain" />}
                                                {child.name}
                                            </Link>
                                            <span className="font-black text-slate-500 tabular-nums">
                                                {new Intl.NumberFormat('vi-VN').format(child.current_balance || 0)}
                                            </span>
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
                                            <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{((totalOutstanding / creditLimit) * 100).toFixed(0)}%</span>
                                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all",
                                                        (totalOutstanding / creditLimit) > 0.9 ? "bg-rose-500" :
                                                            (totalOutstanding / creditLimit) > 0.7 ? "bg-amber-500" : "bg-indigo-500"
                                                    )}
                                                    style={{ width: `${Math.min(100, (totalOutstanding / creditLimit) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm font-black text-slate-700">{formatMoney(creditLimit)}</p>
                                )}
                            </div>
                            <div className="p-2 bg-rose-50 rounded border border-rose-100 shadow-sm">
                                <p className="text-[9px] text-rose-400 uppercase font-bold mb-1">Outstanding</p>
                                <p className="text-sm font-black text-rose-700">{formatMoney(totalOutstanding)}</p>
                            </div>
                            <div className="p-2 bg-slate-50 rounded border border-slate-100 shadow-sm">
                                <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Balance</p>
                                <p className="text-sm font-black text-slate-700">{formatMoney(Math.abs(account.current_balance))}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: IDs + Recent Transactions */}
                <div className="space-y-4">
                    {/* IDs Section - Moved to top of Column 2 */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">IDs</h4>
                        <button
                            onClick={() => {
                                // Copy clean value: Account Number if exists, otherwise ID
                                const copyText = account.account_number || account.id;
                                navigator.clipboard.writeText(copyText);
                                setIsCopied(true);
                                toast.success('Copied to clipboard');
                                setTimeout(() => setIsCopied(false), 2000);
                            }}
                            className="w-full flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100 hover:bg-slate-50 transition-colors group cursor-pointer"
                        >
                            <span className="text-slate-500 font-medium">{account.account_number ? 'Account # • ID' : 'Account ID'}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-700 text-[11px] truncate max-w-[200px]">
                                    {account.account_number ? `${account.account_number} • ${account.id.slice(0, 8)}...` : account.id}
                                </span>
                                {isCopied ? (
                                    <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                    <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                )}
                            </div>
                        </button>
                    </div>

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
