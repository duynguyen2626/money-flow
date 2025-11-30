'use client'

import React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { CashbackTransaction } from '@/types/cashback.types'
import { cn } from '@/lib/utils'
import { ArrowUpRight, Copy, Check, Pencil } from 'lucide-react'
import { useState } from 'react'

interface CashbackTransactionTableProps {
    transactions: CashbackTransaction[]
    onEdit?: (transaction: CashbackTransaction) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})

export function CashbackTransactionTable({ transactions, onEdit }: CashbackTransactionTableProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-10 text-gray-400 border rounded-lg border-dashed">
                <p>No transactions found for this period.</p>
            </div>
        )
    }

    return (
        <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[80px] whitespace-nowrap">Date</TableHead>
                            <TableHead className="min-w-[150px]">Shop</TableHead>
                            <TableHead className="min-w-[150px]">Note</TableHead>
                            <TableHead className="min-w-[140px]">Category</TableHead>
                            <TableHead className="text-right min-w-[110px]">Amount</TableHead>
                            <TableHead className="text-right min-w-[110px] bg-blue-50/50">Initial Back</TableHead>
                            <TableHead className="text-right min-w-[110px] bg-orange-50/50">People Back</TableHead>
                            <TableHead className="text-right min-w-[110px] bg-emerald-50/50 font-bold">Profit</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((txn) => {
                            const date = new Date(txn.occurred_at)
                            const dateStr = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`

                            const isProfitPositive = txn.profit >= 0

                            return (
                                <TableRow key={txn.id} className="hover:bg-slate-50/50 text-xs">
                                    <TableCell className="font-medium text-slate-600">
                                        {dateStr}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {txn.shopLogoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={txn.shopLogoUrl}
                                                    alt="Shop"
                                                    className="h-6 w-6 rounded-full object-cover border border-slate-100"
                                                />
                                            ) : (
                                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <ArrowUpRight className="h-3 w-3" />
                                                </div>
                                            )}
                                            <span className="font-medium text-slate-900 line-clamp-1">
                                                {txn.shopName || 'Unknown Shop'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="text-slate-500 line-clamp-2" title={txn.note || ''}>
                                            {txn.note || '-'}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {txn.categoryImageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={txn.categoryImageUrl}
                                                    alt="Category"
                                                    className="h-5 w-5 object-contain"
                                                />
                                            ) : (
                                                <span className="text-base">{txn.categoryIcon || '📦'}</span>
                                            )}
                                            <span className="text-slate-700 line-clamp-1">
                                                {txn.categoryName || 'Uncategorized'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="font-medium text-slate-900">
                                            {currencyFormatter.format(txn.amount)}
                                        </div>
                                    </TableCell>

                                    {/* Initial Back (Bank) */}
                                    <TableCell className="text-right bg-blue-50/30">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-blue-700">
                                                +{currencyFormatter.format(txn.bankBack)}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {percentFormatter.format(txn.effectiveRate)}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* People Back (Shared) */}
                                    <TableCell className="text-right bg-orange-50/30">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="flex items-center gap-1.5 justify-end w-full">
                                                {txn.personName && (
                                                    <span className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800 whitespace-nowrap">
                                                        {txn.personName}
                                                    </span>
                                                )}
                                                <span className={cn(
                                                    "font-bold",
                                                    txn.peopleBack > 0 ? "text-orange-600" : "text-slate-300"
                                                )}>
                                                    {txn.peopleBack > 0 ? `-${currencyFormatter.format(txn.peopleBack)}` : '-'}
                                                </span>
                                            </div>
                                            {txn.peopleBack > 0 && (
                                                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                                    {txn.sharePercent ? percentFormatter.format(txn.sharePercent) : ''}
                                                    {txn.sharePercent && txn.shareFixed ? ' + ' : ''}
                                                    {txn.shareFixed ? currencyFormatter.format(txn.shareFixed) : ''}
                                                    {!txn.sharePercent && !txn.shareFixed && 'Shared'}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Profit */}
                                    <TableCell className="text-right bg-emerald-50/30">
                                        <div className="flex flex-col items-end">
                                            <span className={cn(
                                                "font-bold",
                                                isProfitPositive ? "text-emerald-600" : "text-red-500"
                                            )}>
                                                {isProfitPositive ? '+' : ''}{currencyFormatter.format(txn.profit)}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {txn.peopleBack > 0
                                                    ? `${percentFormatter.format(txn.effectiveRate)} - ${percentFormatter.format(txn.sharePercent || 0)}`
                                                    : '100% Profit'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(txn)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Edit Transaction"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleCopyId(txn.id)}
                                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                title="Copy ID"
                                            >
                                                {copiedId === txn.id ? (
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                ) : (
                                                    <Copy className="h-3 w-3" />
                                                )}
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
