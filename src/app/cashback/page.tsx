import { Suspense } from 'react';
import { getGlobalCashbackMatrix } from '@/actions/cashback-global.action';
import { GlobalCashbackTable } from '@/components/cashback/global-cashback-table';

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function GlobalCashbackPage({ searchParams }: Props) {
    const params = await searchParams;
    const year = params.year ? Number(params.year) : new Date().getFullYear();

    const { data: matrixData, success } = await getGlobalCashbackMatrix(year);

    if (!success) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-lg font-bold">Failed to load cashback data</h2>
                <p>Please try again later.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
            <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading matrix...</div>}>
                <GlobalCashbackTable data={matrixData} year={year} />
            </Suspense>
        </div>
    );
}
