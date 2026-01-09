import { Suspense } from 'react';
import { getCashbackMatrixData } from '@/actions/cashback-matrix.action';
import { CashbackMatrixTable } from '@/components/cashback/cashback-matrix-table';
import { CashbackMobileList } from '@/components/cashback/cashback-mobile-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Use searchParams for year selection
export default async function CashbackPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string; view?: string }>;
}) {
    const { year: yearParam, view: viewParam } = await searchParams;
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    const viewMode = viewParam || 'credit'; // 'credit' or 'volunteer'

    const { data, error } = await getCashbackMatrixData(year);

    // Filter based on viewMode if needed (The service returns all relevant, we might want to split visually or fetch split)
    // For now service returns everything. Let's filter here for display if we want tabs.
    // Actually the requirements say: "Sử dụng Tab hoặc Toggle để filter: Credit Cards vs Volunteer Accounts"
    const filteredData = (data || []).filter(row => {
        if (viewMode === 'volunteer') {
            return row.accountType === 'loan' ||
                row.accountName.toLowerCase().includes('volunteer') ||
                row.accountType === 'checking'; // Include ALL checking accounts (they may have volunteer transactions)
        }
        return row.accountType === 'credit_card';
    });

    return (
        <div className="h-full flex flex-col space-y-4 p-4 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profit Matrix</h1>
                    <p className="text-slate-500">
                        Analyze your cashback & investment returns efficiently.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    {/* Year Selector - Simple Links for now */}
                    {[2024, 2025, 2026].map(y => (
                        <Link
                            key={y}
                            href={`/cashback?year=${y}&view=${viewMode}`}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${year === y ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            {y}
                        </Link>
                    ))}
                    <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
                    {/* View Toggle */}
                    <Link
                        href={`/cashback?year=${year}&view=credit`}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'credit' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        Cashback
                    </Link>
                    <Link
                        href={`/cashback?year=${year}&view=volunteer`}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'volunteer' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        Volunteer
                    </Link>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-md bg-red-50 text-red-600 border border-red-200">
                    Error loading data: {error}
                </div>
            )}

            {/* Matrix View (Desktop) */}
            <Suspense fallback={<div>Loading matrix...</div>}>
                <CashbackMatrixTable data={filteredData} />
            </Suspense>

            {/* Mobile Cards View */}
            <Suspense fallback={<div>Loading cards...</div>}>
                <CashbackMobileList data={filteredData} />
            </Suspense>

            {!error && filteredData.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-slate-400 mb-2">No accounts found for {year} in {viewMode} mode.</div>
                    {viewMode === 'volunteer' && <div className="text-xs text-slate-400">Try switching to Cashback view?</div>}
                </div>
            )}
        </div>
    );
}
