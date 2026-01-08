'use client'

import { useMemo, useState } from 'react'
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
    onYearChange
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

            // Priority: Current Month OR Unsettled (Remains > 0)
            // Note: Empty months (remains=0) are treated as settled/low priority
            const isPriorityA = (a.tag === currentTag) || (!a.isSettled && Math.abs(a.remains) > 100)
            const isPriorityB = (b.tag === currentTag) || (!b.isSettled && Math.abs(b.remains) > 100)

            if (isPriorityA && !isPriorityB) return -1
            if (!isPriorityA && isPriorityB) return 1

            // Secondary Sort: Date Descending
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

    const [activeTag, setActiveTag] = useState<string | null>(null)
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
        const now = new Date()
        const currentTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        return filteredCycles.filter(group => {
            const isPriority = (group.tag === currentTag) || (!group.isSettled && Math.abs(group.remains) > 100)
            return isPriority
        })
    }, [filteredCycles])

    const hasHiddenItems = isCurrentYear && filteredCycles.length > defaultVisibleCycles.length

    const visibleCycles = useMemo(() => {
        // If not current year, always show all
        if (!isCurrentYear) return filteredCycles

        // If user expanded, show all
        if (showAllSettled) return filteredCycles

        return defaultVisibleCycles
    }, [filteredCycles, isCurrentYear, showAllSettled, defaultVisibleCycles])

    const hiddenCount = filteredCycles.length - visibleCycles.length

    // Calculate outstanding debts from previous years
    const outstandingFromPreviousYears = useMemo(() => {
        if (!selectedYear || selectedYear === 'Other') return []

        const currentYear = parseInt(selectedYear)
        if (isNaN(currentYear)) return []

        const previousYearsData: Array<{
            year: number
            month: number
            tag: string
            remains: number
        }> = []

        // Scan all cycles for years < currentYear
        groupedCycles.forEach(cycle => {
            if (!isYYYYMM(cycle.tag)) return

            const [yearStr, monthStr] = cycle.tag.split('-')
            const year = parseInt(yearStr)
            const month = parseInt(monthStr)

            // Only include if:
            // 1. Year is before current selected year
            // 2. Not settled
            // 3. Has outstanding balance > 100
            if (year < currentYear && !cycle.isSettled && Math.abs(cycle.remains) > 100) {
                previousYearsData.push({
                    year,
                    month,
                    tag: cycle.tag,
                    remains: cycle.remains
                })
            }
        })

        // Sort by year desc, then month desc (most recent first)
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
    useMemo(() => {
        if (visibleCycles.length > 0) {
            const isActiveVisible = visibleCycles.some(g => g.tag === activeTag)
            if (!isActiveVisible) {
                setActiveTag(visibleCycles[0].tag)
            }
        } else if (filteredCycles.length > 0 && !activeTag) {
            // If everything is hidden but we have data, defaulting to first visible might not work if list is empty?
            // But logical fallthrough
        } else {
            // Keep active tag if possible?
        }
    }, [visibleCycles, activeTag])


    const activeGroup = useMemo(() =>
        groupedCycles.find(g => g.tag === activeTag),
        [groupedCycles, activeTag])

    // Calculate stats for active group
    const activeGroupStats = useMemo(() => {
        if (!activeGroup) return { lend: 0, repay: 0, back: 0 }

        const stats = activeGroup.transactions.reduce(
            (acc, txn) => {
                const amount = Math.abs(Number(txn.amount) || 0)
                const type = txn.type
                const isOutboundDebt = (type === 'debt' && (Number(txn.amount) || 0) < 0) || (type === 'expense' && !!txn.person_id)

                if (isOutboundDebt) {
                    acc.initial += amount
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
            { initial: 0, lend: 0, repay: 0 }
        )

        const back = stats.initial - stats.lend
        return { lend: stats.lend, repay: stats.repay, back }
    }, [activeGroup])


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
            {/* Compact 2-Line Grid Cards - 6 per row on large screens */}
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">

                    {/* Back to Current Year Card (First Item) */}
                    {!isCurrentYear && (
                        <button
                            onClick={() => {
                                const currentYear = new Date().getFullYear().toString()
                                if (onYearChange) {
                                    onYearChange(currentYear)
                                }
                                setActiveTag(null)
                            }}
                            className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-center group shadow-sm min-w-[120px]"
                            title="Return to Current Year"
                        >
                            <span className="text-base">↩️</span>
                            <span className="text-xs font-bold text-slate-600">Back to {new Date().getFullYear()}</span>
                        </button>
                    )}

                    {/* Expand/Collapse Toggle (Second Item) */}
                    {(hasHiddenItems || showAllSettled) && (
                        <button
                            onClick={() => setShowAllSettled(!showAllSettled)}
                            className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-slate-700 transition-all group min-w-[120px]"
                            title={showAllSettled ? "Collapse" : `Show ${hiddenCount} more`}
                        >
                            {showAllSettled ? (
                                <>
                                    <span className="text-base opacity-50 group-hover:opacity-100 transition-opacity">⬆️</span>
                                    <span className="text-xs font-medium whitespace-nowrap">Collapse</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-base opacity-50 group-hover:opacity-100 transition-opacity">⬇️</span>
                                    <span className="text-xs font-medium whitespace-nowrap">+{hiddenCount} More</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Outstanding Debt Cards - Compact Integrated Style */}
                    {hasOutstandingFromPrevious && outstandingFromPreviousYears.map(item => (
                        <button
                            key={item.tag}
                            onClick={() => {
                                if (onYearChange) {
                                    onYearChange(item.year.toString())
                                }
                                setActiveTag(item.tag)
                            }}
                            className="flex items-center justify-between gap-2 p-3 rounded-lg border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all text-left group min-w-[120px] shadow-sm"
                            title="Outstanding from previous year"
                        >
                            <span className="text-xs font-bold text-amber-700 flex items-center gap-1 whitespace-nowrap">
                                ⚠️ {getMonthName(item.tag)} '{item.year.toString().slice(2)}
                            </span>
                            <span className="text-xs font-extrabold text-amber-800 tabular-nums whitespace-nowrap">
                                {formatter.format(Math.abs(item.remains))}
                            </span>
                        </button>
                    ))}

                    {visibleCycles.map((group) => {
                        const isSettled = group.isSettled
                        const isActive = activeTag === group.tag
                        const linkedRepaymentsCount = group.serverStatus?.links?.length || 0

                        const tagYear = isYYYYMM(group.tag) ? parseInt(group.tag.split('-')[0]) : 0;
                        const currentYear = new Date().getFullYear();
                        const isOldYear = tagYear > 0 && tagYear < currentYear;

                        return (
                            <button
                                key={group.tag}
                                onClick={() => setActiveTag(group.tag)}
                                className={cn(
                                    "flex items-center justify-between gap-2 p-3 rounded-lg border transition-all text-left group min-w-[120px]",
                                    isActive
                                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 shadow-sm"
                                        : !isSettled && isOldYear
                                            ? "border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-100"
                                            : isSettled
                                                ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                                                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={cn(
                                        "text-xs font-bold whitespace-nowrap",
                                        isActive ? "text-blue-700" : "text-slate-600"
                                    )}>
                                        {getMonthName(group.tag)}:
                                    </span>

                                    {isSettled ? (
                                        <span className="text-emerald-700 font-bold text-xs whitespace-nowrap">✓ Done</span>
                                    ) : (
                                        <span className={cn(
                                            "text-xs font-extrabold tabular-nums whitespace-nowrap",
                                            isActive ? "text-blue-900" : "text-slate-900"
                                        )}>
                                            {formatter.format(Math.max(0, group.remains))}
                                        </span>
                                    )}
                                </div>

                                {linkedRepaymentsCount > 0 && (
                                    <span
                                        className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors flex-shrink-0 whitespace-nowrap"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLinkedModalTag(group.tag);
                                        }}
                                        title="View Linked Transactions"
                                    >
                                        +{linkedRepaymentsCount} Paid
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
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
