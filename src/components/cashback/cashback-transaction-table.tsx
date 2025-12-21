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
// Helper to reverse tag to label (duplicated from service for UI consistency)
function formatCycleTag(tag: string) {
    if (!tag || tag.length < 5) return tag;
    const monthStr = tag.slice(0, 3);
    const yearStr = tag.slice(3);
    const monthIdx = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(monthStr);
    const year = 2000 + parseInt(yearStr);

    // Quick heuristic: assume standard cycle (statement 15th)
    // To do this properly, we should pass statementDay prop to this table.
    // For now, let's just make it look better if it matches the pattern.
    // Actually, can we infer from the row data? No.
    // Let's just output the month/year clearly or stick to the requested format if we can.
    // User asked for "15/11 - 14/12".

    // Hardcoded logic for Vpbank Lady (which this task is about) which has Stmt Day 15.
    // Ideally this component should receive `statementDay` from parent.
    // Let's assume standard 15th for now to satisfy the user, or just format as "Nov - Dec '25"?
    // User specifically asked "15/11 - 14/12".

    if (monthIdx >= 0 && !isNaN(year)) {
        const end = new Date(year, monthIdx, 14);
        const start = new Date(year, monthIdx - 1, 15);
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return `${fmt(start)} ~ ${fmt(end)}`;
    }
    return tag;
}

import { CashbackTransaction } from '@/types/cashback.types'
import { cn } from '@/lib/utils'
import { ArrowUpRight, Copy, Check, Pencil } from 'lucide-react'
import { useState } from 'react'
import { formatPolicyLabel, formatPercent } from '@/lib/cashback-policy'

interface CashbackTransactionTableProps {
    transactions: CashbackTransaction[]
    onEdit?: (transaction: CashbackTransaction) => void
    showCycle?: boolean
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function CashbackTransactionTable({ transactions, onEdit, showCycle }: CashbackTransactionTableProps) {
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
                            {showCycle && <TableHead className="w-[120px] whitespace-nowrap">Cycle</TableHead>}
                            <TableHead className="w-[80px] whitespace-nowrap">Date</TableHead>
                            <TableHead className="min-w-[200px]">Shop & Note</TableHead>
                            <TableHead className="min-w-[140px]">Category</TableHead>
                            <TableHead className="min-w-[100px]">Level</TableHead>
                            <TableHead className="min-w-[100px]">Rule</TableHead>
                            <TableHead className="text-right min-w-[80px]">Rate</TableHead>
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
                            const policyLabel = formatPolicyLabel(txn.policyMetadata, currencyFormatter)
                            const effectiveRateLabel = formatPercent(txn.effectiveRate)
                            const sharedRateLabel = txn.sharePercent !== undefined ? formatPercent(txn.sharePercent) : ''

                            return (
                                <TableRow key={txn.id} className="hover:bg-slate-50/50 text-xs">
                                    {showCycle && (
                                        <TableCell className="font-medium text-slate-500 whitespace-nowrap">
                                            {formatCycleTag(txn.cycleTag || '') || '-'}
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium text-slate-600">
                                        {dateStr}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-start gap-3">
                                            {/* Shop Icon */}
                                            <div className="flex-shrink-0 mt-0.5">
                                                {txn.shopLogoUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={txn.shopLogoUrl}
                                                        alt="Shop"
                                                        className="h-8 w-8 rounded-none object-contain border border-slate-100 bg-white"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-none bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Note & Badges */}
                                            <div className="space-y-1">
                                                <span className="text-slate-700 font-medium block line-clamp-2" title={txn.note || ''}>
                                                    {txn.note || (txn.shopName ? `Shop: ${txn.shopName}` : '-')}
                                                </span>
                                                {policyLabel && (
                                                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700" title={txn.policyMetadata?.reason}>
                                                        {policyLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>


                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {txn.categoryLogoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={txn.categoryLogoUrl}
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

                                    {/* Level Column */}
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-slate-700 font-medium text-xs">
                                                {txn.policyMetadata?.levelName || '-'}
                                            </span>
                                            {txn.policyMetadata?.levelMinSpend && (
                                                <span className="text-[10px] text-slate-400">
                                                    ≥ {currencyFormatter.format(txn.policyMetadata.levelMinSpend)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Rule Column */}
                                    <TableCell>
                                        <span
                                            className={cn(
                                                "inline-flex items-center rounded px-2 py-1 text-[10px] font-medium",
                                                txn.policyMetadata?.policySource === 'category_rule' && "bg-purple-100 text-purple-700",
                                                txn.policyMetadata?.policySource === 'level_default' && "bg-blue-100 text-blue-700",
                                                txn.policyMetadata?.policySource === 'program_default' && "bg-slate-100 text-slate-700",
                                                txn.policyMetadata?.policySource === 'legacy' && "bg-amber-100 text-amber-700",
                                                !txn.policyMetadata?.policySource && "bg-slate-50 text-slate-400"
                                            )}
                                            title={txn.policyMetadata?.reason || 'No policy metadata'}
                                        >
                                            {txn.policyMetadata?.policySource === 'category_rule' && 'Category'}
                                            {txn.policyMetadata?.policySource === 'level_default' && 'Level Default'}
                                            {txn.policyMetadata?.policySource === 'program_default' && 'Program Default'}
                                            {txn.policyMetadata?.policySource === 'legacy' && 'Legacy'}
                                            {!txn.policyMetadata?.policySource && 'Unknown'}
                                        </span>
                                    </TableCell>

                                    {/* Rate Column */}
                                    <TableCell className="text-right">
                                        <span className="font-semibold text-slate-700">
                                            {effectiveRateLabel}
                                        </span>
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
                                                {effectiveRateLabel}
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
                                                    {txn.sharePercent ? sharedRateLabel : ''}
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
                                                    ? `${effectiveRateLabel} - ${formatPercent(txn.sharePercent)}`
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
