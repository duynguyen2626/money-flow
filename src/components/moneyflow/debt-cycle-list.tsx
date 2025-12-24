'use client'

import { useMemo, useState } from 'react'
import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { DebtCycleGroup } from './debt-cycle-group'

interface DebtCycleListProps {
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
    filterType: 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer'
    searchTerm: string
}

export function DebtCycleList({
    transactions,
    accounts,
    categories,
    people,
    shops,
    personId,
    filterType,
    searchTerm
}: DebtCycleListProps) {

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

    // 2. Group by Cycle Tag
    const groupedCycles = useMemo(() => {
        const groups = new Map<string, TransactionWithDetails[]>()

        filteredTransactions.forEach(txn => {
            const tag = txn.tag || 'Untagged'
            if (!groups.has(tag)) {
                groups.set(tag, [])
            }
            groups.get(tag)?.push(txn)
        })

        // Convert to array and sort
        // Convert to array and sort
        return Array.from(groups.entries()).map(([tag, txns]) => {
            // Find latest date in this group (fallback)
            const latestDate = txns.reduce((max, txn) => {
                const d = new Date(txn.occurred_at ?? txn.created_at).getTime()
                return d > max ? d : max
            }, 0)

            // Try to parse Tag: "MMMyy" (e.g. NOV25, DEC25)
            // If tag is valid MMMyy, we prioritize it for sorting.
            let tagDateVal = 0
            if (tag.length === 5) { // Simple check before regex/parse
                const monthStr = tag.substring(0, 3)
                const yearStr = tag.substring(3)
                const months: Record<string, number> = {
                    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
                    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
                }
                const m = months[monthStr.toUpperCase()]
                const y = parseInt(yearStr, 10)
                if (m !== undefined && !isNaN(y)) {
                    // Year 25 -> 2025
                    tagDateVal = new Date(2000 + y, m, 1).getTime()
                }
            }

            return {
                tag,
                transactions: txns,
                latestDate,
                tagDateVal,
            }
        }).sort((a, b) => {
            // Primary Sort: Tag Date Time
            if (a.tagDateVal > 0 && b.tagDateVal > 0) {
                return b.tagDateVal - a.tagDateVal
            }
            // If one has tag date and other doesn't, strict separation? 
            // Put Tagged ON TOP of Untagged usually? 
            // Or fallback to latest activity.
            if (a.tagDateVal > 0) return -1
            if (b.tagDateVal > 0) return 1

            // Fallback: Latest Activity
            return b.latestDate - a.latestDate
        })
    }, [filteredTransactions])

    // Accordion State
    const [expandedTag, setExpandedTag] = useState<string | null>(null)

    // Effect: Set initial expansion or reset when list changes
    // User Requirement: "về lại đúng vị trí cũ và expand tháng hiện tại" implies default state is latest.
    // If logic: Always keep *some* tag expanded? "Các Cards khác buộc phải collapse".
    // If I toggle OFF, does it go to none? Or back to default?
    // "ấn collapse lại sẽ về lại đúng vị trí cũ và expand tháng hiện tại"
    // Interpretation: Collapse currently expanded item -> It moves back -> And the "Current Month" (latest) auto-expands?
    // This sounds like: one item is ALWAYS expanded? Or at least "Current Month" is the fallback.

    // Let's implement:
    // 1. Initial Load: Expand first (latest).
    // 2. Click another: New one moves to top, expands. Old one collapses.
    // 3. Click current (Collapse): It moves back (?) AND "expand tháng hiện tại".
    //    If "tháng hiện tại" IS the current one, it just stays there?
    //    If I have JAN (top), FEB, MAR.
    //    I click MAR. Order: MAR, JAN, FEB.
    //    I click MAR again (collapse). Order: JAN, FEB, MAR. And JAN expands.

    // So: `expandedTag` should effectively default to `groupedCycles[0]?.tag` if null?
    // But `displayCycles` logic needs to know "original order". `groupedCycles` IS original order.

    // Effect to sync default expanded

    // Note: useMemo is bad for side effects (setState), but here I need to derive 'active'.
    // Better: Derived State during render, but I need `setExpandedTag` for interaction.
    // I will use `useEffect` for the reset/init logic.
    /*
    useEffect(() => {
        if (groupedCycles.length > 0 && !groupedCycles.some(g => g.tag === expandedTag)) {
             setExpandedTag(groupedCycles[0].tag)
        }
    }, [groupedCycles, expandedTag])
    */
    // Wait, infinite loop risk if I dependency on expandedTag. 
    // Fix: Only depend on groupedCycles map changes.


    const activeTag = useMemo(() => {
        if (groupedCycles.length === 0) return null
        const exists = groupedCycles.find(g => g.tag === expandedTag)
        // Default to first (latest) if no explicit selection matches, or if nothing selected
        return exists ? expandedTag : groupedCycles[0].tag
    }, [groupedCycles, expandedTag])


    const displayCycles = useMemo(() => {
        if (!activeTag) return groupedCycles

        // If activeTag is the first one in original list, just return original list
        if (groupedCycles[0].tag === activeTag) return groupedCycles

        const activeGroup = groupedCycles.find(g => g.tag === activeTag)
        if (!activeGroup) return groupedCycles

        const others = groupedCycles.filter(g => g.tag !== activeTag)
        return [activeGroup, ...others]
    }, [groupedCycles, activeTag])


    const handleToggle = (tag: string) => {
        if (activeTag === tag) {
            // User clicked the currently expanded item (Collapse intent)
            // Requirement: "về lại đúng vị trí cũ và expand tháng hiện tại"
            // So we basically reset to "latest" (which is default).
            setExpandedTag(null) // activeTag logic falls back to first.
        } else {
            setExpandedTag(tag)
        }
    }

    if (groupedCycles.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100 italic">
                No transactions found matching filters.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {displayCycles.map((group) => (
                <DebtCycleGroup
                    key={group.tag}
                    tag={group.tag}
                    transactions={group.transactions}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    personId={personId}
                    isExpanded={group.tag === activeTag}
                    onToggleExpand={() => handleToggle(group.tag)}
                />
            ))}
        </div>
    )
}
