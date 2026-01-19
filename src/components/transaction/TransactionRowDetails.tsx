// src/components/transaction/TransactionRowDetails.tsx

import React from 'react';
import { TransactionWithDetails } from '@/types/moneyflow.types';
import { parseMetadata } from '@/lib/transaction-mapper';
import {
    Hash,
    Info,
    CreditCard,
    User,
    ShoppingBasket,
    Tag as TagIcon,
    Link2,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TransactionRowDetailsProps {
    transaction: TransactionWithDetails;
}

const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

interface DetailItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
    className?: string;
}

const DetailItem = ({ icon: Icon, label, value, className }: DetailItemProps) => (
    <div className={cn("flex items-start gap-2 text-sm py-1", className)}>
        <Icon className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
        <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">{label}</span>
            <span className="text-slate-700 font-medium">{value}</span>
        </div>
    </div>
);

export function TransactionRowDetails({ transaction }: TransactionRowDetailsProps) {
    const metadata = parseMetadata(transaction.metadata);

    return (
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Column 1: Core Info */}
            <div className="space-y-1">
                <DetailItem
                    icon={Calendar}
                    label="Occurred At"
                    value={formatDate(transaction.occurred_at || transaction.created_at)}
                />
                <DetailItem
                    icon={Hash}
                    label="Transaction ID"
                    value={<span className="font-mono text-[11px] h-6 flex items-center">{transaction.id}</span>}
                />
                <DetailItem
                    icon={TagIcon}
                    label="Tag / Cycle"
                    value={transaction.tag || 'None'}
                />
            </div>

            {/* Column 2: Relations */}
            <div className="space-y-1">
                <DetailItem
                    icon={CreditCard}
                    label="Source Account"
                    value={transaction.account_name || transaction.source_account_name || 'N/A'}
                />
                {(transaction.type === 'transfer' || transaction.type === 'repayment' || transaction.type === 'debt') && (
                    <DetailItem
                        icon={ArrowRightLeft}
                        label="Target Account"
                        value={transaction.destination_account_name || transaction.destination_name || 'N/A'}
                    />
                )}
                <DetailItem
                    icon={User}
                    label="Person"
                    value={transaction.person_name || 'None'}
                />
            </div>

            {/* Column 3: Category & Shop */}
            <div className="space-y-1">
                <DetailItem
                    icon={ShoppingBasket}
                    label="Shop"
                    value={transaction.shop_name || 'N/A'}
                />
                <DetailItem
                    icon={Info}
                    label="Category"
                    value={transaction.category_name || 'Uncategorized'}
                />
                <DetailItem
                    icon={AlertCircle}
                    label="Status"
                    value={
                        <Badge variant="outline" className={cn(
                            "h-5 text-[10px] capitalize",
                            transaction.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                transaction.status === 'void' ? "bg-slate-100 text-slate-500 border-slate-200" :
                                    "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                            {transaction.status}
                        </Badge>
                    }
                />
            </div>

            {/* Column 4: Links & Metadata */}
            <div className="space-y-1">
                {(transaction.installment_plan_id || transaction.is_installment) && (
                    <DetailItem
                        icon={Link2}
                        label="Installment Plan"
                        value={
                            <div className="flex flex-col gap-1">
                                <span className="text-amber-700 text-xs">Linked via Plan</span>
                                <span className="font-mono text-[10px] text-slate-400">{transaction.installment_plan_id}</span>
                            </div>
                        }
                    />
                )}
                {metadata?.original_transaction_id && (
                    <DetailItem
                        icon={Link2}
                        label="Original Transaction"
                        value={
                            <div className="flex flex-col gap-1">
                                <span className="text-purple-700 text-xs">Refund/Adjustment</span>
                                <span className="font-mono text-[10px] text-slate-400">{metadata.original_transaction_id as string}</span>
                            </div>
                        }
                    />
                )}
                {transaction.note && (
                    <div className="mt-2 bg-white/50 p-2 rounded border border-slate-200/50">
                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tight mb-1 block">Full Note</span>
                        <p className="text-xs text-slate-600 italic whitespace-pre-wrap">{transaction.note}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Internal icons needed for DetailItem
const ArrowRightLeft = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" />
    </svg>
);
