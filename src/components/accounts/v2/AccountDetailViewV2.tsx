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

import { AccountContentWrapper } from '@/components/moneyflow/account-content-wrapper'
import { normalizeMonthTag } from '@/lib/month-tag'
import { useRecentItems } from '@/hooks/use-recent-items'
import { Info, RotateCcw } from 'lucide-react'
import { AccountPendingItemsModal } from './AccountPendingItemsModal'
import { useBreadcrumbs } from '@/context/breadcrumb-context'
import { useAppFavicon } from '@/hooks/use-app-favicon'
import { parseCashbackConfig, getCashbackCycleRange } from '@/lib/cashback'
import { resolveCashbackPolicy } from '@/services/cashback/policy-resolver'
import { format, parseISO, isValid } from 'date-fns'

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

    // Dynamic Icon for Account Detail (Shows Bank Logo on Tab)
    useAppFavicon(isPending, account.image_url ?? undefined)

    // Year Filter State (for header)
    const [selectedYear, setSelectedYear] = useState<string | null>(null)

    // Selected Cycle State (for cashback badge in header)
    const [selectedCycle, setSelectedCycle] = useState<string | undefined>()

    // Today's Cycle Tag (for reset functionality)
    const currentCycleTag = useMemo(() => {
        const config = parseCashbackConfig(account.cashback_config)
        const range = getCashbackCycleRange(config, new Date())
        if (range) {
            return format(range.end, 'yyyy-MM')
        }
        return format(new Date(), 'yyyy-MM')
    }, [account.cashback_config])

    // Batch Stats State
    const [pendingItems, setPendingItems] = useState<PendingBatchItem[]>([])
    const [isConfirmingPending, setIsConfirmingPending] = useState(false)
    const [pendingRefundAmount, setPendingRefundAmount] = useState(0)
    const [pendingRefundCount, setPendingRefundCount] = useState(0)
    const [isLoadingPending, setIsLoadingPending] = useState(true)

    const summary = useMemo(() => {
        const targetYear = selectedYear ? parseInt(selectedYear) : (selectedCycle && selectedCycle !== 'all' ? parseInt(selectedCycle.split('-')[0]) : new Date().getFullYear());
        const categoryMap = new Map(categories.map(c => [c.id, c]))
        const targetCycleTag = selectedCycle && selectedCycle !== 'all' ? selectedCycle : null;

        let incomeTotal = 0
        let expenseTotal = 0
        let transferInTotal = 0
        let transferOutTotal = 0
        let cashbackTotal = 0
        let yearPureIncomeTotal = 0
        let yearPureExpenseTotal = 0
        let yearLentTotal = 0
        let yearRepaidTotal = 0
        let yearExpensesTotal = 0

        // Credit Card specific (Historical/Selected Cycle)
        let cardYearlyCashbackTotal = 0
        let cardYearlyCashbackGivenTotal = 0

        // Entire Year metrics (for report popover)
        let yearCardCashbackTotal = 0
        let yearCardCashbackGivenTotal = 0
        let yearActualCashbackTotal = 0

        initialTransactions.forEach(tx => {
            const amount = Math.abs(tx.amount)
            const type = tx.type
            const categoryId = tx.category_id
            const category = categoryMap.get(categoryId)
            const categoryName = category?.name?.toLowerCase() || ''

            // Filter for selected cycle or year
            const txTag = tx.persisted_cycle_tag || tx.derived_cycle_tag || (tx.tag ? normalizeMonthTag(tx.tag) : null);
            const isMatch = targetCycleTag ? txTag === targetCycleTag : true;

            // All transactions for this account in the current TARGET YEAR (for tooltips)
            const txDate = tx.occurred_at ? parseISO(tx.occurred_at) : (tx.created_at ? parseISO(tx.created_at) : null);
            const isYearMatch = txDate && isValid(txDate) && txDate.getFullYear() === targetYear;

            if (isYearMatch) {
                if (type === 'income') {
                    yearPureIncomeTotal += amount;
                    if (categoryName.includes('cashback') || categoryName.includes('hoàn tiền')) {
                        yearActualCashbackTotal += amount;
                    }
                }
                else if (type === 'expense' || type === 'service' || type === 'debt') {
                    yearPureExpenseTotal += amount;
                    yearExpensesTotal += amount;
                    if (type === 'debt') {
                        yearLentTotal += amount;
                    }

                    // Calculate EST. Cashback for YEAR REPORT
                    if (account.type === 'credit_card') {
                        const manualBankBack = Number(tx?.bank_back || tx?.cashback_amount || 0)
                        const cbAmount = manualBankBack > 0 ? manualBankBack : (() => {
                            const policy = resolveCashbackPolicy({
                                account: account as any,
                                categoryId: tx.category_id,
                                amount: amount,
                                categoryName: tx.category_name,
                                cycleTotals: { spent: 0 }
                            })
                            const base = amount * policy.rate
                            return (policy.maxReward !== undefined && policy.maxReward !== null)
                                ? Math.min(base, policy.maxReward)
                                : base
                        })()
                        yearCardCashbackTotal += cbAmount

                        const sharedValue = Number(tx?.cashback_share_amount || tx?.cashback_share_fixed || 0)
                        if (sharedValue > 0) {
                            yearCardCashbackGivenTotal += sharedValue
                        }
                    }
                }
                else if (type === 'repayment') {
                    incomeTotal += amount; // Treat as income for balance
                    yearRepaidTotal += amount;
                }
            }

            if (isMatch) {
                if (type === 'income' || type === 'repayment') {
                    incomeTotal += amount
                    if (categoryName.includes('cashback') || categoryName.includes('hoàn tiền')) {
                        cashbackTotal += amount
                    }
                } else if (type === 'expense' || type === 'debt' || type === 'service') {
                    expenseTotal += amount

                    // Calculate EST. Cashback correctly using policy resolver
                    if (account.type === 'credit_card') {
                        // 1. Check for manual/bank provided cashback field first
                        const manualBankBack = Number(tx?.bank_back || tx?.cashback_amount || 0)
                        if (manualBankBack > 0) {
                            cardYearlyCashbackTotal += manualBankBack
                        } else {
                            // 2. Auto-resolve if no manual value
                            const policy = resolveCashbackPolicy({
                                account: account as any,
                                categoryId: tx.category_id,
                                amount: amount,
                                categoryName: tx.category_name,
                                cycleTotals: { spent: 0 } // Base estimation
                            })
                            const baseBankBack = amount * policy.rate
                            const bankBack = (policy.maxReward !== undefined && policy.maxReward !== null)
                                ? Math.min(baseBankBack, policy.maxReward)
                                : baseBankBack;
                            cardYearlyCashbackTotal += bankBack
                        }

                        // Cashback Shared logic
                        const sharedValue = Number(tx?.cashback_share_amount || tx?.cashback_share_fixed || 0)
                        if (sharedValue > 0) {
                            cardYearlyCashbackGivenTotal += sharedValue
                        }
                    }
                } else if (type === 'transfer') {
                    if (tx.account_id === account.id) transferOutTotal += amount
                    if (tx.target_account_id === account.id) transferInTotal += amount
                }
            }
        })

        const netProfit = incomeTotal - expenseTotal
        const profit = (cardYearlyCashbackTotal - cardYearlyCashbackGivenTotal)

        const cycleString = (() => {
            if (!targetCycleTag) return `Year ${targetYear}`
            const config = parseCashbackConfig(account.cashback_config)
            const [y, m] = targetCycleTag.split('-').map(Number)
            // Use 1st of the month as reference to find the cycle that ENDS in this month
            const refDate = new Date(y, m - 1, 1)
            const range = getCashbackCycleRange(config, refDate)
            if (range) {
                return `${format(range.start, 'dd.MM')} - ${format(range.end, 'dd.MM')}`
            }
            return targetCycleTag
        })()

        return {
            incomeTotal,
            expenseTotal,
            transferInTotal,
            transferOutTotal,
            netProfit,
            profit,
            cashbackTotal,
            cardYearlyCashbackTotal,
            cardYearlyCashbackGivenTotal,
            yearCardCashbackTotal,
            yearCardCashbackGivenTotal,
            yearActualCashbackTotal,
            yearPureIncomeTotal,
            yearPureExpenseTotal,
            yearLentTotal,
            yearRepaidTotal,
            yearExpensesTotal,
            realCashbackIncome: cashbackTotal,
            status: netProfit >= 0 ? 'surplus' : 'deficit',
            period: cycleString,
            // Yearly views
            netProfitYearly: (cashbackTotal - cardYearlyCashbackGivenTotal),
            pendingCount: initialTransactions.filter(t => t.status === 'pending' && (!targetCycleTag || (t.persisted_cycle_tag || t.derived_cycle_tag) === targetCycleTag)).length
        }
    }, [initialTransactions, selectedYear, selectedCycle, account, categories])

    useEffect(() => {
        document.title = `${account.name} History`
    }, [account.name])

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

    const { setCustomName } = useBreadcrumbs();
    useEffect(() => {
        if (account.name) {
            setCustomName(`/accounts/${account.id}`, account.name);
        }
    }, [account.id, account.name, setCustomName]);

    const syncPendingStats = useCallback(async () => {
        setIsLoadingPending(true)
        try {
            const [batchRes, refundRes] = await Promise.all([
                fetch(`/api/batch/pending-items?accountId=${account.id}&t=${Date.now()}`, { cache: 'no-store' }),
                fetch(`/api/refunds/pending?accountId=${account.id}&t=${Date.now()}`, { cache: 'no-store' })
            ])

            if (batchRes.ok) {
                const data = await batchRes.json()
                setPendingItems(Array.isArray(data) ? data : [])
            }

            if (refundRes.ok) {
                const data = await refundRes.json()
                setPendingRefundAmount(Math.max(0, data?.total ?? 0))
                setPendingRefundCount(Array.isArray(data?.items) ? data.items.length : 0)
            }
        } catch (error) {
            console.error('Failed to fetch pending data', error)
        } finally {
            setIsLoadingPending(false)
        }
    }, [account.id])

    const handleGlobalRefresh = useCallback(() => {
        startTransition(() => {
            router.refresh()
            syncPendingStats()
        })
    }, [router, syncPendingStats])

    useEffect(() => {
        syncPendingStats()

        const handleRefresh = () => {
            console.log('Refreshing account data via event')
            handleGlobalRefresh()
        }
        window.addEventListener('refresh-account-data', handleRefresh)

        const supabase = createClient()
        const channel = supabase
            .channel(`account_pending_stats_${account.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'batch_items',
                filter: `target_account_id=eq.${account.id}`,
            }, () => syncPendingStats())
            .subscribe()

        return () => {
            window.removeEventListener('refresh-account-data', handleRefresh)
            supabase.removeChannel(channel)
        }
    }, [account.id, syncPendingStats])

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
        <div className="flex flex-col h-full overflow-hidden bg-white relative">
            {/* Header V2 */}
            <AccountDetailHeaderV2
                account={account}
                allAccounts={allAccounts}
                categories={categories}
                cashbackStats={initialCashbackStats}
                selectedYear={selectedYear}
                availableYears={availableYears}
                onYearChange={setSelectedYear}
                selectedCycle={selectedCycle}
                onCycleChange={setSelectedCycle}
                currentCycleTag={currentCycleTag}
                summary={summary}
                isLoadingPending={isLoadingPending}
            />

            {/* Content Area - Loading indicator moved here for "middle of table" feel */}
            <div className="flex-1 overflow-y-auto space-y-4 relative">
                {isPending && (
                    <div className="absolute inset-0 z-[999] pointer-events-none flex items-center justify-center animate-in fade-in duration-500">
                        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-slate-700/50 flex items-center gap-3 animate-in zoom-in duration-300">
                            <div className="relative flex items-center justify-center">
                                <div className="h-5 w-5 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
                                <div className="absolute inset-0 m-auto h-1 w-1 bg-indigo-400 rounded-full animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">Syncing Transactions</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest animate-pulse mt-0.5">Updating Ledger</span>
                            </div>
                        </div>
                    </div>
                )}
                <AccountDetailTransactions
                    account={account}
                    transactions={initialTransactions}
                    accounts={allAccounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    selectedCycle={selectedCycle}
                    onCycleChange={setSelectedCycle}
                    onSuccess={syncPendingStats}
                />
            </div>
            <FlowLegend />

            <AccountPendingItemsModal
                accountId={account.id}
                pendingItems={pendingItems}
                pendingRefundCount={pendingRefundCount}
                pendingRefundAmount={pendingRefundAmount}
                onSuccess={() => syncPendingStats()}
            />
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
