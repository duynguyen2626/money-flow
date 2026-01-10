'use client'

import { useMemo, useState, useEffect } from 'react'
import { Account, Category, Person, PersonCycleSheet, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { isYYYYMM, normalizeMonthTag } from '@/lib/month-tag'
import { DebtCycleGroup } from './debt-cycle-group'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Link as LinkIcon } from 'lucide-react'
import { AddTransactionDialog } from './add-transaction-dialog'

interface DebtCycleListProps {
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
    sheetProfileId: string
    cycleSheets: PersonCycleSheet[]
    filterType: 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'
    searchTerm: string
    debtTags?: any[]
    selectedYear?: string | null
    onYearChange?: (year: string) => void
    activeTag?: string | null
    onTagChange?: (tag: string | null) => void
}

export function DebtCycleList({
    transactions,
    accounts,
    categories,
    people,
    shops,
    personId,
    sheetProfileId,
    cycleSheets,
    filterType,
    searchTerm,
    debtTags = [],
    selectedYear = null,
    onYearChange,
    activeTag: controlledActiveTag,
    onTagChange
}: DebtCycleListProps) {

    // Map for O(1) lookup of Server Side Status
    const debtTagsMap = useMemo(() => {
        const m = new Map<string, any>();
        debtTags.forEach(t => m.set(t.tag, t));
        return m;
    }, [debtTags]);

    // 1. Filter Transactions based on Smart Filter & Search
    const filteredTransactions = useMemo(() => {
        return transactions.filter(txn => {
            // Search
            if (searchTerm) {
                const lower = searchTerm.toLowerCase()
                const matchesNote = txn.note?.toLowerCase().includes(lower)
                const matchesAmount = txn.amount?.toString().includes(searchTerm)
                if (!matchesNote && !matchesAmount) return false
            }

            // Type Filter logic (reusing implementation from SmartFilterBar logic conceptually)
            if (filterType === 'all') return true

            const type = txn.type
            const amount = txn.amount ?? 0
            const isDebt = type === 'debt'

            // Lend: Debt < 0 OR Expense with Person (if we count that as lend)
            // Repay: Debt > 0 OR Repayment OR Income with Person

            if (filterType === 'lend') {
                return (isDebt && amount < 0) || (type === 'expense' && !!txn.person_id)
            }
            if (filterType === 'repay') {
                return (isDebt && amount > 0) || type === 'repayment' || (type === 'income' && !!txn.person_id)
            }
            if (filterType === 'income') return type === 'income' && !txn.person_id
            if (filterType === 'expense') return type === 'expense' && !txn.person_id

            if (filterType === 'cashback') {
                if (txn.final_price !== null && txn.final_price !== undefined) {
                    const absAmount = Math.abs(Number(txn.amount) || 0)
                    const effectiveFinal = Math.abs(Number(txn.final_price))
                    return absAmount > effectiveFinal
                }
                if (txn.cashback_share_amount) return Number(txn.cashback_share_amount) > 0
                if (txn.cashback_share_percent && txn.cashback_share_percent > 0) return true
                return false
            }

            return true
        })
    }, [transactions, filterType, searchTerm])

    const scriptLink = useMemo(() => {
        const profile = people.find(person => person.id === sheetProfileId)
        return profile?.sheet_link ?? null
    }, [people, sheetProfileId])

    const googleSheetUrl = useMemo(() => {
        const profile = people.find(person => person.id === sheetProfileId)
        return profile?.google_sheet_url ?? null
    }, [people, sheetProfileId])

    // 2. Group by Cycle Tag
    const groupedCycles = useMemo(() => {
        const groups = new Map<string, TransactionWithDetails[]>()

        // 1. Group existing transactions
        filteredTransactions.forEach(txn => {
            const normalizedTag = normalizeMonthTag(txn.tag)
            const tag = normalizedTag?.trim() ? normalizedTag.trim() : (txn.tag?.trim() ? txn.tag.trim() : 'Untagged')
            if (!groups.has(tag)) {
                groups.set(tag, [])
            }
            groups.get(tag)?.push(txn)
        })

        // 2. If a specific year is selected, ensure all 12 months exist
        if (selectedYear && /^\d{4}$/.test(selectedYear)) {
            const year = parseInt(selectedYear)
            for (let month = 1; month <= 12; month++) {
                const tag = `${year}-${String(month).padStart(2, '0')}`
                if (!groups.has(tag)) {
                    groups.set(tag, [])
                }
            }
        }

        return Array.from(groups.entries()).map(([tag, txns]) => {
            // Find latest date in this group (fallback)
            let latestDate = 0
            if (txns.length > 0) {
                latestDate = txns.reduce((max, txn) => {
                    const d = new Date(txn.occurred_at ?? txn.created_at).getTime()
                    return d > max ? d : max
                }, 0)
            } else if (isYYYYMM(tag)) {
                // For empty/gap-filled months, use 1st of month
                const [y, m] = tag.split('-').map(Number)
                latestDate = new Date(y, m - 1, 1).getTime()
            }

            let tagDateVal = 0
            if (isYYYYMM(tag)) {
                const [yearStr, monthStr] = tag.split('-')
                const year = Number(yearStr)
                const month = Number(monthStr)
                if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
                    tagDateVal = new Date(year, month - 1, 1).getTime()
                }
            }

            // Calculate Stats for Master List Item
            const stats = txns.reduce(
                (acc, txn) => {
                    const amount = Math.abs(Number(txn.amount) || 0)
                    const type = txn.type
                    const isOutboundDebt = (type === 'debt' && (Number(txn.amount) || 0) < 0) || (type === 'expense' && !!txn.person_id)

                    if (isOutboundDebt) {
                        const effectiveFinal = txn.final_price !== null && txn.final_price !== undefined ? Math.abs(Number(txn.final_price)) : amount
                        acc.lend += effectiveFinal
                    }

                    if (type === 'repayment') {
                        acc.repay += amount
                    } else if (type === 'debt' && (Number(txn.amount) || 0) > 0) {
                        acc.repay += amount
                    } else if (type === 'income' && !!txn.person_id) {
                        acc.repay += amount
                    }
                    return acc
                },
                { lend: 0, repay: 0 }
            )

            // Get Server Status if available
            let serverStatus = debtTagsMap.get(tag);
            if (!serverStatus) {
                const normalized = normalizeMonthTag(tag);
                if (normalized) serverStatus = debtTagsMap.get(normalized);
            }

            const remains = serverStatus && typeof serverStatus.remainingPrincipal === 'number'
                ? serverStatus.remainingPrincipal
                : stats.lend - stats.repay

            const isSettled = serverStatus ? serverStatus.status === 'settled' : (txns.length === 0 ? false : Math.abs(remains) < 100)

            // Special case: If empty month and not settled, it's just an empty slot. 
            // But visually we show 0 remains.

            return {
                tag,
                transactions: txns,
                latestDate,
                tagDateVal,
                stats,
                serverStatus,
                remains,
                isSettled
            }
        }).sort((a, b) => {
            const now = new Date()
            const currentTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

            // Priority: Date Descending
            if (a.tagDateVal > 0 && b.tagDateVal > 0) return b.tagDateVal - a.tagDateVal
            if (a.tagDateVal > 0) return -1
            if (b.tagDateVal > 0) return 1
            return b.latestDate - a.latestDate
        })
    }, [filteredTransactions, debtTagsMap, selectedYear])

    // 3. Year Filter Logic (now controlled by parent)
    const filteredCycles = useMemo(() => {
        if (!selectedYear) return groupedCycles
        return groupedCycles.filter(g => {
            if (selectedYear === 'Other') return !isYYYYMM(g.tag)
            return g.tag.startsWith(selectedYear)
        })
    }, [groupedCycles, selectedYear])

    const [internalActiveTag, setInternalActiveTag] = useState<string | null>(null)
    const activeTag = controlledActiveTag !== undefined ? controlledActiveTag : internalActiveTag
    const setActiveTag = (tag: string | null) => {
        if (onTagChange) onTagChange(tag)
        else setInternalActiveTag(tag)
    }

    const [linkedModalTag, setLinkedModalTag] = useState<string | null>(null)
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
    const [showAllSettled, setShowAllSettled] = useState(false)

    // Reset showAllSettled when year changes
    useMemo(() => {
        setShowAllSettled(false)
    }, [selectedYear])

    const isCurrentYear = useMemo(() => {
        if (!selectedYear) return true // Default All Years treated as current for safety, or check logic
        const y = new Date().getFullYear().toString()
        return selectedYear === y
    }, [selectedYear])

    const defaultVisibleCycles = useMemo(() => {
        // Show everything by default in horizontal scroll, unless we want to hide "old settled"
        // But horizontal scroll handles many items well.
        return filteredCycles
    }, [filteredCycles])

    // Legacy support for "Show More" if we decide to truncate but for pills we usually just scroll
    const visibleCycles = defaultVisibleCycles

    // Calculate outstanding debts from previous years
    const outstandingFromPreviousYears = useMemo(() => {
        if (!selectedYear || selectedYear === 'Other') return []
        // ... Logic same as before if needed, or simplified
        const currentYear = parseInt(selectedYear)
        if (isNaN(currentYear)) return []

        const previousYearsData: Array<{
            year: number
            month: number
            tag: string
            remains: number
        }> = []

        groupedCycles.forEach(cycle => {
            if (!isYYYYMM(cycle.tag)) return
            const [yearStr, monthStr] = cycle.tag.split('-')
            const year = parseInt(yearStr)
            const month = parseInt(monthStr)

            if (year < currentYear && !cycle.isSettled && Math.abs(cycle.remains) > 100) {
                previousYearsData.push({
                    year,
                    month,
                    tag: cycle.tag,
                    remains: cycle.remains
                })
            }
        })
        return previousYearsData.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year
            return b.month - a.month
        })
    }, [groupedCycles, selectedYear])

    const hasOutstandingFromPrevious = outstandingFromPreviousYears.length > 0

    const linkedGroup = useMemo(() =>
        groupedCycles.find(g => g.tag === linkedModalTag),
        [groupedCycles, linkedModalTag])


    // Set initial active tag to the first of the selected year
    useEffect(() => {
        if (visibleCycles.length > 0) {
            const isActiveVisible = visibleCycles.some(g => g.tag === activeTag)
            if (!isActiveVisible && !activeTag) {
                // Determine 'default' active tag (latest non-empty cycle or just latest?)
                // Default to current month or latest available
                const now = new Date()
                const currentTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                const match = visibleCycles.find(c => c.tag === currentTag)
                setActiveTag(match ? match.tag : visibleCycles[0].tag)
            }
        }
    }, [visibleCycles, activeTag, setActiveTag])


    const activeGroup = useMemo(() =>
        groupedCycles.find(g => g.tag === activeTag),
        [groupedCycles, activeTag])

    const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }) // Full number
    const compactFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })

    const getMonthName = (tag: string) => {
        if (!isYYYYMM(tag)) return tag
        const month = parseInt(tag.split('-')[1], 10)
        const date = new Date(2000, month - 1, 1)
        return date.toLocaleString('en-US', { month: 'short' })
    }

    if (groupedCycles.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100 italic">
                No transactions found matching filters.
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Horizontal Scrollable Pills */}
            <div className="relative">
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1 snap-x items-center">

                    {/* Back to Current Year */}
                    {!isCurrentYear && (
                        <button
                            onClick={() => {
                                const currentYear = new Date().getFullYear().toString()
                                if (onYearChange) {
                                    onYearChange(currentYear)
                                }
                                setActiveTag(null)
                            }}
                            className="flex-shrink-0 flex items-center justify-center h-11 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap text-xs font-bold text-slate-600 snap-start uppercase tracking-wider"
                        >
                            ↩ {new Date().getFullYear()}
                        </button>
                    )}

                    {/* Previous Outstanding */}
                    {hasOutstandingFromPrevious && outstandingFromPreviousYears.map(item => (
                        <button
                            key={item.tag}
                            onClick={() => {
                                if (onYearChange) {
                                    onYearChange(item.year.toString())
                                }
                                setActiveTag(item.tag)
                            }}
                            className="flex-shrink-0 flex items-center gap-2 h-11 px-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-bold text-xs whitespace-nowrap snap-start shadow-sm hover:border-amber-300 min-w-[120px]"
                        >
                            <span>{getMonthName(item.tag).toUpperCase()} '{item.year.toString().slice(2)}</span>
                            <span className="bg-amber-100 px-1.5 py-0.5 rounded text-[10px] tracking-wide">UNPAID</span>
                        </button>
                    ))}


                    {visibleCycles.map((group) => {
                        const isSettled = group.isSettled
                        const isActive = activeTag === group.tag
                        const linkedRepaymentsCount = group.serverStatus?.links?.length || 0

                        return (
                            <button
                                key={group.tag}
                                onClick={() => setActiveTag(group.tag)}
                                className={cn(
                                    "flex-shrink-0 flex items-center gap-2 h-11 px-4 rounded-lg border transition-all whitespace-nowrap snap-start",
                                    isActive
                                        ? "bg-[#1e1b4b] border-[#1e1b4b] text-white shadow-lg shadow-indigo-900/20"
                                        : isSettled
                                            ? "bg-white border-slate-200 text-slate-400 opacity-80 hover:opacity-100 hover:border-slate-300"
                                            : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                {/* Month */}
                                <span className={cn("text-xs font-bold uppercase tracking-wider", isActive ? "text-indigo-200" : isSettled ? "text-slate-400" : "text-slate-500")}>
                                    {getMonthName(group.tag).toUpperCase()} '{group.tag.split('-')[0].slice(2)}
                                </span>

                                {/* Amount or Settled */}
                                {isSettled ? (
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-emerald-300" : "text-emerald-600")}>
                                        SETTLED
                                    </span>
                                ) : (
                                    <span className={cn("text-sm font-bold tabular-nums", isActive ? "text-white" : "text-slate-900")}>
                                        {compactFormatter.format(Math.max(0, group.remains))}
                                    </span>
                                )}

                                {/* Linked Badge */}
                                {linkedRepaymentsCount > 0 && (
                                    <span className={cn(
                                        "flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold",
                                        isActive ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-700"
                                    )}>
                                        {linkedRepaymentsCount}
                                    </span>
                                )}
                            </button>
                        )
                    })}

                    {/* Unpaid Badge (Global) - Placeholder based on request */}
                    {/* The prompt asked to move "Unpaid" badge to the end. I'll add a summary pill styled as badge */}
                    <div className="flex-shrink-0 flex items-center justify-center h-11 px-4 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 text-xs font-bold uppercase tracking-wide snap-start">
                        Unpaid
                    </div>

                    {/* More Button */}
                    <button className="flex-shrink-0 flex items-center justify-center h-11 px-5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-wider snap-start">
                        More &gt;
                    </button>
                </div>
                {/* Fade Gradients for Scroll Hint */}
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
            </div>

            {/* Detail View */}
            <div className="min-h-[400px]">
                {activeGroup ? (
                    <DebtCycleGroup
                        key={activeGroup.tag}
                        tag={activeGroup.tag}
                        transactions={activeGroup.transactions}
                        accounts={accounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                        personId={personId}
                        sheetProfileId={sheetProfileId}
                        scriptLink={scriptLink}
                        googleSheetUrl={googleSheetUrl}
                        sheetFullImg={people.find(p => p.id === sheetProfileId)?.sheet_full_img ?? null}
                        showBankAccount={people.find(p => p.id === sheetProfileId)?.sheet_show_bank_account ?? false}
                        showQrImage={people.find(p => p.id === sheetProfileId)?.sheet_show_qr_image ?? false}
                        cycleSheet={cycleSheets.find(sheet => normalizeMonthTag(sheet.cycle_tag) === activeGroup.tag) ?? null}
                        isExpanded={true}
                        onToggleExpand={() => { }}
                        serverStatus={activeGroup.serverStatus}
                    />
                ) : (
                    <div className="flex items-center justify-center h-48 text-slate-400">
                        Select a cycle to view details
                    </div>
                )}
            </div>

            {/* Linked Transactions Modal */}
            <Dialog open={linkedModalTag !== null} onOpenChange={(open) => !open && setLinkedModalTag(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Linked Transactions for {linkedModalTag}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 text-sm text-slate-600">
                        {linkedGroup?.serverStatus?.links && linkedGroup.serverStatus.links.length > 0 ? (
                            <ul className="space-y-2">
                                {linkedGroup.serverStatus.links.map((link: any, index: number) => (
                                    <li key={index} className="flex items-center justify-between py-2 px-3 rounded hover:bg-slate-50">
                                        <span>{link.description || 'Transaction'} - {formatter.format(link.amount || 0)}</span>
                                        <button
                                            onClick={() => {
                                                setEditingTransactionId(link.transaction_id);
                                                setLinkedModalTag(null);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                            title="Edit Transaction"
                                        >
                                            <LinkIcon className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No linked transactions found.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Transaction Modal */}
            {editingTransactionId && (
                <AddTransactionDialog
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    transactionId={editingTransactionId}
                    isOpen={true}
                    onOpenChange={(open) => !open && setEditingTransactionId(null)}
                />
            )}
        </div>
    )
}
