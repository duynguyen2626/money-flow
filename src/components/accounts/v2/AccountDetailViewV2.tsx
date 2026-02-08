"use client"

import React, { useCallback, useEffect, useState, useTransition, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Account,
    Category,
    Person,
    Shop
} from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { AccountDetailHeaderV2 } from './AccountDetailHeaderV2'
import { AccountDetailTransactions } from './AccountDetailTransactions'
import { CashbackAnalysisView } from '@/components/moneyflow/cashback-analysis-view'
import { AccountContentWrapper } from '@/components/moneyflow/account-content-wrapper'
import { normalizeMonthTag } from '@/lib/month-tag'
import { useRecentItems } from '@/hooks/use-recent-items'
import { Info } from 'lucide-react'

type PendingBatchItem = {
    id: string
    amount: number
    batch_id: string
}

interface AccountDetailViewV2Props {
    account: Account
    allAccounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    initialTransactions: any[]
    initialCashbackStats: AccountSpendingStats | null
}

export function AccountDetailViewV2({
    account,
    allAccounts,
    categories,
    people,
    shops,
    initialTransactions,
    initialCashbackStats
}: AccountDetailViewV2Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Tab State
    const initialTab = searchParams.get('tab') === 'cashback' ? 'cashback' : 'transactions'
    const [activeTab, setActiveTab] = useState<'transactions' | 'cashback'>(initialTab)

    // Year Filter State (for header)
    const [selectedYear, setSelectedYear] = useState<string | null>(null)

    // Selected Cycle State (for cashback badge in header)
    const [selectedCycle, setSelectedCycle] = useState<string | undefined>()

    // Batch Stats State
    const [pendingItems, setPendingItems] = useState<PendingBatchItem[]>([])
    const [isConfirmingPending, setIsConfirmingPending] = useState(false)
    const [pendingRefundAmount, setPendingRefundAmount] = useState(0)

    const summary = useMemo(() => {
        const currentYear = new Date().getFullYear()
        const categoryMap = new Map(categories.map(c => [c.id, c]))
        let yearDebtTotal = 0
        let debtTotal = 0
        let expensesTotal = 0
        let cashbackTotal = 0

        initialTransactions.forEach(tx => {
            const rawDate = tx?.occurred_at || tx?.date || tx?.created_at
            const date = rawDate ? new Date(rawDate) : null
            const amount = Math.abs(Number(tx?.amount || 0))
            const type = String(tx?.type || '').toLowerCase()

            if (type === 'debt') {
                debtTotal += amount
                if (date && date.getFullYear() === currentYear) {
                    yearDebtTotal += amount
                }
            }

            if (type === 'expense' || type === 'transfer') {
                expensesTotal += amount
            }

            if (type === 'income') {
                const categoryId = tx?.category_id
                const category = categoryId ? categoryMap.get(categoryId) : null
                const categoryName = category?.name?.toLowerCase() || ''
                if (categoryName.includes('cashback') || categoryName.includes('hoàn tiền')) {
                    cashbackTotal += amount
                }
            }
        })

        return { yearDebtTotal, debtTotal, expensesTotal, cashbackTotal }
    }, [initialTransactions, categories])

    // Sync tab with URL
    useEffect(() => {
        const tab = searchParams.get('tab') === 'cashback' ? 'cashback' : 'transactions'
        setActiveTab(tab)
    }, [searchParams])

    useEffect(() => {
        const tabLabel = activeTab === 'cashback' ? 'Cashback' : 'History'
        document.title = `${account.name} ${tabLabel}`
    }, [account.name, activeTab])

    const { addRecentItem } = useRecentItems()

    useEffect(() => {
        if (account.id && account.name) {
            addRecentItem({
                id: account.id,
                type: 'account',
                name: account.name,
                image_url: account.image_url
            })
        }
    }, [account.id, account.name, addRecentItem])

    const fetchPendingData = useCallback(async () => {
        try {
            const [batchRes, refundRes] = await Promise.all([
                fetch(`/api/batch/pending-items?accountId=${account.id}`),
                fetch(`/api/refunds/pending?accountId=${account.id}`)
            ])

            if (batchRes.ok) {
                const data = await batchRes.json()
                setPendingItems(Array.isArray(data) ? data : [])
            }

            if (refundRes.ok) {
                const data = await refundRes.json()
                setPendingRefundAmount(Math.max(0, data?.total ?? 0))
            }
        } catch (error) {
            console.error('Failed to fetch pending data', error)
        }
    }, [account.id])

    useEffect(() => {
        fetchPendingData()

        const supabase = createClient()
        const channel = supabase
            .channel(`account_pending_stats_${account.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'batch_items',
                filter: `target_account_id=eq.${account.id}`,
            }, () => fetchPendingData())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [account.id, fetchPendingData])

    const handleConfirmPending = async () => {
        if (isConfirmingPending) return
        if (pendingItems.length === 0) {
            router.push('/batch')
            return
        }

        setIsConfirmingPending(true)
        const toastId = toast.loading(`Confirming ${pendingItems.length} items...`)
        try {
            let successCount = 0
            for (const item of pendingItems) {
                const response = await fetch('/api/batch/confirm-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: item.id, batchId: item.batch_id }),
                })
                if (response.ok) successCount += 1
            }

            if (successCount > 0) {
                toast.success(`Confirmed ${successCount} items`, { id: toastId })
                setPendingItems([])
                setPendingRefundAmount(0)
                router.refresh()
            } else {
                toast.error('Failed to confirm items', { id: toastId })
            }
        } catch (error) {
            toast.error('Error confirming items', { id: toastId })
        } finally {
            setIsConfirmingPending(false)
        }
    }

    const handleTabChange = (tab: 'transactions' | 'cashback') => {
        setActiveTab(tab)
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('tab', tab)
            router.push(`/accounts/${account.id}?${params.toString()}`)
        })
    }

    const availableYears = React.useMemo(() => {
        const years = new Set<string>()
        initialTransactions.forEach(txn => {
            const tag = normalizeMonthTag(txn.tag || '') || ''
            if (tag && /^\d{4}-\d{2}$/.test(tag)) {
                years.add(tag.split('-')[0])
            }
        })
        const currentYear = new Date().getFullYear().toString()
        years.add(currentYear)
        return Array.from(years).sort().reverse()
    }, [initialTransactions])

    // Initialize selectedYear to first available year if not set
    useEffect(() => {
        if (!selectedYear && availableYears.length > 0) {
            setSelectedYear(availableYears[0])
        }
    }, [availableYears, selectedYear])

    const pendingBatchAmount = pendingItems.reduce((sum, item) => sum + Math.abs(item.amount ?? 0), 0)
    const pendingTotal = pendingBatchAmount + pendingRefundAmount

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Header V2 */}
            <AccountDetailHeaderV2
                account={account}
                allAccounts={allAccounts}
                categories={categories}
                cashbackStats={initialCashbackStats}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                selectedYear={selectedYear}
                availableYears={availableYears}
                onYearChange={setSelectedYear}
                selectedCycle={selectedCycle}
                summary={summary}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4">
                {activeTab === 'transactions' ? (
                    <AccountDetailTransactions
                        account={account}
                        transactions={initialTransactions}
                        accounts={allAccounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                        selectedCycle={selectedCycle}
                        onCycleChange={setSelectedCycle}
                    />
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[600px]">
                        <CashbackAnalysisView
                            accountId={account.id}
                            accounts={allAccounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                        />
                    </div>
                )}
            </div>
            <FlowLegend />
        </div>
    )
}

const FlowLegend = () => (
    <div className="px-6 py-2 border-t border-slate-200 bg-white flex items-center gap-6 text-[11px] text-slate-500 font-medium shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 group cursor-help">
            <span className="inline-flex items-center justify-center rounded-[4px] h-5 w-11 text-[9px] font-black bg-orange-50 border border-orange-200 text-orange-700 shadow-sm transition-transform group-hover:scale-105">FROM</span>
            <span className="text-slate-400 font-normal">→ Origin / Source</span>
        </div>
        <div className="flex items-center gap-2 group cursor-help">
            <span className="inline-flex items-center justify-center rounded-[4px] h-5 w-11 text-[9px] font-black bg-sky-50 border border-sky-200 text-sky-700 shadow-sm transition-transform group-hover:scale-105">TO</span>
            <span className="text-slate-400 font-normal">→ Target / Destination</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-slate-300">
            <Info className="h-3.5 w-3.5" />
            <span className="italic">Flow labels are context-aware (Income = FROM Sender)</span>
        </div>
    </div>
)
