'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
    TrendingUp,
    Wallet,
    PiggyBank,
    ChevronRight,
    ArrowUpRight,
    Pencil,
    Copy,
    Check,
    AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TransactionForm, TransactionFormValues } from '@/components/moneyflow/transaction-form'
import { CashbackTransactionTable } from '@/components/cashback/cashback-transaction-table'
import { getCashbackProgress, getCashbackCycleOptions, getAllCashbackHistory } from '@/services/cashback.service'
import { getCashbackCycleRange, parseCycleTag } from '@/lib/cashback'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { CashbackCard, CashbackTransaction } from '@/types/cashback.types'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'

type CashbackAnalysisViewProps = {
    accountId: string
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
}

export function CashbackAnalysisView({
    accountId,
    accounts,
    categories,
    people,
    shops
}: CashbackAnalysisViewProps) {
    const router = useRouter()
    const [cardData, setCardData] = useState<CashbackCard | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedCycleTag, setSelectedCycleTag] = useState<string | null>(null)
    const [cycleOptions, setCycleOptions] = useState<Array<{ tag: string, label: string, statementDay: number | null, cycleType: string | null }>>([])
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))

    // Helper to calculate reference date from tag
    const cycleTagToReferenceDate = (tag: string | null, statementDay: number | null, cycleType: string | null) => {
        if (!tag || tag === 'ALL') return undefined

        const parsed = parseCycleTag(tag)
        if (!parsed) return undefined

        const monthIdx = parsed.month - 1
        const year = parsed.year

        if (cycleType === 'statement_cycle') {
            // Use day 1 of the tagged month so range becomes roughly (statementDay of prev month) -> (statementDay-1 of tagged month)
            return new Date(year, monthIdx, 1)
        }

        return new Date(year, monthIdx, statementDay ?? 1)
    }

    // Derived: Unique Years
    const uniqueYears = React.useMemo(() => {
        const years = new Set(cycleOptions
            .filter(opt => opt.tag !== 'ALL')
            .flatMap(opt => {
                // Parse range from tag to get both years if they span
                const refDate = cycleTagToReferenceDate(opt.tag, opt.statementDay, opt.cycleType);
                if (!refDate) return [];
                const range = getCashbackCycleRange({ statementDay: opt.statementDay, cycleType: opt.cycleType } as any, refDate);
                if (!range) {
                    // Fallback to tag year
                    if (opt.tag.length >= 5) return ['20' + opt.tag.slice(3)];
                    return [];
                }
                const startYear = String(range.start.getFullYear());
                const endYear = String(range.end.getFullYear());
                return startYear === endYear ? [endYear] : [startYear, endYear];
            })
        )
        // Ensure current year is always in the list if not present
        const currentYear = String(new Date().getFullYear());
        years.add(currentYear);

        return ['ALL', ...Array.from(years).sort().reverse()]
    }, [cycleOptions])

    // Derived: Filtered Options
    const filteredOptions = React.useMemo(() => {
        if (selectedYear === 'ALL') return cycleOptions;

        // Always include ALL option if present
        const allOption = cycleOptions.find(o => o.tag === 'ALL');
        const others = cycleOptions.filter(opt => {
            if (opt.tag === 'ALL') return false;

            // Check if cycle overlaps with Selected Year
            const refDate = cycleTagToReferenceDate(opt.tag, opt.statementDay, opt.cycleType);
            if (!refDate) {
                const parsed = parseCycleTag(opt.tag);
                if (parsed) return String(parsed.year) === selectedYear;
                return opt.tag.endsWith(selectedYear.slice(2));
            }

            const range = getCashbackCycleRange({ statementDay: opt.statementDay, cycleType: opt.cycleType } as any, refDate);
            if (!range) {
                const parsed = parseCycleTag(opt.tag);
                if (parsed) return String(parsed.year) === selectedYear;
                return opt.tag.endsWith(selectedYear.slice(2));
            }

            const startYear = String(range.start.getFullYear());
            const endYear = String(range.end.getFullYear());

            return startYear === selectedYear || endYear === selectedYear;
        });

        return allOption ? [allOption, ...others] : others;
    }, [cycleOptions, selectedYear])

    // Edit State
    const [editingTxn, setEditingTxn] = useState<CashbackTransaction | null>(null)
    const [editInitialValues, setEditInitialValues] = useState<Partial<TransactionFormValues> | null>(null)

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
    })

    const cycleRangeLabel = React.useMemo(() => {
        if (selectedCycleTag === 'ALL') return 'All history'
        if (!cardData?.cycleStart || !cardData?.cycleEnd) return null

        const startDate = new Date(cardData.cycleStart)
        const endDate = new Date(cardData.cycleEnd)

        if (cardData.cycleType === 'statement_cycle') {
            const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
            return `${fmt(startDate)} - ${fmt(endDate)}`
        }

        const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return `${fmt.format(startDate)} - ${fmt.format(endDate)}`
    }, [selectedCycleTag, cardData?.cycleStart, cardData?.cycleEnd, cardData?.cycleType])



    // Initial Load
    useEffect(() => {
        if (!accountId) return

        async function loadData() {
            try {
                const options = await getCashbackCycleOptions(accountId)
                // Clean empty tags and ensure type safety
                const cleanedOptions = (options as any[]).filter(opt => opt.tag) as Array<{ tag: string, label: string, statementDay: number | null, cycleType: string | null }>

                // Add ALL Option
                const allOption = { tag: 'ALL', label: 'All History', statementDay: null, cycleType: null }
                setCycleOptions([allOption, ...cleanedOptions])

                // Default to latest cycle or from existing card data if any
                // If query param has 'all', select ALL? For now default to latest specific cycle if exists, else ALL.
                // Logic: If there's a specific cycle available (e.g. Current), default to it.
                // Usually cleanedOptions[0] is the latest/current.
                const initialTag = cleanedOptions.length > 0 ? cleanedOptions[0].tag : 'ALL'
                setSelectedCycleTag(prev => prev ?? initialTag)

                const referenceDate = initialTag && initialTag !== 'ALL'
                    ? cycleTagToReferenceDate(initialTag, cleanedOptions[0]?.statementDay, cleanedOptions[0]?.cycleType)
                    : undefined

                console.log(`[CashbackAnalysis] Initial Load for ${accountId}. Tag: ${initialTag}`)

                let cards: CashbackCard[] = []
                if (initialTag === 'ALL') {
                    const allData = await getAllCashbackHistory(accountId)
                    if (allData) cards = [allData]
                } else {
                    cards = await getCashbackProgress(0, [accountId], referenceDate, true)
                }

                if (cards.length > 0) {
                    console.log(`[CashbackAnalysis] Loaded card data. Transactions: ${cards[0].transactions?.length}`)
                    setCardData(cards[0])
                } else {
                    console.log(`[CashbackAnalysis] No card data returned.`)
                }
            } catch (error) {
                console.error('Failed to load cashback details:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [accountId])

    // Cycle Change
    useEffect(() => {
        if (!accountId || !selectedCycleTag) return
        console.log(`[CashbackAnalysis] Cycle Changed to: ${selectedCycleTag}`)

        async function loadCycle() {
            try {
                setLoading(true)
                if (selectedCycleTag === 'ALL') {
                    const allData = await getAllCashbackHistory(accountId)
                    if (allData) {
                        console.log(`[CashbackAnalysis] Loaded ALL History. Txns: ${allData.transactions?.length}`)
                        setCardData(allData)
                    }
                } else {
                    const selectedOpt = cycleOptions.find(opt => opt.tag === selectedCycleTag)
                    const referenceDate = cycleTagToReferenceDate(
                        selectedCycleTag,
                        selectedOpt?.statementDay ?? null,
                        selectedOpt?.cycleType ?? null
                    )
                    const cards = await getCashbackProgress(0, [accountId], referenceDate, true)
                    if (cards.length > 0) {
                        console.log(`[CashbackAnalysis] Loaded Cycle ${selectedCycleTag}. Txns: ${cards[0].transactions?.length}`)
                        setCardData(cards[0])
                    }
                }
            } catch (error) {
                console.error('Failed to load cashback cycle:', error)
            } finally {
                setLoading(false)
            }
        }

        loadCycle()
    }, [accountId, selectedCycleTag]) // Removed cycleOptions dep to avoid loop if options change ref (it shouldn't but safe)

    const handleEdit = async (txn: CashbackTransaction) => {
        try {
            // Fetch full transaction logic re-implemented or simplified.
            // We'll trust the user wants to edit this specific txn.
            // Since we don't have existing service exposing "getById", we fetch list and find.
            // Optimization: In real app, we should have getTransactionById(id).
            const allTxns = await getUnifiedTransactions({ accountId: accountId, limit: 1000 })
            const found = allTxns.find(t => t.id === txn.id)

            if (found) {
                // Reconstruct form values using flat fields
                let type: TransactionFormValues['type'] = (found.type as any) === 'repayment' ? 'repayment' : found.type as TransactionFormValues['type'] || "expense";

                if (found.person_id) {
                    if (found.category_name?.toLowerCase().includes('repayment')) {
                        type = 'repayment';
                    } else {
                        type = 'debt';
                    }
                }

                const sourceId = found.account_id;
                const destId = (type === 'transfer' || type === 'repayment' || type === 'debt') ? found.target_account_id : undefined;

                setEditInitialValues({
                    occurred_at: new Date(found.occurred_at || new Date()),
                    type,
                    amount: found.amount,
                    note: found.note || '',
                    tag: found.tag || '',
                    category_id: found.category_id || undefined,
                    person_id: found.person_id || undefined,
                    source_account_id: sourceId || undefined,
                    debt_account_id: destId || undefined,
                    shop_id: found.shop_id || undefined,
                    cashback_share_percent: found.cashback_share_percent ?? undefined,
                    cashback_share_fixed: found.cashback_share_fixed ?? undefined,
                    cashback_mode: (found.cashback_share_percent !== undefined && found.cashback_share_percent !== null && found.cashback_share_percent > 0) ? 'real_percent' :
                        (typeof found.cashback_share_fixed === "number" && found.cashback_share_fixed > 0) ? 'real_fixed' : 'none_back',
                })
                setEditingTxn(txn)
            } else {
                alert('Could not load transaction details.')
            }
        } catch (e) {
            console.error(e)
            alert("Failed to prepare edit form")
        }
    }

    const handleEditSuccess = () => {
        setEditingTxn(null)
        setEditInitialValues(null)
        // Reload current cycle
        if (selectedCycleTag) {
            // Trigger a re-load logic or simpler: reload page
            // window.location.reload() -> This is heavy.
            // Let's just re-fetch the cycle data
            const loadCycle = async () => {
                const selectedOpt = cycleOptions.find(opt => opt.tag === selectedCycleTag)
                const referenceDate = cycleTagToReferenceDate(
                    selectedCycleTag,
                    selectedOpt?.statementDay ?? null,
                    selectedOpt?.cycleType ?? null
                )
                const cards = await getCashbackProgress(0, [accountId], referenceDate, true)
                if (cards.length > 0) {
                    setCardData(cards[0])
                }
            }
            loadCycle()
            router.refresh() // Syncs server components too
        }
    }

    if (loading) {
        return <div className="p-10 text-center text-slate-400 animate-pulse">Loading analysis...</div>
    }

    if (!cardData) {
        return <div className="p-10 text-center text-slate-500">No cashback data available.</div>
    }

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Cashback Analysis</h2>
                {/* <div className="p-2 text-xs bg-red-100 border border-red-500 text-red-800 mb-2">
                    <b>Debug:</b> Tag={selectedCycleTag},
                    Opts={JSON.stringify(cycleOptions.map(o => o.tag))},
                    Net={cardData.netProfit},
                    Cap={cardData.remainingBudget},
                    Filter={filteredOptions.length}
                </div> */}
                <div className="flex items-center gap-3">
                    {/* Year Filter */}
                    <DropdownFilter
                        label="Year"
                        value={selectedYear}
                        options={uniqueYears.map(y => ({ value: y, label: y }))}
                        onChange={setSelectedYear}
                        className="w-[100px]"
                    />

                    {/* Cycle Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Cycle</span>
                        <select
                            value={selectedCycleTag ?? ''}
                            onChange={(e) => setSelectedCycleTag(e.target.value)}
                            className="text-sm border border-slate-300 rounded-md shadow-sm px-2 py-1 focus:ring-2 focus:ring-indigo-100 max-w-[200px]"
                        >
                            {filteredOptions.length === 0 && <option value="" disabled>No cycles</option>}
                            {filteredOptions.map(opt => (
                                <option key={opt.tag} value={opt.tag}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            {cycleRangeLabel && (
                <div className="text-xs text-slate-500">
                    <span className="font-semibold uppercase text-slate-400 mr-2">Cycle</span>
                    {cycleRangeLabel}
                </div>
            )}

            {/* Stats Cards (Copied from old detail view) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {/* Net Profit */}
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Net Profit</span>
                    <div className="text-2xl font-bold text-emerald-600 whitespace-nowrap">
                        {currencyFormatter.format(cardData.netProfit)}
                    </div>
                </div>

                {/* Total Earned */}
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1">
                        Earned <span className="text-slate-300 font-normal">(Bank)</span>
                    </span>
                    <div className="text-xl font-bold text-blue-600 whitespace-nowrap">
                        {currencyFormatter.format(cardData.totalEarned)}
                    </div>
                </div>

                {/* Shared */}
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Shared</span>
                    <div className="text-xl font-bold text-orange-600 whitespace-nowrap">
                        {currencyFormatter.format(cardData.sharedAmount)}
                    </div>
                </div>

                {/* Remaining Cap */}
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Cap</span>
                        <span className="text-[10px] font-medium text-slate-500">
                            {typeof cardData.maxCashback === 'number' ? `${cardData.progress.toFixed(0)}%` : '∞'}
                        </span>
                    </div>
                    <div className="text-xl font-bold text-slate-700 whitespace-nowrap">
                        {cardData.remainingBudget !== null ? currencyFormatter.format(cardData.remainingBudget) : 'Unlimited'}
                    </div>
                    {typeof cardData.maxCashback === 'number' && (
                        <>
                            <Progress value={cardData.progress} className="h-1 mt-1.5 bg-slate-200" />
                            <span className="text-[10px] text-slate-400 mt-1">
                                Progress toward max budget
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Transactions in Cycle</h3>
                <CashbackTransactionTable
                    transactions={cardData.transactions}
                    onEdit={handleEdit}
                    showCycle={selectedCycleTag === 'ALL'}
                />
            </div>

            {/* Edit Portal */}
            {editingTxn && editInitialValues && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-10"
                    onClick={() => {
                        setEditingTxn(null)
                        setEditInitialValues(null)
                    }}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-200"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Edit Transaction</h3>
                            <button
                                className="rounded px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                                onClick={() => {
                                    setEditingTxn(null)
                                    setEditInitialValues(null)
                                }}
                                aria-label="Close"
                            >
                                X
                            </button>
                        </div>
                        <TransactionForm
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            transactionId={editingTxn.id}
                            initialValues={editInitialValues}
                            mode="edit"
                            onSuccess={handleEditSuccess}
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function DropdownFilter({ label, value, options, onChange, className }: {
    label: string,
    value: string,
    options: { value: string, label: string }[],
    onChange: (val: string) => void,
    className?: string
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "text-sm border border-slate-300 rounded-md shadow-sm px-2 py-1 focus:ring-2 focus:ring-indigo-100",
                    className
                )}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    )
}
