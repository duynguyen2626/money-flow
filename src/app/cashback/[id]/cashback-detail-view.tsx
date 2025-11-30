"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { UnifiedTransactionTable } from "@/components/moneyflow/unified-transaction-table"
import { CashbackCycleTabs } from "@/components/moneyflow/cashback-cycle-tabs"
import { TransactionWithDetails } from "@/types/moneyflow.types"
import { CashbackCard } from "@/types/cashback.types"
import { parseCashbackConfig, getCashbackCycleRange } from '@/lib/cashback'
import { Json } from "@/types/database.types"

interface CashbackDetailViewProps {
    card: CashbackCard
    transactions: TransactionWithDetails[]
    cashbackConfig: Json | null
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
})

export function CashbackDetailView({ card, transactions, cashbackConfig }: CashbackDetailViewProps) {
    const [selectedCycle, setSelectedCycle] = useState<string>('All')

    // Compute cycles for all transactions
    const transactionsWithCycle = useMemo(() => {
        const config = parseCashbackConfig(cashbackConfig)
        return transactions.map(txn => {
            let cycleLabel = 'Unknown'
            if (config && txn.occurred_at) {
                const range = getCashbackCycleRange(config, new Date(txn.occurred_at))
                const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
                cycleLabel = `${fmt(range.start)} - ${fmt(range.end)}`
            }
            return { ...txn, cycleLabel }
        })
    }, [transactions, cashbackConfig])

    // Get unique cycles
    const cycles = useMemo(() => {
        const unique = Array.from(new Set(transactionsWithCycle.map(t => t.cycleLabel)))
        // transactions are usually sorted by date desc, so unique cycles should be in order of appearance (latest first)
        return ['All', ...unique]
    }, [transactionsWithCycle])

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        if (selectedCycle === 'All') return transactionsWithCycle
        return transactionsWithCycle.filter(t => t.cycleLabel === selectedCycle)
    }, [selectedCycle, transactionsWithCycle])

    return (
        <div className="w-full px-6 py-8">
            <div className="mb-8">
                <Link
                    href="/cashback"
                    className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to Dashboard
                </Link>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{card.accountName}</h1>
                        <p className="text-slate-500">{card.cycleLabel}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-500">Net Profit</div>
                        <div className={`text-2xl font-bold ${card.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {currencyFormatter.format(card.netProfit)}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Total Spend</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                            {currencyFormatter.format(card.currentSpend)}
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Bank Back</div>
                        <div className="mt-1 text-lg font-semibold text-emerald-600">
                            {currencyFormatter.format(card.totalEarned)}
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Shared Back</div>
                        <div className="mt-1 text-lg font-semibold text-slate-600">
                            {currencyFormatter.format(card.sharedAmount)}
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Net Profit</div>
                        <div className={`mt-1 text-lg font-semibold ${card.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {currencyFormatter.format(card.netProfit)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <CashbackCycleTabs
                    cycles={cycles}
                    selected={selectedCycle}
                    onSelect={setSelectedCycle}
                />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-4">
                    <h2 className="font-semibold text-slate-900">Transactions</h2>
                </div>
                <UnifiedTransactionTable
                    transactions={filteredTransactions}
                    hiddenColumns={['back_info', 'account', 'tag', 'final_price']}
                />
            </div>
        </div>
    )
}
