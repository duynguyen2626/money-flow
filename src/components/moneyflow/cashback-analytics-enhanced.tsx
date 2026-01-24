'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

import { TransactionForm, TransactionFormValues } from '@/components/moneyflow/transaction-form'
import { CashbackTransactionTable } from '@/components/cashback/cashback-transaction-table'
import { getCashbackProgress, getCashbackCycleOptions, getAllCashbackHistory } from '@/services/cashback.service'
import { getCashbackCycleRange, parseCycleTag, normalizeCashbackConfig } from '@/lib/cashback'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { CashbackCard, CashbackTransaction } from '@/types/cashback.types'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'

type CashbackAnalyticsEnhancedProps = {
    accountId: string
    accounts: Account[]
    account?: Account
    categories: Category[]
    people: Person[]
    shops: Shop[]
}

export function CashbackAnalyticsEnhanced({
    accountId,
    accounts,
    account,
    categories,
    people,
    shops
}: CashbackAnalyticsEnhancedProps) {
    const router = useRouter()
    const [cardData, setCardData] = useState<CashbackCard | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedCycleTag, setSelectedCycleTag] = useState<string | null>(null)
    const [cycleOptions, setCycleOptions] = useState<Array<{ tag: string, label: string, statementDay: number | null, cycleType: string | null }>>([])
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
    const [activeRuleTab, setActiveRuleTab] = useState<string>('all')

    const config = account ? normalizeCashbackConfig(account.cashback_config) : null
    const isCreditCard = account?.type === 'credit_card'

    const cycleTagToReferenceDate = (tag: string | null, statementDay: number | null, cycleType: string | null) => {
        if (!tag || tag === 'ALL') return undefined
        const parsed = parseCycleTag(tag)
        if (!parsed) return undefined
        const monthIdx = parsed.month - 1
        const year = parsed.year
        if (cycleType === 'statement_cycle') {
            return new Date(year, monthIdx, 1)
        }
        return new Date(year, monthIdx, statementDay ?? 1)
    }

    // Derive tabs from levels
    const ruleTabs = React.useMemo(() => {
        if (!config?.levels || config.levels.length === 0) {
            return [{ id: 'all', label: 'All Levels', level: null }]
        }
        return [
            { id: 'all', label: 'All Levels', level: null },
            ...config.levels.map((lvl, idx) => ({
                id: `level-${lvl.id || idx}`,
                label: lvl.name || `Level ${idx + 1}`,
                level: lvl
            }))
        ]
    }, [config?.levels])

    // Filter transactions by selected level
    const filteredTransactions = React.useMemo(() => {
        if (!cardData?.transactions) return []
        if (activeRuleTab === 'all') return cardData.transactions

        const selectedLevel = config?.levels?.find((_, idx) => `level-${lvl.id || idx}` === activeRuleTab)
        if (!selectedLevel) return cardData.transactions

        // Filter by matching levelName from policyMetadata (most accurate)
        return cardData.transactions.filter(txn => {
            const txnLevelName = txn.policyMetadata?.levelName
            if (txnLevelName && txnLevelName === selectedLevel.name) {
                return true
            }
            // Fallback to category-based filtering if no policyMetadata
            const categoryId = txn.category_id
            const hasRuleForCategory = selectedLevel.rules?.some(r => r.categoryIds?.includes(categoryId))
            return hasRuleForCategory
        })
    }, [cardData?.transactions, activeRuleTab, config?.levels])

    const uniqueYears = React.useMemo(() => {
        const years = new Set(cycleOptions
            .filter(opt => opt.tag !== 'ALL')
            .flatMap(opt => {
                const refDate = cycleTagToReferenceDate(opt.tag, opt.statementDay, opt.cycleType)
                if (!refDate) return []
                const range = getCashbackCycleRange({ statementDay: opt.statementDay, cycleType: opt.cycleType } as any, refDate)
                if (!range) {
                    if (opt.tag.length >= 5) return ['20' + opt.tag.slice(3)]
                    return []
                }
                const startYear = String(range.start.getFullYear())
                const endYear = String(range.end.getFullYear())
                return startYear === endYear ? [endYear] : [startYear, endYear]
            })
        )
        const currentYear = String(new Date().getFullYear())
        years.add(currentYear)
        return ['ALL', ...Array.from(years).sort().reverse()]
    }, [cycleOptions])

    const filteredOptions = React.useMemo(() => {
        if (selectedYear === 'ALL') return cycleOptions
        const allOption = cycleOptions.find(o => o.tag === 'ALL')
        const others = cycleOptions.filter(opt => {
            if (opt.tag === 'ALL') return false
            const refDate = cycleTagToReferenceDate(opt.tag, opt.statementDay, opt.cycleType)
            if (!refDate) {
                const parsed = parseCycleTag(opt.tag)
                if (parsed) return String(parsed.year) === selectedYear
                return opt.tag.endsWith(selectedYear.slice(2))
            }
            const range = getCashbackCycleRange({ statementDay: opt.statementDay, cycleType: opt.cycleType } as any, refDate)
            if (!range) {
                const parsed = parseCycleTag(opt.tag)
                if (parsed) return String(parsed.year) === selectedYear
                return opt.tag.endsWith(selectedYear.slice(2))
            }
            const startYear = String(range.start.getFullYear())
            const endYear = String(range.end.getFullYear())
            return startYear === selectedYear || endYear === selectedYear
        })
        return allOption ? [allOption, ...others] : others
    }, [cycleOptions, selectedYear])

    const [editingTxn, setEditingTxn] = useState<CashbackTransaction | null>(null)
    const [editInitialValues, setEditInitialValues] = useState<Partial<TransactionFormValues> | null>(null)

    const currencyFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

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

    // Load initial data
    useEffect(() => {
        if (!accountId) return
        async function loadData() {
            try {
                const options = await getCashbackCycleOptions(accountId)
                const cleanedOptions = (options as any[]).filter(opt => opt.tag) as Array<{ tag: string, label: string, statementDay: number | null, cycleType: string | null }>
                const allOption = { tag: 'ALL', label: 'All History', statementDay: null, cycleType: null }
                setCycleOptions([allOption, ...cleanedOptions])

                const initialTag = cleanedOptions.length > 0 ? cleanedOptions[0].tag : 'ALL'
                setSelectedCycleTag(prev => prev ?? initialTag)

                const referenceDate = initialTag && initialTag !== 'ALL'
                    ? cycleTagToReferenceDate(initialTag, cleanedOptions[0]?.statementDay, cleanedOptions[0]?.cycleType)
                    : undefined

                let cards: CashbackCard[] = []
                if (initialTag === 'ALL') {
                    const allData = await getAllCashbackHistory(accountId)
                    if (allData) cards = [allData]
                } else {
                    cards = await getCashbackProgress(0, [accountId], referenceDate, true)
                }

                if (cards.length > 0) {
                    setCardData(cards[0])
                }
            } catch (error) {
                console.error('Failed to load cashback details:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [accountId])

    // Load on cycle change
    useEffect(() => {
        if (!accountId || !selectedCycleTag) return

        async function loadCycle() {
            try {
                setLoading(true)
                if (selectedCycleTag === 'ALL') {
                    const allData = await getAllCashbackHistory(accountId)
                    if (allData) setCardData(allData)
                } else {
                    const selectedOpt = cycleOptions.find(opt => opt.tag === selectedCycleTag)
                    const referenceDate = cycleTagToReferenceDate(
                        selectedCycleTag,
                        selectedOpt?.statementDay ?? null,
                        selectedOpt?.cycleType ?? null
                    )
                    const cards = await getCashbackProgress(0, [accountId], referenceDate, true)
                    if (cards.length > 0) setCardData(cards[0])
                }
            } catch (error) {
                console.error('Failed to load cashback cycle:', error)
            } finally {
                setLoading(false)
            }
        }

        loadCycle()
    }, [accountId, selectedCycleTag])

    const handleEdit = async (txn: CashbackTransaction) => {
        try {
            const allTxns = await getUnifiedTransactions({ accountId: accountId, limit: 1000 })
            const found = allTxns.find(t => t.id === txn.id)

            if (found) {
                let type: TransactionFormValues['type'] = (found.type as any) === 'repayment' ? 'repayment' : found.type as TransactionFormValues['type'] || "expense"

                if (found.person_id) {
                    if (found.category_name?.toLowerCase().includes('repayment')) {
                        type = 'repayment'
                    } else {
                        type = 'debt'
                    }
                }

                const sourceId = found.account_id
                const destId = (type === 'transfer' || type === 'repayment' || type === 'debt') ? found.target_account_id : undefined

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
        if (selectedCycleTag) {
            const loadCycle = async () => {
                const selectedOpt = cycleOptions.find(opt => opt.tag === selectedCycleTag)
                const referenceDate = cycleTagToReferenceDate(
                    selectedCycleTag,
                    selectedOpt?.statementDay ?? null,
                    selectedOpt?.cycleType ?? null
                )
                const cards = await getCashbackProgress(0, [accountId], referenceDate, true)
                if (cards.length > 0) setCardData(cards[0])
            }
            loadCycle()
            router.refresh()
        }
    }

    if (loading) {
        return <div className="p-10 text-center text-slate-400 animate-pulse">Loading analysis...</div>
    }

    if (!cardData) {
        return <div className="p-10 text-center text-slate-500">No cashback data available.</div>
    }

    // Render rules badge (from AccountRewardsCell)
    let ruleCount = 0
    if (config?.levels) {
        config.levels.forEach(lvl => ruleCount += (lvl.rules?.length || 0))
    }

    const renderRulesBadge = () => {
        return ruleCount > 0 ? (
            <Popover>
                <PopoverTrigger>
                    <div className="h-4 px-1.5 rounded-full text-[9px] bg-purple-100 text-purple-700 border border-purple-200 font-black whitespace-nowrap hover:bg-purple-200 cursor-pointer flex items-center shadow-sm">
                        {ruleCount} RULES
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 shadow-xl border-slate-200" align="end" side="left">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 border-b pb-1 flex items-center justify-between">
                            <span>Cashback Strategy</span>
                            <span className="text-[9px] bg-slate-100 px-1 rounded lowercase font-bold tracking-normal">{config?.cycleType?.replace('_', ' ')}</span>
                        </h4>
                        <div className="space-y-4">
                            {config?.levels?.map((lvl, lIdx) => (
                                <div key={lvl.id || lIdx} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-900 bg-slate-50 p-1 rounded">
                                        <span>{lvl.name || `Level ${lIdx + 1}`}</span>
                                        <span className="text-indigo-600">≥{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(lvl.minTotalSpend)}</span>
                                    </div>
                                    <div className="space-y-1 pl-1">
                                        {lvl.rules?.map((r, rIdx) => {
                                            const catNames = r.categoryIds.map(id => categories?.find(c => c.id === id)?.name || id).join(', ')
                                            return (
                                                <div key={r.id || rIdx} className="flex justify-between items-start text-[10px] leading-tight">
                                                    <span className="text-slate-500 font-medium max-w-[140px] truncate" title={catNames}>{catNames || "All Categories"}</span>
                                                    <div className="flex flex-col items-end shrink-0 ml-2">
                                                        <span className="font-black text-emerald-600">{(r.rate * 100).toFixed(1)}%</span>
                                                        {r.maxReward && <span className="text-[8px] text-slate-400">Cap {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(r.maxReward)}</span>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {lvl.defaultRate !== null && lvl.defaultRate !== undefined && (
                                            <div className="flex justify-between items-center text-[10px] opacity-70 italic border-t border-dashed border-slate-200 pt-1 mt-1">
                                                <span className="text-slate-500">Other spend:</span>
                                                <span className="font-bold">{(lvl.defaultRate * 100).toFixed(1)}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        ) : null
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header with controls */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-800">Cashback Analysis</h2>
                        {renderRulesBadge()}
                    </div>
                    <div className="flex items-center gap-3">
                        <DropdownFilter
                            label="Year"
                            value={selectedYear}
                            options={uniqueYears.map(y => ({ value: y, label: y }))}
                            onChange={setSelectedYear}
                            className="w-[100px]"
                        />
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
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Net Profit</span>
                    <div className="text-2xl font-bold text-emerald-600">{currencyFormatter.format(cardData.netProfit)}</div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Earned (Bank)</span>
                    <div className="text-xl font-bold text-blue-600">{currencyFormatter.format(cardData.totalEarned)}</div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Shared</span>
                    <div className="text-xl font-bold text-orange-600">{currencyFormatter.format(cardData.sharedAmount)}</div>
                </div>
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Cap</span>
                        {typeof cardData.maxCashback === 'number' && (
                            <span className="text-[10px] font-medium text-slate-500">{cardData.progress.toFixed(0)}%</span>
                        )}
                    </div>
                    <div className="text-xl font-bold text-slate-700">
                        {cardData.remainingBudget !== null ? currencyFormatter.format(cardData.remainingBudget) : 'Unlimited'}
                    </div>
                    {typeof cardData.maxCashback === 'number' && (
                        <>
                            <Progress value={cardData.progress} className="h-1 mt-1.5 bg-slate-200" />
                            <span className="text-[10px] text-slate-400 mt-1">Progress toward max</span>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs for rule levels */}
            {ruleTabs.length > 1 && (
                <Tabs value={activeRuleTab} onValueChange={setActiveRuleTab} className="w-full">
                    <TabsList className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(ruleTabs.length, 4)}, 1fr)` }}>
                        {ruleTabs.map(tab => (
                            <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {ruleTabs.map(tab => (
                        <TabsContent key={tab.id} value={tab.id} className="space-y-3">
                            <div className="text-xs text-slate-600 px-2">
                                {tab.level ? (
                                    <div>
                                        <span className="font-semibold text-slate-700">{tab.level.name}</span>
                                        <span className="text-slate-500 ml-2">min spend: {new Intl.NumberFormat('vi-VN').format(tab.level.minTotalSpend)}</span>
                                        {tab.level.defaultRate !== null && (
                                            <span className="text-slate-500 ml-2">default: {(tab.level.defaultRate * 100).toFixed(1)}%</span>
                                        )}
                                    </div>
                                ) : (
                                    <span>Showing transactions from all levels</span>
                                )}
                            </div>
                            {/* Summary Row */}
                            <div className="px-2 py-2 text-xs text-slate-600 border-b border-slate-200 bg-slate-50 rounded">
                                <span className="font-medium text-slate-700">
                                    {tab.level
                                        ? `Showing ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} from ${tab.level.name}`
                                        : `Showing ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} from all levels`
                                    }
                                </span>
                            </div>
                            <CashbackTransactionTable
                                transactions={filteredTransactions}
                                onEdit={handleEdit}
                                showCycle={selectedCycleTag === 'ALL'}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            )}

            {/* Single table if no multi-level */}
            {ruleTabs.length === 1 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700">Transactions in Cycle</h3>
                    <div className="px-2 py-2 text-xs text-slate-600 border-b border-slate-200 bg-slate-50 rounded">
                        <span className="font-medium text-slate-700">
                            Showing {cardData.transactions.length} transaction{cardData.transactions.length !== 1 ? 's' : ''} from all levels
                        </span>
                    </div>
                    <CashbackTransactionTable
                        transactions={cardData.transactions}
                        onEdit={handleEdit}
                        showCycle={selectedCycleTag === 'ALL'}
                    />
                </div>
            )}

            {/* Edit Modal */}
            {editingTxn && editInitialValues && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-10"
                    onClick={() => {
                        setEditingTxn(null)
                        setEditInitialValues(null)
                    }}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl"
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

function DropdownFilter({
    label,
    value,
    options,
    onChange,
    className
}: {
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (val: string) => void
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
