'use client'

import { VolunteerCashbackData } from '@/types/cashback.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { CashbackMonthDetailModal } from './month-detail-modal'

interface Props {
    data: VolunteerCashbackData[]
    year: number
}

export function CashbackVolunteerMatrixView({ data, year }: Props) {
    const [detailModal, setDetailModal] = useState<{ accountId: string, accountName: string, month: number } | null>(null)

    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // Helper for currency formatting
    const fmt = (n: number) => {
        if (n === 0) return '-'
        return new Intl.NumberFormat('vi-VN').format(Math.round(n))
    }

    const handleMonthClick = (accountId: string, accountName: string, month: number) => {
        setDetailModal({ accountId, accountName, month })
    }

    // Calculate monthly totals across all people
    const monthlyTotals: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) {
        monthlyTotals[m] = data.reduce((sum, person) => {
            const monthData = person.months.find(md => md.month === m)
            return sum + (monthData?.cashbackGiven || 0)
        }, 0)
    }

    const grandTotal = data.reduce((sum, person) => sum + person.yearTotal, 0)

    return (
        <>
            <div className="border rounded-sm overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b">
                    <p className="text-xs text-muted-foreground">Click on any amount to view transaction details</p>
                </div>
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[200px] bg-slate-50 border-r text-left">Account</TableHead>
                            {monthNames.slice(1).map((name, idx) => (
                                <TableHead key={idx + 1} className="text-center min-w-[100px] bg-slate-50 border-r px-2">
                                    {name}
                                </TableHead>
                            ))}
                            <TableHead className="text-center font-bold bg-slate-50 px-2">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={14} className="text-center h-24 text-muted-foreground">
                                    No volunteer cashback transactions found
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {data.map(person => (
                                    <TableRow key={person.personId} className="hover:bg-muted/10">
                                        <TableCell className="font-medium border-r px-2 py-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                {person.personImageUrl ? (
                                                    <img
                                                        src={person.personImageUrl}
                                                        alt={person.personName}
                                                        className="w-6 h-6 rounded-none object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-none bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                                                        {person.personName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span>{person.personName}</span>
                                            </div>
                                        </TableCell>
                                        {monthNames.slice(1).map((_, idx) => {
                                            const month = idx + 1
                                            const monthData = person.months.find(m => m.month === month)
                                            const value = monthData?.cashbackGiven || 0

                                            return (
                                                <TableCell
                                                    key={month}
                                                    className={cn(
                                                        "text-center text-xs border-r px-2 py-2",
                                                        value > 0 ? "hover:bg-blue-50 cursor-pointer" : "text-muted-foreground"
                                                    )}
                                                    onClick={() => value > 0 && handleMonthClick(person.personId, person.personName, month)}
                                                >
                                                    {value > 0 ? (
                                                        <span className="text-sm font-semibold text-blue-700 cursor-pointer">{fmt(value)}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">0</span>
                                                    )}
                                                </TableCell>
                                            )
                                        })}
                                        <TableCell className="text-center font-bold text-sm px-2 py-2 text-green-700">
                                            {fmt(person.yearTotal)}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {/* Total Row */}
                                <TableRow className="bg-muted/30 font-bold border-t">
                                    <TableCell className="border-r px-2 py-2">TOTAL</TableCell>
                                    {monthNames.slice(1).map((_, idx) => {
                                        const month = idx + 1
                                        const total = monthlyTotals[month] || 0
                                        return (
                                            <TableCell key={month} className="text-center text-xs border-r px-2 py-2">
                                                {total > 0 ? fmt(total) : '0'}
                                            </TableCell>
                                        )
                                    })}
                                    <TableCell className="text-center text-sm px-2 py-2 text-green-800">
                                        {fmt(grandTotal)}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>

            {detailModal && (
                <CashbackMonthDetailModal
                    open={!!detailModal}
                    onOpenChange={(op) => !op && setDetailModal(null)}
                    mode="volunteer"
                    accountId={detailModal.accountId}
                    accountName={detailModal.accountName}
                    month={detailModal.month}
                    year={year}
                />
            )}
        </>
    )
}
