'use client'

import React from 'react'
import NextLink from 'next/link'
import { cn } from '@/lib/utils'
import { TransactionWithDetails, Account, Category, Person } from '@/types/moneyflow.types'
import { Badge } from "@/components/ui/badge"
import { Edit2, Copy, MoreHorizontal, ArrowRight, Info, CreditCard, Link2 as LinkIcon, Users } from 'lucide-react'
import { CustomTooltip } from "@/components/ui/custom-tooltip"

type FinancialTransactionRowProps = {
    transaction: TransactionWithDetails
    isSelected: boolean
    onSelect: (checked: boolean) => void
    onEdit: () => void
    onCopy: () => void
    accounts: Account[]
    categories: Category[]
    people: Person[]
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function FinancialTransactionRow({
    transaction: txn,
    isSelected,
    onSelect,
    onEdit,
    onCopy,
    accounts,
    categories,
    people
}: FinancialTransactionRowProps) {
    const isVoid = txn.status === 'void'

    // Date formatting
    const date = new Date(txn.occurred_at ?? txn.created_at ?? new Date())
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    const day = String(date.getDate()).padStart(2, '0')
    const month = monthNames[date.getMonth()]
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    // Shop/Category Image
    const shopImg = txn.shop_image_url || txn.category_image_url
    const shopName = txn.shop_name || txn.category_name || 'Transaction'

    // Notes badges
    const metadata = txn.metadata as any
    const hasSplit = metadata?.is_split || metadata?.split_count > 0
    const hasBulkPaid = metadata?.bulk_allocation?.debts?.length > 0
    const hasRefund = txn.refund_parent_id || txn.void_parent_id

    // Flow: Account → Person/Target
    const sourceAccount = txn.source_account_id ? accounts.find(a => a.id === txn.source_account_id) : null
    const sourceImg = txn.source_image ?? sourceAccount?.image_url
    const sourceName = txn.source_name ?? sourceAccount?.name ?? "Unknown"

    const targetPerson = txn.person_id ? people.find(p => p.id === txn.person_id) : null
    const destAccount = txn.destination_account_id ? accounts.find(a => a.id === txn.destination_account_id) : null
    const targetImg = targetPerson?.image_url ?? txn.destination_image ?? destAccount?.image_url
    const targetName = targetPerson?.name ?? txn.destination_name ?? destAccount?.name ?? "Unknown"

    // Cycle and Debt badges
    const cycleTag = txn.persisted_cycle_tag
    const debtTag = txn.tag

    // Amount calculations
    const amount = Number(txn.amount) || 0
    const absAmount = Math.abs(amount)
    const isIncome = txn.type === 'income' || (amount > 0 && txn.type !== 'debt')
    const amountColor = isIncome ? "text-emerald-600" : "text-rose-600"

    // Cashback
    const percentDisp = Number(txn.cashback_share_percent ?? 0)
    const fixedDisp = Number(txn.cashback_share_fixed ?? 0)
    const hasCashback = percentDisp > 0 || fixedDisp > 0

    // Final price
    const finalPrice = txn.final_price !== null && txn.final_price !== undefined
        ? Math.abs(Number(txn.final_price))
        : absAmount
    const showNetSettlement = hasCashback && Math.abs(finalPrice - absAmount) > 1

    return (
        <tr className={cn(
            "group border-b border-slate-100 transition-colors h-[64px]",
            isSelected && "bg-indigo-50/30",
            isVoid && "opacity-50 grayscale",
            !isVoid && "hover:bg-slate-50/50"
        )}>
            {/* 1. TIMELINE (80px) */}
            <td className="px-3 py-2 w-[80px]">
                <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-xs font-black text-slate-800 leading-none">{month}</span>
                        <span className="text-lg font-black text-slate-800 leading-none">{day}</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 mt-0.5">{time}</span>
                </div>
            </td>

            {/* 2. NOTES / BADGES (200px) */}
            <td className="px-3 py-2 w-[200px]">
                <div className="flex items-center gap-2">
                    {/* Shop Icon */}
                    {shopImg && (
                        <div className="h-10 w-10 shrink-0 bg-white">
                            <img
                                src={shopImg}
                                alt={shopName}
                                className="h-full w-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        {/* Note */}
                        {txn.note && (
                            <p className="text-xs text-slate-700 truncate font-medium">{txn.note}</p>
                        )}

                        {/* Badges Row */}
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {/* Copy Badge */}
                            <CustomTooltip content="Copy ID">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCopy(); }}
                                    className="inline-flex items-center h-4 px-1 rounded text-[9px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                                >
                                    <Copy className="w-2.5 h-2.5" />
                                </button>
                            </CustomTooltip>

                            {/* Split Badge */}
                            {hasSplit && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                                    SPLIT
                                </Badge>
                            )}

                            {/* Bulk Paid Badge */}
                            {hasBulkPaid && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-0.5">
                                    <Users className="w-2.5 h-2.5" />
                                    PAID
                                </Badge>
                            )}

                            {/* Refund Badge */}
                            {hasRefund && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                                    REFUND
                                </Badge>
                            )}

                            {/* Installment Badge */}
                            {txn.is_installment && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-0.5">
                                    <CreditCard className="w-2.5 h-2.5" />
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </td>

            {/* 3. FLOW (Account → Person) (250px) */}
            <td className="px-3 py-2 w-[250px]">
                <div className="flex items-center gap-2">
                    {/* Source Account */}
                    <div className="flex items-center gap-1.5">
                        {sourceImg && (
                            <div className="h-8 w-8 shrink-0 bg-white">
                                <img
                                    src={sourceImg}
                                    alt={sourceName}
                                    className="h-full w-full object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                            </div>
                        )}
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[70px]">{sourceName}</span>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />

                    {/* Target */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[70px]">{targetName}</span>
                        {targetImg && (
                            <div className={cn(
                                "h-8 w-8 shrink-0 bg-white",
                                targetPerson && "rounded-full overflow-hidden"
                            )}>
                                <img
                                    src={targetImg}
                                    alt={targetName}
                                    className="h-full w-full object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Cycle/Debt Badges */}
                    <div className="flex items-center gap-1 ml-auto">
                        {cycleTag && (
                            <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-purple-50 text-purple-700 border-purple-200">
                                {cycleTag}
                            </Badge>
                        )}
                        {debtTag && debtTag !== cycleTag && (
                            <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-teal-50 text-teal-700 border-teal-200">
                                {debtTag}
                            </Badge>
                        )}
                    </div>
                </div>
            </td>

            {/* 4. BASE AMOUNT (120px) */}
            <td className="px-3 py-2 w-[120px] text-right">
                <div className="flex flex-col items-end">
                    <span className={cn("text-base font-black tabular-nums", amountColor)}>
                        {numberFormatter.format(absAmount)}
                    </span>

                    {/* Cashback Badges */}
                    {hasCashback && (
                        <div className="flex items-center gap-1 mt-0.5">
                            {percentDisp > 0 && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-red-50 text-red-700 border-red-200">
                                    -{percentDisp > 1 ? percentDisp : percentDisp * 100}%
                                </Badge>
                            )}
                            {fixedDisp > 0 && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-red-50 text-red-700 border-red-200">
                                    -{numberFormatter.format(fixedDisp)}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </td>

            {/* 5. NET SETTLEMENT (120px) */}
            <td className="px-3 py-2 w-[120px] text-right">
                {showNetSettlement ? (
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-indigo-600 tabular-nums">
                                {numberFormatter.format(finalPrice)}
                            </span>
                            <CustomTooltip content={
                                <div className="text-xs space-y-1">
                                    <div className="font-semibold border-b border-slate-200 pb-1">Price Breakdown</div>
                                    <div className="flex justify-between gap-3">
                                        <span>Base:</span>
                                        <span className="font-mono">{numberFormatter.format(absAmount)}</span>
                                    </div>
                                    {percentDisp > 0 && (
                                        <div className="flex justify-between gap-3 text-emerald-600">
                                            <span>Discount ({percentDisp > 1 ? percentDisp : percentDisp * 100}%):</span>
                                            <span className="font-mono">-{numberFormatter.format(absAmount * (percentDisp > 1 ? percentDisp / 100 : percentDisp))}</span>
                                        </div>
                                    )}
                                    {fixedDisp > 0 && (
                                        <div className="flex justify-between gap-3 text-emerald-600">
                                            <span>Fixed:</span>
                                            <span className="font-mono">-{numberFormatter.format(fixedDisp)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between gap-3 font-bold border-t border-slate-200 pt-1">
                                        <span>Final:</span>
                                        <span className="font-mono">{numberFormatter.format(finalPrice)}</span>
                                    </div>
                                </div>
                            }>
                                <Info className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                            </CustomTooltip>
                        </div>
                        <span className="text-[9px] font-bold uppercase text-indigo-400 tracking-wider">NET</span>
                    </div>
                ) : (
                    <span className="text-slate-300">—</span>
                )}
            </td>

            {/* 6. ACTIONS (80px) */}
            <td className="px-3 py-2 w-[80px]">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CustomTooltip content="Edit">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                    </CustomTooltip>
                    <CustomTooltip content="Copy ID">
                        <button
                            onClick={(e) => { e.stopPropagation(); onCopy(); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    </CustomTooltip>
                    <CustomTooltip content="More">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </CustomTooltip>
                </div>
            </td>
        </tr>
    )
}
