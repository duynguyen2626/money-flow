'use client';

import { CashbackMatrixRow } from '@/lib/cashback-matrix';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Props = {
    data: CashbackMatrixRow[];
};

export function CashbackMatrixTable({ data }: Props) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const formatCurrency = (amount: number) => {
        // Compact format for table (e.g. 1.2M, 500k) could be nicer, but standard is fine for now
        if (amount === 0) return '-';
        return new Intl.NumberFormat('vi-VN', {
            style: 'decimal',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="rounded-md border shadow-sm bg-white hidden md:block relative">
            {/* Fixed Header */}
            <div className="border-b bg-slate-50">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="w-[200px] text-left px-4 py-3 border-r font-bold text-slate-700 text-sm">Account</th>
                            {months.map((m) => (
                                <th key={m} className="px-2 py-3 text-center min-w-[80px] text-xs font-semibold text-slate-500">
                                    T{m}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-right min-w-[100px] font-bold text-slate-900 text-sm">To. Profit</th>
                        </tr>
                    </thead>
                </table>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-auto max-h-[calc(75vh-48px)]">
                <table className="w-full">
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.accountId} className="hover:bg-slate-50/50 border-b last:border-0">
                                <td className="w-[200px] px-4 py-3 border-r font-medium">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 rounded-sm bg-transparent">
                                            <AvatarImage src={row.accountIcon || ''} alt={row.accountName} className="object-contain" />
                                            <AvatarFallback className="rounded-sm bg-indigo-50 text-indigo-600 text-xs">
                                                {row.accountName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate max-w-[140px]" title={row.accountName}>{row.accountName}</span>
                                    </div>
                                </td>
                                {months.map((m) => {
                                    const profit = row.months[m]?.profit || 0;
                                    let bgClass = '';
                                    let textClass = 'text-slate-300';

                                    if (profit > 0) {
                                        textClass = 'text-emerald-700 font-medium';
                                        bgClass = profit > 1000000 ? 'bg-emerald-100' : 'bg-emerald-50';
                                    } else if (profit < 0) {
                                        textClass = 'text-red-600';
                                        bgClass = 'bg-red-50/50';
                                    }

                                    return (
                                        <td key={m} className={cn("text-center text-xs px-2 py-3", bgClass)}>
                                            <span className={textClass}>
                                                {profit !== 0 ? formatCurrency(profit) : '·'}
                                            </span>
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3 text-right font-bold text-sm bg-slate-50/30">
                                    <span className={cn(
                                        row.totalProfit > 0 ? "text-emerald-600" : row.totalProfit < 0 ? "text-red-600" : "text-slate-500"
                                    )}>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.totalProfit)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={14} className="h-24 text-center text-slate-500 py-12">
                                    No data available for this view.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
