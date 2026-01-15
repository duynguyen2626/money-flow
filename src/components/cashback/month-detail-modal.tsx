'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState } from 'react'
import { fetchMonthlyCashbackDetails } from '@/actions/cashback.actions'
import { Loader2 } from 'lucide-react'
import { MonthDetailModalProps, VolunteerTransaction } from '@/types/cashback.types'

export function CashbackMonthDetailModal({
    open,
    onOpenChange,
    mode,
    cardId,
    cardName,
    accountId,
    accountName,
    month,
    year,
    initialTab
}: MonthDetailModalProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [data, setData] = useState<any[]>([])
    const [volunteerData, setVolunteerData] = useState<VolunteerTransaction[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch data based on mode
    useEffect(() => {
        if (!open) return

        const fetchData = async () => {
            setLoading(true)
            try {
                if (mode === 'card' && cardId) {
                    const res = await fetchMonthlyCashbackDetails(cardId, month, year)
                    setData(res)
                } else if (mode === 'volunteer' && accountId) {
                    const res = await fetch(
                        `/api/cashback/volunteer-transactions?account_id=${accountId}&month=${month}&year=${year}`
                    )

                    if (!res.ok) {
                        console.error('Failed to fetch volunteer transactions:', res.statusText)
                        setVolunteerData([])
                        return
                    }

                    const transactions = await res.json()

                    // Ensure we always set an array
                    if (Array.isArray(transactions)) {
                        setVolunteerData(transactions)
                    } else {
                        console.error('Volunteer transactions response is not an array:', transactions)
                        setVolunteerData([])
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error)
                if (mode === 'volunteer') {
                    setVolunteerData([])
                } else {
                    setData([])
                }
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [open, mode, cardId, accountId, month, year])

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n))
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
    const displayName = mode === 'card' ? cardName : accountName

    // Card mode data - Filter only transactions with cashback
    const expenses = data.filter((t: any) => {
        const sharePercent = parseFloat(t.cashback_share_percent || '0')
        const shareFixed = parseFloat(t.cashback_share_fixed || '0')
        const txnAmount = Math.abs(t.amount)
        const cashbackGivenAway = (sharePercent * txnAmount) + shareFixed
        return cashbackGivenAway > 0
    })
    const shareBacks = data.filter((t: any) => t.cashbackGiven > 0)

    // Calculate total original amount (Lend)
    const totalOriginalAmount = expenses.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)

    // Calculate total cashback given away: sum of (cashback_share_percent * amount + cashback_share_fixed)
    const totalLent = expenses.reduce((sum: number, t: any) => {
        const sharePercent = parseFloat(t.cashback_share_percent || '0')
        const shareFixed = parseFloat(t.cashback_share_fixed || '0')
        const txnAmount = Math.abs(t.amount)
        const cashbackGivenAway = (sharePercent * txnAmount) + shareFixed
        return sum + cashbackGivenAway
    }, 0)

    const totalGiven = shareBacks.reduce((sum: number, t: any) => sum + (t.cashbackGiven || 0), 0)

    // Volunteer mode data - safe array check
    const volunteerTotal = Array.isArray(volunteerData)
        ? volunteerData.reduce((sum, t) => sum + t.cashbackGiven, 0)
        : 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'card' ? 'Card Transactions' : 'Volunteer Cashback'} - {displayName}
                    </DialogTitle>
                    <DialogDescription>
                        {monthName} {year}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : mode === 'card' ? (
                    // CARD MODE - Single table, no tabs
                    <div className="flex-1 overflow-auto border rounded-md">
                        <div className="p-3 bg-muted/30 border-b">
                            <h3 className="font-semibold">Give Away ({fmt(totalLent)})</h3>
                        </div>
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">% Back</TableHead>
                                    <TableHead className="text-right">Fixed Back</TableHead>
                                    <TableHead className="text-right">Σ Back</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No eligible transactions</TableCell></TableRow>
                                ) : expenses.map((t: any) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="whitespace-nowrap w-24">
                                            {new Date(t.occurred_at).toLocaleDateString('vi-VN')}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={t.note || ''}>
                                            {t.note || (t.category?.name ?? 'Unknown')}
                                        </TableCell>
                                        <TableCell>{t.category?.icon} {t.category?.name}</TableCell>
                                        <TableCell className="text-right font-medium">{fmt(Math.abs(t.amount))}</TableCell>
                                        <TableCell className="text-right text-amber-600">
                                            {t.cashback_share_percent ? `${(parseFloat(t.cashback_share_percent) * 100).toFixed(0)}%` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-amber-600">
                                            {t.cashback_share_fixed ? fmt(parseFloat(t.cashback_share_fixed)) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-blue-600">
                                            {(() => {
                                                const sharePercent = parseFloat(t.cashback_share_percent || '0')
                                                const shareFixed = parseFloat(t.cashback_share_fixed || '0')
                                                const txnAmount = Math.abs(t.amount)
                                                const total = (sharePercent * txnAmount) + shareFixed
                                                return total > 0 ? fmt(total) : '-'
                                            })()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    // VOLUNTEER MODE - Single table with Person, Original, Final, You Gave columns
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="mb-2 text-sm text-muted-foreground">
                            Total cashback given: <span className="font-bold text-green-600">{fmt(volunteerTotal)}</span>
                        </div>
                        <div className="flex-1 overflow-auto border rounded-md">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Person</TableHead>
                                        <TableHead>Note</TableHead>
                                        <TableHead className="text-right">Original</TableHead>
                                        <TableHead className="text-right">Final</TableHead>
                                        <TableHead className="text-right">You Gave</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {volunteerData.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No volunteer transactions found</TableCell></TableRow>
                                    ) : volunteerData.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="whitespace-nowrap w-24">
                                                {new Date(tx.date).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {tx.personImageUrl ? (
                                                        <img
                                                            src={tx.personImageUrl}
                                                            alt={tx.personName}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                                                            {tx.personName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="font-medium">{tx.personName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={tx.note}>
                                                {tx.note}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {fmt(tx.originalAmount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {fmt(tx.finalPrice)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                {fmt(tx.cashbackGiven)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
