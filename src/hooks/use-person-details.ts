'use client'

import { useMemo } from 'react'
import { TransactionWithDetails, Person, PersonCycleSheet } from '@/types/moneyflow.types'
import { isYYYYMM, normalizeMonthTag } from '@/lib/month-tag'

interface DebtCycle {
    tag: string
    transactions: TransactionWithDetails[]
    latestDate: number
    tagDateVal: number
    stats: {
        lend: number
        repay: number
    }
    serverStatus?: any
    remains: number
    isSettled: boolean
}

interface UsePersonDetailsProps {
    person: Person
    transactions: TransactionWithDetails[]
    debtTags: any[]
    cycleSheets: PersonCycleSheet[]
}

export function usePersonDetails({
    person,
    transactions,
    debtTags,
    cycleSheets,
}: UsePersonDetailsProps) {
    // Map for O(1) lookup of Server Side Status
    const debtTagsMap = useMemo(() => {
        const m = new Map<string, any>()
        debtTags.forEach(t => m.set(t.tag, t))
        return m
    }, [debtTags])

    // Calculate overall metrics
    const metrics = useMemo(() => {
        const totals = transactions.reduce(
            (acc, txn) => {
                const type = txn.type
                const amount = Number(txn.amount) || 0
                const absAmount = Math.abs(amount)
                const isDebt = type === 'debt'

                const isLend = (isDebt && amount < 0) || (type === 'expense' && !!txn.person_id)
                const isRepay = (isDebt && amount > 0) || type === 'repayment' || (type === 'income' && !!txn.person_id)

                // Cashback calculation
                let cashback = 0
                if (txn.final_price !== null && txn.final_price !== undefined) {
                    const effectiveFinal = Math.abs(Number(txn.final_price))
                    if (absAmount > effectiveFinal) {
                        cashback = absAmount - effectiveFinal
                    }
                } else if (txn.cashback_share_amount) {
                    cashback = Number(txn.cashback_share_amount)
                } else if (txn.cashback_share_percent && txn.cashback_share_percent > 0) {
                    cashback = absAmount * txn.cashback_share_percent
                }

                // Include income-based cashback
                if (type === 'income' && (txn.note?.toLowerCase().includes('cashback') || (txn.metadata as any)?.is_cashback)) {
                    cashback += absAmount
                }

                if (isLend) {
                    const effectiveLend = txn.final_price !== null && txn.final_price !== undefined
                        ? Math.abs(Number(txn.final_price))
                        : absAmount
                    acc.lend += effectiveLend
                } else if (isRepay) {
                    acc.repay += absAmount
                }

                if (cashback > 0) {
                    acc.cashback += cashback
                }

                // Count paid transactions (repayments and income with person)
                if (type === 'repayment' || (type === 'income' && !!txn.person_id)) {
                    acc.paidCount += 1
                }

                return acc
            },
            { lend: 0, repay: 0, cashback: 0, paidCount: 0 }
        )

        return totals
    }, [transactions])

    // Group transactions by cycle tag
    const debtCycles = useMemo(() => {
        const groups = new Map<string, TransactionWithDetails[]>()

        transactions.forEach(txn => {
            const normalizedTag = normalizeMonthTag(txn.tag)
            const tag = normalizedTag?.trim() ? normalizedTag.trim() : (txn.tag?.trim() ? txn.tag.trim() : 'Untagged')
            if (!groups.has(tag)) {
                groups.set(tag, [])
            }
            groups.get(tag)?.push(txn)
        })

        return Array.from(groups.entries()).map(([tag, txns]) => {
            // Find latest date in this group
            let latestDate = 0
            if (txns.length > 0) {
                latestDate = txns.reduce((max, txn) => {
                    const d = new Date(txn.occurred_at ?? txn.created_at).getTime()
                    return d > max ? d : max
                }, 0)
            } else if (isYYYYMM(tag)) {
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

            // Calculate Stats for this cycle
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
            let serverStatus = debtTagsMap.get(tag)
            if (!serverStatus) {
                const normalized = normalizeMonthTag(tag)
                if (normalized) serverStatus = debtTagsMap.get(normalized)
            }

            const remains = serverStatus && typeof serverStatus.remainingPrincipal === 'number'
                ? serverStatus.remainingPrincipal
                : stats.lend - stats.repay

            const isSettled = serverStatus ? serverStatus.status === 'settled' : (txns.length === 0 ? false : Math.abs(remains) < 100)

            return {
                tag,
                transactions: txns,
                latestDate,
                tagDateVal,
                stats,
                serverStatus,
                remains,
                isSettled
            } as DebtCycle
        }).sort((a, b) => {
            // Priority: Date Descending
            if (a.tagDateVal > 0 && b.tagDateVal > 0) return b.tagDateVal - a.tagDateVal
            if (a.tagDateVal > 0) return -1
            if (b.tagDateVal > 0) return 1
            return b.latestDate - a.latestDate
        })
    }, [transactions, debtTagsMap])

    // Available years for filtering
    const availableYears = useMemo(() => {
        const years = new Set<string>()
        transactions.forEach(txn => {
            const normalizedTag = normalizeMonthTag(txn.tag || '')
            const tag = normalizedTag?.trim() ? normalizedTag.trim() : (txn.tag?.trim() || '')
            if (isYYYYMM(tag)) {
                years.add(tag.split('-')[0])
            } else if (tag) {
                years.add('Other')
            }
        })
        const currentYear = new Date().getFullYear().toString()
        years.add(currentYear)
        return Array.from(years).sort().reverse()
    }, [transactions])

    // Current cycle info
    const currentCycle = useMemo(() => {
        const now = new Date()
        const currentTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        return debtCycles.find(c => c.tag === currentTag) || debtCycles[0]
    }, [debtCycles])

    return {
        metrics,
        debtCycles,
        availableYears,
        currentCycle,
        balance: person.balance ?? 0,
        cycleSheets,
    }
}
