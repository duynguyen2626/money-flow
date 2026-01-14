'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState } from 'react'
import { fetchMonthlyCashbackDetails } from '@/actions/cashback.actions'
import { Loader2 } from 'lucide-react'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    cardId: string | null
    cardName: string
    month: number
    year: number
}

export function CashbackMonthDetailModal({ open, onOpenChange, cardId, cardName, month, year }: Props) {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && cardId) {
            setLoading(true)
            fetchMonthlyCashbackDetails(cardId, month, year)
                .then(res => setData(res))
                .finally(() => setLoading(false))
        }
    }, [open, cardId, month, year])

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n))
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })

    // Segregate data
    const expenses = data
    const shareBacks = data.filter((t: any) => t.cashbackGiven > 0)

    // Calculate totals
    const totalSpend = expenses.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)
    const totalGiven = shareBacks.reduce((sum: number, t: any) => sum + (t.cashbackGiven || 0), 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Cashback Details - {cardName} - {monthName} {year}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="spend" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList>
                        <TabsTrigger value="spend">Eligible Spend ({fmt(totalSpend)})</TabsTrigger>
                        <TabsTrigger value="share">Share Back ({fmt(totalGiven)})</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto mt-2 border rounded-md relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : null}

                        <TabsContent value="spend" className="h-full m-0">
                            <div className="h-full overflow-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No eligible transactions</TableCell></TableRow>
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
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="share" className="h-full m-0">
                            <div className="h-full overflow-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Note</TableHead>
                                            <TableHead className="text-right">Shared Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {shareBacks.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No share-backs found</TableCell></TableRow>
                                        ) : shareBacks.map((t: any) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="whitespace-nowrap w-24">
                                                    {new Date(t.occurred_at).toLocaleDateString('vi-VN')}
                                                </TableCell>
                                                <TableCell className="max-w-[300px] truncate">
                                                    {t.note}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-blue-600">{fmt(t.cashbackGiven)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
