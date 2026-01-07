'use client'

import { useMemo, useState } from 'react'
import { Account, Category, Person, PersonCycleSheet, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { isYYYYMM, normalizeMonthTag } from '@/lib/month-tag'
import { DebtCycleGroup } from './debt-cycle-group'
import { cn } from '@/lib/utils'

interface DebtCycleListProps {
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
    sheetProfileId: string
    cycleSheets: PersonCycleSheet[]
    filterType: 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer'
    searchTerm: string
    debtTags?: any[]
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
    debtTags = []
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

        filteredTransactions.forEach(txn => {
            const normalizedTag = normalizeMonthTag(txn.tag)
            const tag = normalizedTag?.trim() ? normalizedTag.trim() : (txn.tag?.trim() ? txn.tag.trim() : 'Untagged')
            if (!groups.has(tag)) {
                groups.set(tag, [])
            }
            groups.get(tag)?.push(txn)
        })

        // Filter out empty 'Untagged' if we have other tags? No, keep it.

        return Array.from(groups.entries()).map(([tag, txns]) => {
            // Find latest date in this group (fallback)
            const latestDate = txns.reduce((max, txn) => {
                const d = new Date(txn.occurred_at ?? txn.created_at).getTime()
                return d > max ? d : max
            }, 0)

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

            const isSettled = serverStatus ? serverStatus.status === 'settled' : Math.abs(remains) < 100

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
            // Pin Active items to top? Or just Time sort?
            // Usually Time sort.
            if (a.tagDateVal > 0 && b.tagDateVal > 0) return b.tagDateVal - a.tagDateVal
            if (a.tagDateVal > 0) return -1
            if (b.tagDateVal > 0) return 1
            return b.latestDate - a.latestDate
        })
    }, [filteredTransactions, debtTagsMap])

    const [activeTag, setActiveTag] = useState<string | null>(null)

    // Set initial active tag
    useMemo(() => {
        if (!activeTag && groupedCycles.length > 0) {
            setActiveTag(groupedCycles[0].tag)
        }
    }, [groupedCycles, activeTag])

    const activeGroup = useMemo(() =>
        groupedCycles.find(g => g.tag === activeTag),
        [groupedCycles, activeTag])

    const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })

    if (groupedCycles.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100 italic">
                No transactions found matching filters.
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Master List: Horizontal Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none md:flex-wrap">
                {groupedCycles.map((group) => (
                    <button
                        key={group.tag}
                        onClick={() => setActiveTag(group.tag)}
                        className={cn(
                            "flex flex-col items-start min-w-[140px] p-3 rounded-xl border transition-all text-left",
                            activeTag === group.tag
                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <span className="text-sm font-bold text-slate-900">{group.tag}</span>
                            {group.isSettled && (
                                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Settled" />
                            )}
                        </div>
                        <div className="flex flex-col gap-0.5 w-full">
                            <div className="flex justify-between text-[11px] w-full text-slate-500">
                                <span>Lend</span>
                                <span>{formatter.format(group.stats.lend)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] w-full text-slate-500">
                                <span>Repay</span>
                                <span>{formatter.format(group.stats.repay)}</span>
                            </div>
                            <div className={cn(
                                "flex justify-between text-xs w-full font-bold mt-1 pt-1 border-t border-slate-200/50",
                                group.isSettled ? "text-emerald-600" : "text-amber-600"
                            )}>
                                <span>Remains</span>
                                <span>{formatter.format(Math.max(0, group.remains))}</span>
                            </div>
                        </div>
                    </button>
                ))}
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
        </div>
    )
}
