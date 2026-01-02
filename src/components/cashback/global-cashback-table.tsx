'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CashbackMatrixRow } from '@/actions/cashback-global.action';

interface GlobalCashbackTableProps {
    data: CashbackMatrixRow[];
    year: number;
}

export function GlobalCashbackTable({ data, year }: GlobalCashbackTableProps) {
    const router = useRouter();
    const months = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12

    // Helper to format currency (compact for matrix)
    const formatCurrency = (amount: number) => {
        if (amount === 0) return '-';
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(amount);
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        router.push(`/cashback?year=${e.target.value}`);
    };

    // Calculate totals for footer
    const totals = React.useMemo(() => {
        const t: Record<number, { estimated: number, real: number }> = {};
        let totalRealSum = 0;
        let totalFeeSum = 0;
        let totalProfitSum = 0;

        months.forEach(m => {
            t[m] = { estimated: 0, real: 0 };
        });

        data.forEach(row => {
            totalRealSum += row.total_real;
            totalFeeSum += row.annual_fee;
            totalProfitSum += row.profit;
            months.forEach(m => {
                const monthData = row.months[String(m)];
                if (monthData) {
                    t[m].estimated += monthData.estimated;
                    t[m].real += monthData.real;
                }
            });
        });

        return { months: t, totalReal: totalRealSum, totalFee: totalFeeSum, totalProfit: totalProfitSum };
    }, [data, months]);

    return (
        <div className="space-y-4">
            {/* Header / Controls */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-800">Global Cashback Matrix</h1>
                    <select
                        value={year}
                        onChange={handleYearChange}
                        className="text-sm font-semibold border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 py-1.5 px-3"
                    >
                        <option value={2023}>2023</option>
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </div>
                <div className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{data.length}</span> Accounts
                </div>
            </div>

            {/* Matrix Table Container */}
            <div className="relative w-full overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                        <tr>
                            {/* Sticky Account Column */}
                            <th className="sticky left-0 z-20 bg-slate-50 p-3 min-w-[200px] border-b shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Account
                            </th>

                            {/* Month Columns */}
                            {months.map(m => (
                                <th key={m} className="p-3 text-center min-w-[80px] border-b border-l border-slate-100">
                                    {new Date(0, m - 1).toLocaleString('en-US', { month: 'short' })}
                                </th>
                            ))}

                            {/* Sticky Totals - Grouped Header? No, simple columns */}
                            {/* Needs calculated width/positioning for multiple sticky columns on right.
                                A simpler approach for right sticky: use `sticky right-0` for the last one, and `sticky right-[width]` for previous.
                                Let's assume standardized widths:
                                Profit: 100px
                                Total Real: 100px
                                Annual Fee: 100px (Maybe plain column?)
                             */}
                            <th className="sticky right-[100px] z-20 bg-slate-50 p-3 w-[100px] text-right border-b border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                Total Real
                            </th>
                            <th className="sticky right-0 z-20 bg-slate-50 p-3 w-[100px] text-right border-b shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Profit
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                {/* Sticky Account Name */}
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-3 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-3">
                                        {row.image_url ? (
                                            <div className="relative w-8 h-8 rounded-none overflow-hidden shrink-0 border border-slate-100">
                                                <Image
                                                    src={row.image_url}
                                                    alt={row.name}
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 bg-slate-100 rounded-none flex items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-slate-400">?</span>
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="font-medium text-slate-900 truncate max-w-[140px]" title={row.name}>{row.name}</div>
                                            <div className="text-[10px] text-slate-400">
                                                Fee: {formatCurrency(row.annual_fee)}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Monthly Data */}
                                {months.map(m => {
                                    const mData = row.months[String(m)];
                                    const val = mData?.estimated ?? 0; // Using estimated for cells as request implied "Estimated Monthly" in schema step, but maybe user wants Real?
                                    // "returns ... (Estimated Monthly, Total Real...)" -> Matrix cells usually estimated progress?
                                    // Or Real if available?
                                    // Let's show Real if > 0, else Estimated?
                                    // Usually "Cashback Matrix" implies what I got.
                                    // Row data has `months: { estimated, real }`.
                                    // Let's prefer Real, fallback to Estimated? Or show Estimated/Real split?
                                    // Matrix cells usually single number.
                                    // Let's show `real` if present (cycle finished), else `estimated`.
                                    // Actually, let's display specific logic:
                                    // User said: "Ô tháng có tiền cashback > 0 có hiện màu xanh".
                                    // I'll show `estimated` clearly as it tracks progress.

                                    const primaryVal = mData?.real || mData?.estimated || 0;
                                    const isReal = !!mData?.real;

                                    return (
                                        <td key={m} className="p-2 text-center border-l border-slate-50 relative">
                                            <div className={cn(
                                                "text-xs font-medium py-1 px-2 rounded",
                                                primaryVal > 0 ? "text-emerald-700 bg-emerald-50" : "text-slate-300"
                                            )}>
                                                {formatCurrency(primaryVal)}
                                            </div>
                                            {/* Optional status dot for Real vs Estimated? */}
                                        </td>
                                    );
                                })}

                                {/* Sticky Totals */}
                                <td className="sticky right-[100px] z-10 bg-white group-hover:bg-slate-50 p-3 text-right font-bold text-slate-700 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                    {formatCurrency(row.total_real)}
                                </td>
                                <td className={cn(
                                    "sticky right-0 z-10 bg-white group-hover:bg-slate-50 p-3 text-right font-bold border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                                    row.profit < 0 ? "text-red-500" : "text-emerald-600"
                                )}>
                                    {formatCurrency(row.profit)}
                                </td>
                            </tr>
                        ))}

                        {/* Footer Totals */}
                        <tr className="bg-slate-100 font-bold text-slate-700">
                            <td className="sticky left-0 z-20 bg-slate-100 p-3 border-t text-right uppercase text-xs tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Grand Total
                            </td>
                            {months.map(m => (
                                <td key={m} className="p-2 text-center border-t border-l border-white">
                                    <span className="text-xs">{formatCurrency(totals.months[m].real || totals.months[m].estimated)}</span>
                                </td>
                            ))}
                            <td className="sticky right-[100px] z-20 bg-slate-100 p-3 text-right border-t shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                {formatCurrency(totals.totalReal)}
                            </td>
                            <td className={cn(
                                "sticky right-0 z-20 bg-slate-100 p-3 text-right border-t shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                                totals.totalProfit < 0 ? "text-red-500" : "text-emerald-600"
                            )}>
                                {formatCurrency(totals.totalProfit)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex gap-4 text-xs text-slate-400 px-2">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-100 border border-emerald-400"></span>
                    <span>Active Earning</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-100 border border-red-400"></span>
                    <span>Profit Loss (Fee &gt; Cashback)</span>
                </div>
            </div>
        </div>
    );
}
