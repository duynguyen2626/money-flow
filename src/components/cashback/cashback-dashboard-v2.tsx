'use client'

import { useState } from 'react'
import { CashbackYearSummary, CashbackCard } from '@/types/cashback.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { CashbackMatrixView } from './cashback-matrix-view'
import { CashbackMonthDetailModal } from './month-detail-modal'
import { LayoutList, Table as TableIcon, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CashbackCardWithConfig = CashbackCard & { cashback_config?: any }

interface Props {
    initialData: CashbackYearSummary[]
    year: number
    cards: CashbackCardWithConfig[]
    tieredMap?: Record<string, boolean>
}

export function CashbackDashboardV2({ initialData, year, cards, tieredMap }: Props) {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(initialData[0]?.cardId ?? null)
    const [detailModal, setDetailModal] = useState<{ month: number, tab?: string } | null>(null)
    const [viewMode, setViewMode] = useState<'detail' | 'matrix'>('detail')
    const [searchQuery, setSearchQuery] = useState('')


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

    // Apply search filter
    const searchFiltered = filteredData.filter(d => {
        if (!searchQuery) return true
        const cardInfo = cards.find(c => c.accountId === d.cardId)
        const cardName = cardInfo?.accountName || ""
        return cardName.toLowerCase().includes(searchQuery.toLowerCase())
    })

    const selectedSummary = searchFiltered.find(d => d.cardId === selectedCardId) || searchFiltered[0]
    const selectedCardInfo = cards.find(c => c.accountId === selectedSummary?.cardId)

    // Calculate Give Away from monthly data sum (not from DB field)
    const sharedYear = selectedSummary?.months.reduce((sum, m) => sum + m.totalGivenAway, 0) ?? 0
    const bankBackYear = selectedSummary?.cashbackRedeemedYearTotal ?? 0
    const annualFeeYear = selectedSummary?.annualFeeYearTotal ?? 0
    const derivedNet = bankBackYear - sharedYear - annualFeeYear

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
                        <Card className="w-80 flex flex-col h-full rounded-none border-r border-t-0 border-b-0 border-l-0 shadow-none bg-white">
                            {/* Search input */}
                            <div className="p-2 border-b">
                                <input
                                    type="text"
                                    placeholder="Search cards..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>
                            <div className="flex-1 overflow-auto">
                                <div className="p-2 space-y-2">
                                    {searchFiltered.map(summary => {
                                        const cardInfo = cards.find(c => c.accountId === summary.cardId)
                                        return (
                                            <div
                                                key={summary.cardId}
                                                onClick={() => setSelectedCardId(summary.cardId)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-sm cursor-pointer transition-colors border",
                                                    selectedSummary?.cardId === summary.cardId ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:border-slate-300"
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
                                                    <div className="text-xs text-muted-foreground">Net Profit</div>
                                                    <div className={cn("text-sm tabular-nums", derivedNet >= 0 ? "text-green-600" : "text-red-500")}>
                                                        {derivedNet > 0 ? '+' : ''}{fmt(derivedNet)}
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
                                    {/* Summary Table at Top */}
                                    <Card className="border-slate-200">
                                        <CardContent className="p-0">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-slate-50">
                                                        <th className="text-left p-3 font-medium text-xs text-muted-foreground uppercase">Card</th>
                                                        <th className="text-center p-3 font-medium text-xs text-muted-foreground uppercase">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-center gap-1 cursor-help">
                                                                            Rate <HelpCircle className="w-3 h-3 text-blue-500" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Tỷ lệ cashback cơ sở</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </th>
                                                        <th className="text-right p-3 font-medium text-xs text-muted-foreground uppercase">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-end gap-1 cursor-help">
                                                                            Max/Cycle <HelpCircle className="w-3 h-3 text-blue-500" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Giới hạn cashback/chu kỳ</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </th>
                                                        <th className="text-right p-3 font-medium text-xs text-muted-foreground uppercase">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-end gap-1 cursor-help">
                                                                            Bank Back <HelpCircle className="w-3 h-3 text-blue-500" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Cashback từ ngân hàng</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </th>
                                                        <th className="text-right p-3 font-medium text-xs text-muted-foreground uppercase">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-end gap-1 cursor-help">
                                                                            Give Away <HelpCircle className="w-3 h-3 text-blue-500" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Đã chia sẻ cho người khác</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </th>
                                                        <th className="text-right p-3 font-medium text-xs text-muted-foreground uppercase">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-end gap-1 cursor-help">
                                                                            Annual Fee <HelpCircle className="w-3 h-3 text-blue-500" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Phí hàng năm</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </th>
                                                        <th className="text-right p-3 font-medium text-xs text-muted-foreground uppercase">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-end gap-1 cursor-help">
                                                                            Net Profit <HelpCircle className="w-3 h-3 text-blue-500" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Bank Back - Give Away - Annual Fee</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b">
                                                        <td className="p-3 font-medium">{selectedCardInfo?.accountName}</td>
                                                        <td className="p-3 text-center">
                                                            {tieredMap?.[selectedSummary.cardId] ? (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <button className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1 inline-flex items-center gap-1 hover:bg-purple-100 transition-colors">
                                                                            Advanced Rules <HelpCircle className="w-3 h-3" />
                                                                        </button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-96 p-3 shadow-xl border-slate-200" align="center" side="bottom">
                                                                        <div className="space-y-3">
                                                                            <h4 className="text-[10px] font-black uppercase text-slate-500 border-b pb-1">Advanced Cashback Strategy</h4>
                                                                            <div className="space-y-4">
                                                                                {(() => {
                                                                                    try {
                                                                                        const configData = selectedCardInfo?.cashback_config as any
                                                                                        if (!configData) {
                                                                                            return <div className="text-xs text-slate-500">No config found</div>
                                                                                        }
                                                                                        const config = typeof configData === 'string' ? JSON.parse(configData) : configData
                                                                                        const levels = config?.program?.levels || config?.levels || []
                                                                                        if (!levels || levels.length === 0) {
                                                                                            return <div className="text-xs text-slate-500 italic">Flat rate: {((config?.program?.defaultRate || 0) * 100).toFixed(1)}%</div>
                                                                                        }
                                                                                        return levels.map((lvl: any, lIdx: number) => (
                                                                                        <div key={lvl.id || lIdx} className="space-y-1.5">
                                                                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-900 bg-slate-50 p-1.5 rounded">
                                                                                                <span>{lvl.name || `Level ${lIdx + 1}`}</span>
                                                                                                <span className="text-indigo-600 text-[9px]">≥{new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 0 }).format(lvl.minTotalSpend)}</span>
                                                                                            </div>
                                                                                            <div className="space-y-1 pl-1.5">
                                                                                                {lvl.rules && lvl.rules.length > 0 && (
                                                                                                    <>
                                                                                                        {lvl.rules.map((r: any, rIdx: number) => (
                                                                                                            <div key={r.id || rIdx} className="flex justify-between items-start text-[10px] leading-tight">
                                                                                                                <span className="text-slate-500 font-medium">Category rule</span>
                                                                                                                <div className="flex flex-col items-end shrink-0 ml-2">
                                                                                                                    <span className="font-black text-emerald-600">{(r.rate * 100).toFixed(1)}%</span>
                                                                                                                    {r.maxReward && <span className="text-[8px] text-slate-400">Cap {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(r.maxReward)}</span>}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </>
                                                                                                )}
                                                                                                {lvl.defaultRate !== null && lvl.defaultRate !== undefined && (
                                                                                                    <div className="flex justify-between items-center text-[10px] opacity-70 italic border-t border-dashed border-slate-200 pt-1 mt-1">
                                                                                                        <span className="text-slate-500">Other spend:</span>
                                                                                                        <span className="font-bold">{(lvl.defaultRate * 100).toFixed(1)}%</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                    } catch (e) {
                                                                                        console.error('Error parsing cashback config:', e)
                                                                                        return <div className="text-xs text-red-500">Error loading config</div>
                                                                                    }
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            ) : (
                                                                <span className="font-bold">{(selectedCardInfo?.rate || 0) * 100}%</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-right tabular-nums">{selectedCardInfo?.maxCashback ? fmt(selectedCardInfo.maxCashback) : '-'}</td>
                                                        <td className="p-3 text-right tabular-nums font-bold text-green-700">{fmt(bankBackYear)}</td>
                                                        <td className="p-3 text-right tabular-nums font-bold text-amber-600">{fmt(sharedYear)}</td>
                                                        <td className="p-3 text-right tabular-nums font-bold text-red-500">{fmt(annualFeeYear)}</td>
                                                        <td className={cn("p-3 text-right tabular-nums font-bold", derivedNet >= 0 ? "text-green-600" : "text-red-600")}>{fmt(derivedNet)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>

                                    {/* Header */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-bold">{selectedCardInfo?.accountName}</h2>
                                            <div className="text-muted-foreground text-sm">Monthly breakdown</div>
                                        </div>
                                    </div>

                                    {/* 6+6 Table */}
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* First Half (Jan-Jun) */}
                                        <MonthTableHalf summary={selectedSummary} range={[1, 6]} onMonthClick={handleMonthClick} />

                                        {/* Second Half (Jul-Dec) */}
                                        <MonthTableHalf summary={selectedSummary} range={[7, 12]} onMonthClick={handleMonthClick} />
                                    </div>
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
        <div className="border rounded-sm overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b">
                <p className="text-xs text-muted-foreground">Click on any amount to view transaction details</p>
            </div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 text-left">
                        <th className="p-2 font-medium w-32">Metric</th>
                        {displayMonths.map(m => (
                            <th key={m.month} className="p-2 font-medium text-center w-24">
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
                                className={`p-2 text-center transition-colors ${m.totalGivenAway > 0 ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
                                title={m.totalGivenAway > 0 ? 'Click to view transactions' : ''}
                                onClick={() => m.totalGivenAway > 0 && onMonthClick(m.month)}
                            >
                                {m.totalGivenAway > 0 ? (
                                    <span className="text-sm font-semibold text-blue-700">{fmt(m.totalGivenAway)}</span>
                                ) : (
                                    <span className="text-muted-foreground">0</span>
                                )}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div >
    )
}
