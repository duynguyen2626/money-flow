'use client'

import { useState, useRef } from 'react'
import { Account, Category, Person, PersonCycleSheet, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { FileSpreadsheet, PlusCircle, Link as LinkIcon, Pencil, Copy, ExternalLink, ClipboardPaste, Eye, ChevronDown } from 'lucide-react'
import { UnifiedTransactionTable } from './unified-transaction-table'
import { AddTransactionDialog } from './add-transaction-dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import { cn } from '@/lib/utils'
import { isYYYYMM } from '@/lib/month-tag'
import { toast } from 'sonner' // or assume available context

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
    const [isExcelMode, setIsExcelMode] = useState(false)
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
        <div ref={containerRef} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200">
            {/* Header - Single Row Layout */}
            <div
                className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border-b border-slate-200"
            >
                {/* Left Group: Title + Badge + Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Title & Badge */}
                    <div className="flex items-center gap-2 text-slate-900">
                        <span className="text-base font-semibold md:text-lg">{displayTag}</span>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusBadge)}>
                            {isSettled ? 'Settled' : 'Active'}
                        </span>
                    </div>

                    {/* Filters & Summary (Inline) */}
                    <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className={cn(
                                "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                                localFilter === 'lend'
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            )}
                            onClick={() => setLocalFilter(localFilter === 'lend' ? 'all' : 'lend')}
                        >
                            Lend: {formatter.format(stats.lend)}
                        </button>
                        <button
                            type="button"
                            className={cn(
                                "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                                localFilter === 'repay'
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            )}
                            onClick={() => setLocalFilter(localFilter === 'repay' ? 'all' : 'repay')}
                        >
                            Repay: {formatter.format(stats.repay)}
                        </button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Financial Summary
                                    <ChevronDown className="h-3 w-3" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Initial</span>
                                        <span className="font-semibold">{formatter.format(stats.initial)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Lend</span>
                                        <span className="font-semibold">{formatter.format(stats.lend)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Back</span>
                                        <span className="font-semibold">{formatter.format(back)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Repay</span>
                                        <span className="font-semibold">{formatter.format(stats.repay)}</span>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Bulk Paid Badge (User Request: "Back of Financial Summary") */}
                        {linkedRepayments.length > 0 && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        +{linkedRepayments.length} Paid
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-0 rounded-lg overflow-hidden border-slate-200 shadow-xl" align="start">
                                    <div className="bg-indigo-50 px-3 py-2 border-b border-indigo-100 flex justify-between items-center">
                                        <div className="text-xs font-bold text-indigo-900">Linked Repayments</div>
                                        <button
                                            type="button"
                                            className="p-1 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer group"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const firstLink = linkedRepayments[0];
                                                if (firstLink) {
                                                    console.log("Clicked Header Eye, opening repayment:", firstLink.repaymentId);
                                                    setEditingRepaymentId(firstLink.repaymentId);
                                                }
                                            }}
                                            title="View Original Transaction"
                                        >
                                            <Eye className="h-3.5 w-3.5 text-indigo-400 group-hover:text-indigo-600" />
                                        </button>
                                    </div>
                                    <div className="flex flex-col max-h-[200px] overflow-y-auto p-1">
                                        {linkedRepayments.map((l: any, i: number) => (
                                            <button
                                                key={i}
                                                type="button"
                                                className="w-full flex justify-between items-center text-xs hover:bg-slate-100 p-2 rounded transition-colors group cursor-pointer text-left"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Stop default button behavior/bubbling
                                                    console.log("Clicked repayment:", l.repaymentId);
                                                    setEditingRepaymentId(l.repaymentId);
                                                }}
                                                title="Click to Edit Parent Transaction"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-slate-500 text-[10px]">...{l.repaymentId.slice(-4)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-slate-700">{formatter.format(l.amount)}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                </div>

                {/* Right Group: Remains + Actions */}
                <div className="flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col items-end mr-1">
                        <span className="text-[10px] uppercase text-slate-500 font-bold">Remains</span>
                        <span className={cn("text-lg font-bold tabular-nums md:text-xl md:min-w-[4rem] text-right", statusColor)}>
                            {formatter.format(Math.max(0, remains))}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <AddTransactionDialog
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            buttonText=""
                            defaultType="debt"
                            defaultPersonId={personId}
                            defaultTag={canManageSheet ? tag : undefined}
                            buttonClassName=""
                            asChild
                            triggerContent={
                                <Button variant="default" size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700">
                                    Quick Debt
                                </Button>
                            }
                        />
                        <AddTransactionDialog
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            buttonText=""
                            defaultType="repayment"
                            defaultPersonId={personId}
                            defaultTag={canManageSheet ? tag : undefined}
                            buttonClassName=""
                            asChild
                            triggerContent={
                                <Button variant="default" size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Repay
                                </Button>
                            }
                        />
                        <ManageSheetButton
                            personId={sheetProfileId}
                            cycleTag={tag}
                            initialSheetUrl={cycleSheet?.sheet_url ?? null}
                            scriptLink={scriptLink ?? null}
                            googleSheetUrl={googleSheetUrl ?? null}
                            sheetFullImg={sheetFullImg}
                            showBankAccount={showBankAccount}
                            showQrImage={showQrImage}
                            connectHref={`/people/${sheetProfileId}?tab=sheet`}
                            size="sm"
                            disabled={!canManageSheet}
                            linkedLabel="Manage Sheet"
                            unlinkedLabel="Manage Sheet"
                            showViewLink={false}
                        />
                        {isExpanded && (
                            <Button
                                variant={isExcelMode ? "secondary" : "outline"}
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExcelMode(!isExcelMode);
                                }}
                                className={cn(
                                    "h-8 text-xs border-slate-200",
                                    isExcelMode && "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:text-green-800"
                                )}
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                                Excel Mode
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="relative w-full border-t bg-background overflow-y-auto max-h-[60vh]">
                    <UnifiedTransactionTable
                        transactions={filteredTxns}
                        accountType="debt"
                        accountId={personId}
                        contextId={personId}
                        context="person"
                        isExcelMode={isExcelMode}
                        accounts={accounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                    />
                </div>
            )}

            {/* Edit Transaction Modal */}
            {editingRepaymentId && (
                <AddTransactionDialog
                    key={editingRepaymentId}
                    isOpen={!!editingRepaymentId}
                    onOpenChange={(open) => !open && setEditingRepaymentId(null)}
                    transactionId={editingRepaymentId}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    mode="edit"
                    triggerContent={<span className="hidden"></span>}
                />
            )}
        </div>
    )
}
