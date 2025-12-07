'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Minus, Check, ChevronDown, Calendar } from 'lucide-react'
import { useTagFilter } from '@/context/tag-filter-context'
import { cn } from '@/lib/utils'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

interface DebtCycle {
    tag: string
    balance: number
    status: string
    last_activity: string
    total_debt?: number
    total_repaid?: number
}

interface DebtCycleTabsProps {
    allCycles: DebtCycle[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
}

export function DebtCycleTabs({
    allCycles,
    accounts,
    categories,
    people,
    shops,
    personId
}: DebtCycleTabsProps) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

    // Get current year (e.g., "2025")
    const currentYear = String(new Date().getFullYear())

    // Extract years from tags with outstanding debt count
    const yearsData = useMemo(() => {
        const yearMap = new Map<string, { total: number; outstanding: number }>()
        allCycles.forEach(cycle => {
            const match = cycle.tag.match(/(\d{2})$/)
            if (match) {
                const year = parseInt(match[1]) >= 90 ? `19${match[1]}` : `20${match[1]}`
                const existing = yearMap.get(year) ?? { total: 0, outstanding: 0 }
                existing.total++
                if (cycle.status !== 'settled' && Math.abs(cycle.balance) >= 1) {
                    existing.outstanding++
                }
                yearMap.set(year, existing)
            }
        })
        return Array.from(yearMap.entries())
            .map(([year, data]) => ({ year, ...data }))
            .sort((a, b) => b.year.localeCompare(a.year))
    }, [allCycles])

    const years = yearsData.map(d => d.year)
    const totalOutstanding = allCycles.filter(c => c.status !== 'settled' && Math.abs(c.balance) >= 1).length

    // Default to current year if it exists in data
    const [selectedYear, setSelectedYear] = useState<string | null>(() =>
        years.includes(currentYear) ? currentYear : null
    )

    // Update default when years change
    useEffect(() => {
        if (selectedYear === null && years.includes(currentYear)) {
            setSelectedYear(currentYear)
        }
    }, [years, currentYear, selectedYear])

    const filteredCycles = useMemo(() => {
        if (!selectedYear) return allCycles
        const yearSuffix = selectedYear.slice(-2)
        return allCycles.filter(cycle => cycle.tag.includes(yearSuffix))
    }, [allCycles, selectedYear])

    const toggleExpand = (tag: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const newSet = new Set(expandedCards)
        if (newSet.has(tag)) {
            newSet.delete(tag)
        } else {
            newSet.add(tag)
        }
        setExpandedCards(newSet)
    }

    return (
        <div className="space-y-4">
            {/* Year Filter */}
            {years.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            !selectedYear ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                        onClick={() => setSelectedYear(null)}
                    >
                        All Years {totalOutstanding > 0 && `(${totalOutstanding})`}
                    </button>
                    {yearsData.map(({ year, outstanding }) => (
                        <button
                            key={year}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                selectedYear === year ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                            onClick={() => setSelectedYear(year)}
                        >
                            {year} {outstanding > 0 && <span className="text-amber-500 font-bold">({outstanding})</span>}
                        </button>
                    ))}
                </div>
            )}

            {/* Debt Cycle Cards Grid */}
            {filteredCycles && filteredCycles.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {filteredCycles.map((cycle) => {
                        const isSelected = selectedTag === cycle.tag
                        const isExpanded = expandedCards.has(cycle.tag)
                        const isSettled = cycle.status === 'settled'
                        const lendAmount = cycle.total_debt ?? 0
                        const repayAmount = cycle.total_repaid ?? 0
                        // Remaining = Lend - Repay (what's still owed)
                        const remainingAmount = lendAmount - repayAmount

                        return (
                            <div
                                key={cycle.tag}
                                className={cn(
                                    "relative rounded-lg border bg-white transition-all overflow-hidden",
                                    isSelected ? "ring-2 ring-blue-500 border-blue-500" : "border-slate-200 hover:shadow-md"
                                )}
                            >
                                {/* Card Content */}
                                <div
                                    className={cn(
                                        "p-2.5 cursor-pointer",
                                        isSettled ? "bg-slate-50" : "bg-gradient-to-br from-amber-50 to-orange-50"
                                    )}
                                    onClick={() => setSelectedTag(isSelected ? null : cycle.tag)}
                                >
                                    {/* Header: Tag + Expand */}
                                    <div className="flex items-center justify-between gap-1">
                                        <h3 className="font-bold text-slate-900 text-xs truncate">
                                            {cycle.tag === 'UNTAGGED' ? 'N/A' : cycle.tag}
                                        </h3>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isSelected && (
                                                <div className="h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => toggleExpand(cycle.tag, e)}
                                                className={cn(
                                                    "p-1 rounded transition-all",
                                                    isExpanded ? "bg-slate-200 rotate-180" : "hover:bg-slate-100"
                                                )}
                                            >
                                                <ChevronDown className="h-4 w-4 text-slate-500" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Balance */}
                                    <p className={cn(
                                        "text-sm font-bold mt-1",
                                        isSettled ? "text-emerald-600" : (cycle.balance > 0 ? "text-rose-600" : "text-slate-500")
                                    )}>
                                        {isSettled ? "✓ Settled" : numberFormatter.format(Math.abs(cycle.balance))}
                                    </p>

                                    {/* Expanded: Stats in 2-column grid with border */}
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <div className="grid grid-cols-2 gap-px bg-slate-200 rounded-lg overflow-hidden">
                                                {/* Lend */}
                                                <div className="bg-rose-50 p-2 text-center">
                                                    <p className="text-[10px] text-rose-500 font-medium">Lend</p>
                                                    <p className="text-base font-bold text-rose-700">{numberFormatter.format(lendAmount)}</p>
                                                </div>
                                                {/* Repay */}
                                                <div className="bg-emerald-50 p-2 text-center">
                                                    <p className="text-[10px] text-emerald-500 font-medium">Repay</p>
                                                    <p className="text-base font-bold text-emerald-700">{numberFormatter.format(repayAmount)}</p>
                                                </div>
                                                {/* Sum Back (display only) */}
                                                <div className="bg-blue-50 p-2 text-center">
                                                    <p className="text-[10px] text-blue-500 font-medium">Sum Back</p>
                                                    <p className="text-base font-bold text-blue-700">{numberFormatter.format(repayAmount)}</p>
                                                </div>
                                                {/* Remaining */}
                                                <div className="bg-amber-50 p-2 text-center">
                                                    <p className="text-[10px] text-amber-500 font-medium">Remaining</p>
                                                    <p className="text-base font-bold text-amber-700">{numberFormatter.format(remainingAmount)}</p>
                                                </div>
                                            </div>
                                            {/* Last Activity */}
                                            {cycle.last_activity && (
                                                <p className="text-[10px] text-slate-400 text-center mt-2">
                                                    Last: {new Date(cycle.last_activity).toLocaleDateString('vi-VN')}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons - Bottom strip with proper colors */}
                                <div className="flex border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                    <AddTransactionDialog
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        defaultType="debt"
                                        defaultPersonId={personId}
                                        defaultTag={cycle.tag === 'UNTAGGED' ? undefined : cycle.tag}
                                        buttonClassName="flex-1 flex items-center justify-center gap-1 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors text-xs font-semibold border-r border-slate-100"
                                        triggerContent={
                                            <>
                                                <Minus className="h-3.5 w-3.5" />
                                                Lend
                                            </>
                                        }
                                    />
                                    <AddTransactionDialog
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        defaultType="repayment"
                                        defaultPersonId={personId}
                                        defaultTag={cycle.tag === 'UNTAGGED' ? undefined : cycle.tag}
                                        defaultAmount={Math.abs(cycle.balance)}
                                        buttonClassName="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-xs font-semibold"
                                        triggerContent={
                                            <>
                                                <Plus className="h-3.5 w-3.5" />
                                                Repay
                                            </>
                                        }
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-6 px-4 bg-white rounded-lg border border-dashed border-slate-200">
                    <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No debt cycles recorded.</p>
                </div>
            )}
        </div>
    )
}
