'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AccountProfitAnalytics } from '@/services/cashback-analytics.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    data: AccountProfitAnalytics[];
    year: number;
};

export function ProfitDashboard({ data, year }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [viewMode, setViewMode] = useState<'cashback' | 'volunteer'>('cashback');
    const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

    // Filter accounts based on viewMode
    // Currently we only have 'credit_card' which are mostly Cashback.
    // Volunteer logic will be added later, for now just show all or filter if we had types.
    const filteredData = data.filter(acc => {
        if (viewMode === 'cashback') return acc.accountType === 'credit_card';
        if (viewMode === 'volunteer') return acc.accountType === 'loan' || acc.accountName.toLowerCase().includes('volunteer');
        return true;
    });

    const toggleExpand = (accountId: string) => {
        const newSet = new Set(expandedAccounts);
        if (newSet.has(accountId)) {
            newSet.delete(accountId);
        } else {
            newSet.add(accountId);
        }
        setExpandedAccounts(newSet);
    };

    const handleYearChange = (newYear: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('year', newYear);
        router.push(`/cashback?${params.toString()}`);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const renderMonthRow = (monthData: any) => {
        // Check if future month (no data)
        const isFuture = false; // Logic to check if month > current month? Handled by 0 data usually.

        return (
            <div key={monthData.month} className="grid grid-cols-12 gap-2 py-2 border-b last:border-0 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <div className="col-span-2 font-medium text-slate-500">T{monthData.month}</div>

                <div className="col-span-3 text-right text-slate-500">
                    {monthData.given > 0 && <div>-{formatCurrency(monthData.given)}</div>}
                </div>

                <div className="col-span-3 text-right text-emerald-600 font-medium">
                    {monthData.received > 0 && <div>+{formatCurrency(monthData.received)}</div>}
                </div>

                <div className="col-span-4 text-right">
                    <Badge variant={monthData.profit > 0 ? "default" : monthData.profit < 0 ? "destructive" : "secondary"}
                        className={cn(
                            "ml-auto w-fit",
                            monthData.profit > 0 ? "bg-emerald-500 hover:bg-emerald-600" : ""
                        )}
                    >
                        {monthData.profit > 0 ? "+" : ""}{formatCurrency(monthData.profit)}
                    </Badge>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Profit Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400">Track your cashback & investment returns</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg dark:bg-slate-800">
                    <Select
                        items={[2024, 2025, 2026].map(y => ({ value: y.toString(), label: y.toString() }))}
                        value={year.toString()}
                        onValueChange={(val) => handleYearChange(val || year.toString())}
                        placeholder="Year"
                        className="w-[100px] border-0 bg-transparent shadow-none focus:ring-0"
                    />

                    <div className="h-6 w-[1px] bg-slate-300 mx-1" />

                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[200px]">
                        <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto">
                            <TabsTrigger value="cashback" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs py-1.5">Cashback</TabsTrigger>
                            <TabsTrigger value="volunteer" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs py-1.5">Volunteer</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 gap-6">
                {filteredData.map(account => {
                    const isExpanded = expandedAccounts.has(account.accountId);
                    const firstHalf = account.monthlyData.slice(0, 6);
                    const secondHalf = account.monthlyData.slice(6, 12);

                    // Subtotals
                    const subtotalH1 = firstHalf.reduce((sum, m) => sum + m.profit, 0);
                    const subtotalH2 = secondHalf.reduce((sum, m) => sum + m.profit, 0);

                    return (
                        <Card key={account.accountId} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer bg-slate-50/50 dark:bg-slate-900/50"
                                onClick={() => toggleExpand(account.accountId)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                        {account.accountName.substring(0, 1)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{account.accountName}</h3>
                                        <div className="text-xs text-slate-500">
                                            Total Profit: <span className={cn("font-medium", account.totalProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
                                                {formatCurrency(account.totalProfit)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button variant="ghost" size="icon" className="text-slate-400">
                                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </Button>
                            </div>

                            {isExpanded && (
                                <CardContent className="p-0 border-t border-slate-100 dark:border-slate-800">
                                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-slate-100 dark:border-slate-800">
                                        {/* First Half */}
                                        <div className="p-4 space-y-1">
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Jan - Jun</div>
                                            {firstHalf.map(m => renderMonthRow(m))}
                                            <div className="pt-3 mt-2 border-t border-dashed flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-600">Subtotal H1</span>
                                                <span className={cn("text-sm font-bold", subtotalH1 >= 0 ? "text-emerald-600" : "text-red-600")}>
                                                    {formatCurrency(subtotalH1)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Second Half */}
                                        <div className="p-4 space-y-1">
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Jul - Dec</div>
                                            {secondHalf.map(m => renderMonthRow(m))}
                                            <div className="pt-3 mt-2 border-t border-dashed flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-600">Subtotal H2</span>
                                                <span className={cn("text-sm font-bold", subtotalH2 >= 0 ? "text-emerald-600" : "text-red-600")}>
                                                    {formatCurrency(subtotalH2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}

                {filteredData.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        No accounts found for the selected view.
                    </div>
                )}
            </div>
        </div>
    );
}
