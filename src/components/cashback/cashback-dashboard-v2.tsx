'use client'

import { useState } from 'react'
import { CashbackYearSummary, CashbackCard } from '@/types/cashback.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { CashbackMatrixView } from './cashback-matrix-view'
import { CashbackMonthDetailModal } from './month-detail-modal'
import { LayoutList, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
    initialData: CashbackYearSummary[]
    year: number
    cards: CashbackCard[]
    tieredMap?: Record<string, boolean>
}

export function CashbackDashboardV2({ initialData, year, cards, tieredMap }: Props) {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(initialData[0]?.cardId ?? null)
    const [detailModal, setDetailModal] = useState<{ month: number, tab?: string } | null>(null)
    const [viewMode, setViewMode] = useState<'detail' | 'matrix'>('detail')


    // Filter: credit cards + exclude DUPLICATE/DO NOT USE + exclude zero-data
    const filteredData = initialData.filter(d => {
        // Step 1: Only credit cards
        if (d.cardType !== 'credit_card' && d.cardType) return false

        const cardInfo = cards.find(c => c.accountId === d.cardId)
        const cardName = cardInfo?.accountName || ""

        // Step 2: Exclude "DO NOT USE" or "DUPLICATE" accounts
        const nameUpper = cardName.toUpperCase()
        if (nameUpper.includes('DUPLICATE') || nameUpper.includes('DO NOT USE')) {
            return false
        }

        // Step 3: Exclude zero-data accounts
        const hasActivity = d.netProfit !== 0 ||
            d.cashbackGivenYearTotal !== 0 ||
            d.cashbackRedeemedYearTotal !== 0 ||
            d.months.some(m => m.totalGivenAway > 0)

        return hasActivity
    })

    const selectedSummary = filteredData.find(d => d.cardId === selectedCardId) || filteredData[0]
    const selectedCardInfo = cards.find(c => c.accountId === selectedSummary?.cardId)

    // Helper to format currency
    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n))

    const handleMonthClick = (month: number, tab?: string) => {
        if (selectedSummary?.cardId) {
            setDetailModal({ month, tab })
        }
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Top Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-1">
                <div className="flex items-center gap-4">
                    <div className="w-32">
                        <Select
                            value={String(year)}
                            onValueChange={(v) => window.location.href = `/cashback?year=${v}`}
                            items={[
                                { value: '2024', label: '2024' },
                                { value: '2025', label: '2025' },
                                { value: '2026', label: '2026' },
                            ]}
                            placeholder="Year"
                        />
                    </div>
                    {/* View Mode Toggle */}
                    <div className="flex bg-muted p-1 rounded-lg">
                        <Button
                            variant={viewMode === 'detail' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('detail')}
                            className="h-8 px-3 text-xs"
                        >
                            <LayoutList className="mr-2 h-3.5 w-3.5" />
                            Detail
                        </Button>
                        <Button
                            variant={viewMode === 'matrix' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('matrix')}
                            className="h-8 px-3 text-xs"
                        >
                            <TableIcon className="mr-2 h-3.5 w-3.5" />
                            Matrix
                        </Button>
                    </div>
                </div>


            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {viewMode === 'matrix' ? (
                    <CashbackMatrixView
                        data={filteredData}
                        cards={cards}
                        year={year}
                        onMonthClick={(cardId, cardName, month) => {
                            setSelectedCardId(cardId)
                            setDetailModal({ month })
                        }}
                    />
                ) : (
                    <>
                        {/* Sidebar - Card List */}
                        <Card className="w-80 flex flex-col h-full rounded-none border-r border-t-0 border-b-0 border-l-0 shadow-none bg-muted/10">
                            <div className="flex-1 overflow-auto">
                                <div className="p-2 space-y-2">
                                    {filteredData.map(summary => {
                                        const cardInfo = cards.find(c => c.accountId === summary.cardId)
                                        return (
                                            <div
                                                key={summary.cardId}
                                                onClick={() => setSelectedCardId(summary.cardId)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                                    selectedSummary?.cardId === summary.cardId ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                                                )}
                                            >
                                                <div className="w-10 h-6 relative shrink-0">
                                                    {cardInfo?.accountLogoUrl ? (
                                                        <Image
                                                            src={cardInfo.accountLogoUrl}
                                                            alt={cardInfo.accountName}
                                                            fill
                                                            className="object-contain"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-200 rounded" />
                                                    )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-medium truncate text-sm">{cardInfo?.accountName || 'Unknown Card'}</div>
                                                    <div className={cn("text-xs font-mono", summary.netProfit >= 0 ? "text-green-600" : "text-red-500")}>
                                                        {summary.netProfit > 0 ? '+' : ''}{fmt(summary.netProfit)}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </Card>

                        {/* Main Content */}
                        <div className="flex-1 overflow-auto p-2">
                            {selectedSummary ? (
                                <div className="space-y-6">
                                    {/* Header */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-bold">{selectedCardInfo?.accountName}</h2>
                                            <div className="text-muted-foreground text-sm">
                                                Net Profit: <span className={cn(selectedSummary.netProfit >= 0 ? "text-green-600" : "text-red-600")}>{fmt(selectedSummary.netProfit)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6+6 Table */}
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* First Half (Jan-Jun) */}
                                        <MonthTableHalf summary={selectedSummary} range={[1, 6]} onMonthClick={handleMonthClick} />

                                        {/* Second Half (Jul-Dec) */}
                                        <MonthTableHalf summary={selectedSummary} range={[7, 12]} onMonthClick={handleMonthClick} />
                                    </div>

                                    {/* Totals Row */}
                                    <Card>
                                        <CardContent className="p-4 grid grid-cols-5 gap-4 text-center">
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase">Rate</div>
                                                {tieredMap?.[selectedSummary.cardId] ? (
                                                    <div className="text-sm font-medium text-purple-700 bg-purple-50 rounded px-2 inline-flex items-center gap-2">
                                                        Varies by tier
                                                        <a className="underline text-purple-700" href={`/accounts/${selectedSummary.cardId}?tab=cashback`} target="_blank" rel="noreferrer">rules</a>
                                                    </div>
                                                ) : (
                                                    <div className="text-lg font-bold">{(selectedCardInfo?.rate || 0) * 100}%</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase">Max/Cycle</div>
                                                <div className="text-lg font-bold">{selectedCardInfo?.maxCashback ? fmt(selectedCardInfo.maxCashback) : '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase">Total Give Away</div>
                                                <div className="text-lg font-bold text-amber-600">{fmt(selectedSummary.months.reduce((sum, m) => sum + m.totalGivenAway, 0))}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase">Redeemed This Year</div>
                                                <div className="text-lg font-bold text-green-600">+{fmt(selectedSummary.cashbackRedeemedYearTotal)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase">Annual Fee</div>
                                                <div className="text-lg font-bold text-red-500">-{fmt(selectedSummary.annualFeeYearTotal)}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Select a card to view analytics
                                </div>
                            )}
                        </div>

                        {detailModal && selectedSummary?.cardId && (
                            <CashbackMonthDetailModal
                                open={!!detailModal}
                                onOpenChange={(op) => !op && setDetailModal(null)}
                                mode="card"
                                cardId={selectedSummary.cardId}
                                cardName={selectedCardInfo?.accountName || 'Card'}
                                month={detailModal.month}
                                year={year}
                                initialTab={detailModal.tab}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

function MonthTableHalf({ summary, range, onMonthClick }: { summary: CashbackYearSummary, range: [number, number], onMonthClick: (m: number, tab?: string) => void }) {
    const months = summary.months.filter(m => m.month >= range[0] && m.month <= range[1])
    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n))

    // Fill missing months if necessary
    const displayMonths: { month: number, totalGivenAway: number, cashbackGiven: number }[] = []
    for (let i = range[0]; i <= range[1]; i++) {
        const found = months.find(m => m.month === i)
        displayMonths.push(found || { month: i, totalGivenAway: 0, cashbackGiven: 0 })
    }

    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    return (
        <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-muted/50 text-left">
                        <th className="p-2 font-medium w-32">Metric</th>
                        {displayMonths.map(m => (
                            <th key={m.month} className="p-2 font-medium text-right w-24">
                                {monthNames[m.month]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {/* Give Away Row */}
                    <tr>
                        <td className="p-2 font-medium text-muted-foreground">Give Away</td>
                        {displayMonths.map(m => (
                            <td
                                key={m.month}
                                className={`p-2 text-right transition-colors ${m.totalGivenAway > 0 ? 'hover:bg-blue-50 cursor-pointer hover:text-blue-600 font-medium' : ''}`}
                                title={m.totalGivenAway > 0 ? 'Click to view transactions' : ''}
                                onClick={() => m.totalGivenAway > 0 && onMonthClick(m.month)}
                            >
                                {m.totalGivenAway > 0 ? (
                                    <span className="underline decoration-blue-400">{fmt(m.totalGivenAway)}</span>
                                ) : (
                                    '-'
                                )}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div >
    )
}
