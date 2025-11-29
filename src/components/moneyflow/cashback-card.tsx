'use client'

import Link from 'next/link'
import { CreditCard, AlertCircle } from 'lucide-react'
import { CashbackCard as CashbackCardType } from '@/types/cashback.types'
import { Progress } from '@/components/ui/progress'

interface CashbackCardProps {
    card: CashbackCardType
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
})

export function CashbackCard({ card }: CashbackCardProps) {
    const {
        accountId,
        accountName,
        totalEarned,
        maxCashback,
        cycleLabel,
        currentSpend,
        spendTarget,
        sharedAmount,
        netProfit,
        rate,
        minSpendMet,
        minSpendRemaining,
    } = card

    const earned = totalEarned
    const limit = maxCashback

    let remainingDisplay = 'Unlimited'
    let progressPercent = 0

    if (typeof limit === 'number') {
        const remaining = Math.max(0, limit - earned)
        remainingDisplay = currencyFormatter.format(remaining)
        progressPercent = Math.min(100, (earned / limit) * 100)
    }

    const showMinSpendWarning = !minSpendMet && typeof minSpendRemaining === 'number' && minSpendRemaining > 0

    return (
        <Link
            href={`/cashback/${accountId}`}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
        >
            {/* Top: Full Width Image & Badges */}
            <div className="relative h-28 w-full bg-slate-100">
                {card.accountImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={card.accountImageUrl}
                        alt={accountName}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-600">
                        <CreditCard className="h-10 w-10" />
                    </div>
                )}

                {/* Overlay Badges */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/10 p-4 transition group-hover:bg-black/20">
                    <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-slate-900 shadow-sm backdrop-blur-sm line-clamp-1 max-w-full text-center" title={accountName}>
                        {accountName}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                        {cycleLabel.replace(/-/g, '/').replace(/ \/ /g, ' - ')}
                    </span>

                    {/* Min Spend Warning in Image Area */}
                    {showMinSpendWarning && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm animate-pulse">
                            <AlertCircle className="h-3 w-3" />
                            Need {currencyFormatter.format(minSpendRemaining!)} more
                        </span>
                    )}
                </div>
            </div>

            {/* Body: Stats & Progress */}
            <div className="flex flex-1 flex-col p-3 space-y-3">

                {/* Primary Stats: Earned & Remaining */}
                <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3">
                    <div className="flex flex-col gap-0.5 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                            Earned
                        </span>
                        <span className="text-base font-bold text-emerald-600">
                            {currencyFormatter.format(earned)}
                        </span>
                        {/* Merged Profit/Shared info */}
                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-1">
                            <span className={netProfit >= 0 ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"}>
                                P: {currencyFormatter.format(netProfit)}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5 text-center border-l border-slate-100">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                            Remaining
                        </span>
                        <span className="text-base font-bold text-slate-700">
                            {remainingDisplay}
                        </span>
                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-1">
                            <span>S: {currencyFormatter.format(sharedAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Secondary Stats: Spent & Target */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-medium">Spent: {currencyFormatter.format(currentSpend)}</span>
                        <span className="text-slate-400">Target: {typeof spendTarget === 'number' ? currencyFormatter.format(spendTarget) : 'N/A'}</span>
                    </div>
                    {typeof limit === 'number' && (
                        <Progress value={progressPercent} className="h-1" />
                    )}
                </div>

                {/* Policy Info */}
                <div className="rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-600">Policy</span>
                        <div className="flex gap-2">
                            <span>Rate: <span className="font-medium text-slate-700">{(rate * 100).toFixed(1)}%</span></span>
                            <span>Max: <span className="font-medium text-slate-700">{typeof limit === 'number' ? currencyFormatter.format(limit) : 'Unl.'}</span></span>
                        </div>
                    </div>
                </div>

            </div>
        </Link>
    )
}
