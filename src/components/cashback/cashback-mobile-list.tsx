'use client';

import { CashbackMatrixRow } from '@/lib/cashback-matrix';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    data: CashbackMatrixRow[];
};

export function CashbackMobileList({ data }: Props) {

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="space-y-4 md:hidden pb-20">
            {data.map((row) => (
                <Sheet key={row.accountId}>
                    <SheetTrigger asChild>
                        <Card className="p-4 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer border-l-4"
                            style={{ borderLeftColor: row.totalProfit >= 0 ? '#10b981' : '#ef4444' }}>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 rounded-lg bg-transparent border shadow-sm">
                                    <AvatarImage src={row.accountIcon || ''} alt={row.accountName} className="object-contain p-1" />
                                    <AvatarFallback className="rounded-lg bg-slate-100 text-slate-500 font-bold">
                                        {row.accountName.substring(0, 1)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-semibold text-slate-900">{row.accountName}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        {row.bestMonth > 0 ? (
                                            <>
                                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                                Best: T{row.bestMonth}
                                            </>
                                        ) : (
                                            <span className="text-slate-400">No activity</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className={cn("text-lg font-bold", row.totalProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {row.totalProfit > 0 ? "+" : ""}{formatMoney(row.totalProfit)}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">Total Profit</div>
                            </div>
                        </Card>
                    </SheetTrigger>

                    <SheetContent side="bottom" className="h-[85vh] rounded-t-xl px-0">
                        <SheetHeader className="px-6 mb-4 text-left border-b pb-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 rounded-xl bg-slate-50 border">
                                    <AvatarImage src={row.accountIcon || ''} className="object-contain p-2" />
                                    <AvatarFallback>{row.accountName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <SheetTitle className="text-lg font-bold">{row.accountName}</SheetTitle>
                                    <div className={cn("text-sm font-medium", row.totalProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                                        Total: {row.totalProfit > 0 ? "+" : ""}{formatMoney(row.totalProfit)}
                                    </div>
                                </div>
                            </div>
                        </SheetHeader>

                        <div className="overflow-y-auto h-full px-6 pb-20 space-y-1">
                            {/* Timeline View */}
                            {Object.values(row.months).map((m) => {
                                const hasActivity = m.given !== 0 || m.received !== 0;
                                if (!hasActivity) return null; // Hide empty months? Or show as gray? Prompt says: "Dòng nào trống thì làm mờ hoặc ẩn"

                                return (
                                    <div key={m.month} className="flex items-center py-3 border-b border-dashed last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors">
                                        <div className="w-12 text-sm font-semibold text-slate-500">Thg {m.month}</div>

                                        <div className="flex-1 px-4 space-y-0.5">
                                            {m.given > 0 && (
                                                <div className="text-xs text-slate-500 flex justify-between">
                                                    <span>Spend</span>
                                                    <span>-{formatMoney(m.given)}</span>
                                                </div>
                                            )}
                                            {m.received > 0 && (
                                                <div className="text-xs text-emerald-600 font-medium flex justify-between">
                                                    <span>Income</span>
                                                    <span>+{formatMoney(m.received)}</span>
                                                </div>
                                            )}
                                            {m.given === 0 && m.received === 0 && <span className="text-xs text-slate-300 italic">No activity</span>}
                                        </div>

                                        <div className="w-24 text-right">
                                            <Badge variant="outline" className={cn(
                                                "font-bold border-0",
                                                m.profit > 0 ? "bg-emerald-50 text-emerald-700" :
                                                    m.profit < 0 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-400"
                                            )}>
                                                {m.profit > 0 ? "+" : ""}{new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(m.profit)}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* If completely empty */}
                            {Object.values(row.months).every(m => m.given === 0 && m.received === 0) && (
                                <div className="text-center py-12 text-slate-400 italic">
                                    No transaction history for this year.
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            ))}
        </div>
    );
}
