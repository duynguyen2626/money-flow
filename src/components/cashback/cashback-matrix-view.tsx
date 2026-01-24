'use client'

import { CashbackYearSummary, CashbackCard } from '@/types/cashback.types'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CashbackMonthDetailModal } from './month-detail-modal'
import { useState } from 'react'

interface Props {
    data: CashbackYearSummary[]
    cards: CashbackCard[]
    year: number
    onMonthClick?: (cardId: string, cardName: string, month: number) => void
}

export function CashbackMatrixView({ data, cards, year }: Props) {
    const [detailModal, setDetailModal] = useState<{ cardId: string, cardName: string, month: number } | null>(null)
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const derivedNet = (summary: CashbackYearSummary) => {
        const givenAway = summary.months.reduce((sum, m) => sum + m.totalGivenAway, 0)
        const annualFee = summary.annualFeeYearTotal || 0
        return (summary.cashbackRedeemedYearTotal || 0) - givenAway - annualFee
    }

    // Helper for full currency
    const fmt = (n: number) => {
        if (n === 0) return '-'
        return new Intl.NumberFormat('vi-VN').format(Math.round(n))
    }

    // Filter out:
    // 1. Accounts with "DUPLICATE" or "DO NOT USE" in name (case-insensitive)
    // 2. Accounts with absolutely no data (zero spend, profit, redeemed, given)
    const filteredData = data.filter(d => {
        const cardInfo = cards.find(c => c.accountId === d.cardId)
        const cardName = cardInfo?.accountName || ""

        // Filter 1: Exclude "DO NOT USE" or "DUPLICATE" accounts
        const nameUpper = cardName.toUpperCase()
        if (nameUpper.includes('DUPLICATE') || nameUpper.includes('DO NOT USE')) {
            return false
        }

        // Filter 2: Exclude zero-data accounts
        const hasActivity = derivedNet(d) !== 0 ||
            d.cashbackGivenYearTotal !== 0 ||
            d.cashbackRedeemedYearTotal !== 0 ||
            d.months.some(m => m.totalGivenAway > 0)

        return hasActivity
    })

    const renderHalf = (range: [number, number]) => {
        // Calculate Totals for this range
        const totalRedeemed = filteredData.reduce((sum, d) => sum + d.cashbackRedeemedYearTotal, 0)
        const totalAnnualFee = filteredData.reduce((sum, d) => sum + d.annualFeeYearTotal, 0)
        const totalProfit = filteredData.reduce((sum, d) => sum + derivedNet(d), 0)

        // Calculate monthly totals (Give Away = totalGivenAway)
        const monthTotals: Record<number, number> = {}
        for (let m = range[0]; m <= range[1]; m++) {
            monthTotals[m] = filteredData.reduce((sum, d) => {
                const md = d.months.find(x => x.month === m)
                return sum + (md?.totalGivenAway || 0)
            }, 0)
        }

        return (
            <Table className="border rounded-sm">
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                        <TableHead colSpan={9} className="bg-slate-50 border-b px-3 py-2">
                            <p className="text-xs text-muted-foreground font-normal">Click on any amount to view transaction details</p>
                        </TableHead>
                    </TableRow>
                    <TableRow>
                        <TableHead className="w-[250px] bg-slate-50 border-r text-left">Card ({range[0] === 1 ? 'Jan-Jun' : 'Jul-Dec'})</TableHead>
                        {Array.from({ length: range[1] - range[0] + 1 }, (_, i) => i + range[0]).map(m => (
                            <TableHead key={m} className="text-center min-w-[100px] bg-slate-50 border-r px-2">{monthNames[m]}</TableHead>
                        ))}
                        <TableHead className="text-center font-bold bg-slate-50 border-r px-2">Redeemed</TableHead>
                        <TableHead className="text-center font-bold bg-slate-50 border-r px-2">Annual Fee</TableHead>
                        <TableHead className="text-center font-bold bg-slate-50 px-2">Net Profit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map(summary => {
                        const cardInfo = cards.find(c => c.accountId === summary.cardId)
                        // Fallback for Unknown Card if cardInfo is missing but summary exists
                        const cardName = cardInfo?.accountName || "Unknown Card"
                        const cardLogo = cardInfo?.accountLogoUrl

                        return (
                            <TableRow key={summary.cardId} className="hover:bg-muted/20">
                                {/* Card Name */}
                                <TableCell className="font-medium border-r px-2 py-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-5 relative shrink-0">
                                            {cardLogo ? (
                                                <Image
                                                    src={cardLogo}
                                                    alt={cardName}
                                                    fill
                                                    className="object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-slate-200 rounded" />
                                            )}
                                        </div>
                                        <span className="truncate max-w-[180px]" title={cardName}>{cardName}</span>
                                    </div>
                                </TableCell>

                                {/* Months */}
                                {Array.from({ length: range[1] - range[0] + 1 }, (_, i) => i + range[0]).map(month => {
                                    const monthData = summary.months.find(m => m.month === month)
                                    // Display Give Away per month using totalGivenAway
                                    const val = monthData?.totalGivenAway || 0
                                    const cardInfo = cards.find(c => c.accountId === summary.cardId)
                                    const cardName = cardInfo?.accountName || "Unknown Card"

                                    return (
                                        <TableCell key={month} className={cn("text-center text-xs border-r px-2 py-2 transition-colors", val > 0 ? "hover:bg-blue-50 cursor-pointer" : "text-muted-foreground")}>
                                            {val > 0 ? (
                                                <span className="text-sm font-semibold text-blue-700 cursor-pointer" onClick={() => setDetailModal({ cardId: summary.cardId, cardName, month })}>
                                                    {fmt(val)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">0</span>
                                            )}
                                        </TableCell>
                                    )
                                })}

                                {/* Totals (Yearly) */}
                                <TableCell className={cn("text-center font-medium text-xs border-r px-2 py-2", summary.cashbackRedeemedYearTotal > 0 ? "text-green-600" : "text-muted-foreground")}>
                                    {fmt(summary.cashbackRedeemedYearTotal)}
                                </TableCell>
                                {/* Annual Fee Cell */}
                                <TableCell className={cn("text-center font-medium text-xs border-r px-2 py-2", summary.annualFeeYearTotal > 0 ? "text-red-600" : "text-muted-foreground")}>
                                    {summary.annualFeeYearTotal > 0 ? fmt(summary.annualFeeYearTotal) : '-'}
                                </TableCell>
                                <TableCell className={cn("text-center font-bold text-sm px-2 py-2", derivedNet(summary) >= 0 ? "text-green-600" : "text-red-600")}>
                                    {fmt(derivedNet(summary))}
                                </TableCell>
                            </TableRow>
                        )
                    })}

                    {/* Total Row */}
                    <TableRow className="bg-muted/30 font-bold border-t">
                        <TableCell className="border-r px-2 py-2">TOTAL</TableCell>
                        {Array.from({ length: range[1] - range[0] + 1 }, (_, i) => i + range[0]).map(month => (
                            <TableCell key={month} className="text-center text-xs border-r px-2 py-2">
                                {fmt(monthTotals[month] || 0)}
                            </TableCell>
                        ))}
                        <TableCell className="text-center text-xs border-r px-2 py-2 text-green-700">
                            {fmt(totalRedeemed)}
                        </TableCell>
                        {/* Total Annual Fee */}
                        <TableCell className="text-center text-xs border-r px-2 py-2 text-red-600">
                            {totalAnnualFee > 0 ? fmt(totalAnnualFee) : '-'}
                        </TableCell>
                        <TableCell className="text-center text-xs px-2 py-2 text-green-700">
                            {fmt(totalProfit)}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        )
    }

    return (
        <Card className="flex-1 overflow-hidden flex flex-col rounded-none border-0 shadow-none bg-transparent">
            <div className="flex-1 overflow-auto space-y-4 pb-4">
                <Tabs defaultValue="h1" className="w-full">
                    <TabsList className="grid w-[400px] grid-cols-2">
                        <TabsTrigger value="h1">Jan - Jun</TabsTrigger>
                        <TabsTrigger value="h2">Jul - Dec</TabsTrigger>
                    </TabsList>
                    <TabsContent value="h1" className="mt-4">
                        {renderHalf([1, 6])}
                    </TabsContent>
                    <TabsContent value="h2" className="mt-4">
                        {renderHalf([7, 12])}
                    </TabsContent>
                </Tabs>
            </div>

            {detailModal && (
                <CashbackMonthDetailModal
                    open={!!detailModal}
                    onOpenChange={(op) => !op && setDetailModal(null)}
                    mode="card"
                    cardId={detailModal.cardId}
                    cardName={detailModal.cardName}
                    month={detailModal.month}
                    year={year}
                />
            )}
        </Card>
    )
}
