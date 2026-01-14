'use client'

import { useState, useRef } from 'react'
import { Account, Category, Person, PersonCycleSheet, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { FileSpreadsheet, UserMinus, Plus, Link as LinkIcon, Pencil, Copy, ExternalLink, ClipboardPaste, Eye, ChevronDown } from 'lucide-react'
import { UnifiedTransactionTable } from './unified-transaction-table'
import { AddTransactionDialog } from './add-transaction-dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import { cn } from '@/lib/utils'
import { isYYYYMM } from '@/lib/month-tag'
import { toast } from 'sonner' // or assume available context
import { RolloverDebtDialog } from '@/components/people/rollover-debt-dialog'

interface DebtCycleGroupProps {
    tag: string
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
    sheetProfileId: string
    scriptLink?: string | null
    googleSheetUrl?: string | null
    sheetFullImg?: string | null
    showBankAccount?: boolean
    showQrImage?: boolean
    cycleSheet: PersonCycleSheet | null
    isExpanded: boolean
    onToggleExpand: () => void
    serverStatus?: any // From Debt Service
}

export function DebtCycleGroup({
    tag,
    transactions,
    accounts,
    categories,
    people,
    shops,
    personId,
    sheetProfileId,
    scriptLink,
    googleSheetUrl,
    sheetFullImg,
    showBankAccount,
    showQrImage,
    cycleSheet,
    isExpanded,
    onToggleExpand,
    serverStatus,
}: DebtCycleGroupProps) {
    // Local filter state for this card
    const [localFilter, setLocalFilter] = useState<'all' | 'lend' | 'repay'>('all')
    const containerRef = useRef<HTMLDivElement>(null)
    const [editingRepaymentId, setEditingRepaymentId] = useState<string | null>(null)

    // Calculate detailed stats for this cycle (Client-side Aggregation)
    const stats = transactions.reduce(
        (acc, txn) => {
            const amount = Math.abs(Number(txn.amount) || 0)
            const type = txn.type

            // Only count "Outbound" debts for the main Loan stats
            const isOutboundDebt = (type === 'debt' && (Number(txn.amount) || 0) < 0) || (type === 'expense' && !!txn.person_id)

            if (isOutboundDebt) {
                acc.initial += amount
                const effectiveFinal = txn.final_price !== null && txn.final_price !== undefined ? Math.abs(Number(txn.final_price)) : amount
                acc.lend += effectiveFinal
            }

            // Repay: Sum of Repayments (or positive debts/incomes from person)
            if (type === 'repayment') {
                acc.repay += amount
            } else if (type === 'debt' && (Number(txn.amount) || 0) > 0) {
                acc.repay += amount
            } else if (type === 'income' && !!txn.person_id) {
                acc.repay += amount
            }

            return acc
        },
        { initial: 0, lend: 0, repay: 0 }
    )

    // Back = Initial - Lend
    const back = stats.initial - stats.lend

    // Remains: Lend - Repay (User Req: "Remains cũng phải là tính theo Final Price")
    // If serverStatus is available, use it as the source of truth (FIFO logical remains)
    const remains = serverStatus && typeof serverStatus.remainingPrincipal === 'number'
        ? serverStatus.remainingPrincipal
        : stats.lend - stats.repay

    // Small tolerance for float math
    const isSettled = serverStatus ? serverStatus.status === 'settled' : Math.abs(remains) < 100
    const statusColor = isSettled ? 'text-emerald-600' : 'text-amber-600'
    const statusBadge = isSettled
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-amber-200 bg-amber-50 text-amber-700'

    // Bulk Paid Link Logic
    const linkedRepayments = serverStatus?.links || []

    // Helper to copy
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Copied to clipboard")
    }

    const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

    const filteredTxns = transactions.filter(txn => {
        if (localFilter === 'all') return true
        const type = txn.type
        const amount = Number(txn.amount) || 0
        const isDebt = type === 'debt'

        if (localFilter === 'lend') {
            return (isDebt && amount < 0) || (type === 'expense' && !!txn.person_id)
        }
        if (localFilter === 'repay') {
            return (isDebt && amount > 0) || type === 'repayment' || (type === 'income' && !!txn.person_id)
        }
        return true
    })

    const displayTag = tag || 'Untagged'
    const canManageSheet = isYYYYMM(tag)

    return (
        <div className="relative min-h-[400px]">

            {/* Header: Cycle Info & Stats */}
            <div className="bg-white p-4 border-b flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
                            {tag && isYYYYMM(tag) ? (
                                <>
                                    {new Date(parseInt(tag.split('-')[0]), parseInt(tag.split('-')[1]) - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                                </>
                            ) : tag}
                        </h2>
                        {/* Primary Badge */}
                        <div className={cn("px-3 py-1 rounded-md text-sm font-bold tabular-nums flex items-center gap-2", isSettled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                            <span>{isSettled ? "SETTLED" : "REMAINS:"}</span>
                            <span>{formatter.format(remains)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Manage Sheet & Settled Status */}
                        <div className="flex items-center gap-2">
                            <ManageSheetButton
                                personId={personId}
                                cycleTag={tag}
                                scriptLink={scriptLink}
                                googleSheetUrl={googleSheetUrl}
                                sheetFullImg={sheetFullImg}
                                showBankAccount={showBankAccount}
                                showQrImage={showQrImage}
                                iconOnly={true}
                                size={'sm'}
                                className="h-8 w-8"
                                showCycleAction={true}
                            />
                            {/* Rollover Button */}
                            {!isSettled && remains > 1000 && (
                                <RolloverDebtDialog
                                    personId={personId}
                                    currentCycle={tag}
                                    remains={remains}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Sub-Metrics Bar */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                    {/* Original Lend */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-blue-100 bg-blue-50 text-blue-700" title="Tổng tiền gốc (đã bao gồm cashback)">
                        <span className="font-semibold opacity-70">ORIGINAL LEND:</span>
                        <span className="font-bold tabular-nums">{formatter.format(stats.initial)}</span>
                    </div>

                    {/* Cashback */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-amber-100 bg-amber-50 text-amber-700" title="Tổng cashback đã trừ">
                        <span className="font-semibold opacity-70">CASHBACK:</span>
                        <span className="font-bold tabular-nums">{formatter.format(back)}</span>
                    </div>

                    {/* Net Lend */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-indigo-100 bg-indigo-50 text-indigo-700" title="NET LEND = Original - Cashback">
                        <span className="font-semibold opacity-70">NET LEND:</span>
                        <span className="font-bold tabular-nums">{formatter.format(stats.lend)}</span>
                    </div>

                    {/* Repay */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-emerald-100 bg-emerald-50 text-emerald-700" title="Tổng đã trả">
                        <span className="font-semibold opacity-70">REPAY:</span>
                        <span className="font-bold tabular-nums">{formatter.format(stats.repay)}</span>
                    </div>

                    {/* Remains Formula Hint */}
                    {!isSettled && (
                        <div className="ml-auto text-[10px] text-slate-400 italic hidden md:block">
                            * Remains = (Original - Cashback) - Repay
                        </div>
                    )}
                </div>
            </div>

            {/* Content: Only the Table or Empty State */}
            <div className="w-full bg-background">
                {filteredTxns.length > 0 ? (
                    <UnifiedTransactionTable
                        transactions={filteredTxns}
                        accountType="debt"
                        accountId={personId}
                        contextId={personId}
                        context="person"
                        isExcelMode={false}
                        accounts={accounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                        hiddenColumns={['people']}

                    />
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="w-16 h-16 mb-4 opacity-50">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium">There was nothing to show</p>
                    </div>
                )}
            </div>


            {/* Edit Transaction Modal */}
            {editingRepaymentId && (
                <AddTransactionDialog
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    buttonText=""
                    defaultType="repayment"
                    defaultPersonId={personId}
                    transactionId={editingRepaymentId}
                    isOpen={true}
                    onOpenChange={(open) => !open && setEditingRepaymentId(null)}
                    buttonClassName="hidden"
                />
            )}
        </div>
    )
}
