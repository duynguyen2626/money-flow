"use client"

import { useMemo, useState } from "react"
import { Ban, Loader2, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Account, Category, Person, Shop, TransactionWithDetails } from "@/types/moneyflow.types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionForm, TransactionFormValues } from "./transaction-form"
import {
    restoreTransaction,
    voidTransaction,
    requestRefund,
    confirmRefund,
} from "@/services/transaction.service"
import { REFUND_PENDING_ACCOUNT_ID } from "@/constants/refunds"
import { generateTag } from "@/lib/tag"
import { ConvertInstallmentDialog } from "@/components/installments/convert-installment-dialog"
import { TransactionRowCard } from "./v2/TransactionRowCard"

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

function buildEditInitialValues(txn: TransactionWithDetails): Partial<TransactionFormValues> {
    const baseAmount =
        typeof txn.original_amount === "number" ? txn.original_amount : txn.amount ?? 0;
    const percentValue =
        typeof txn.cashback_share_percent === "number" ? txn.cashback_share_percent : undefined;

    let derivedType: TransactionFormValues["type"] = (txn.type as any) === 'repayment' ? 'repayment' : txn.type as TransactionFormValues["type"] || "expense";

    if (txn.person_id) {
        if (txn.category_name?.toLowerCase().includes('repayment')) {
            derivedType = 'repayment';
        } else {
            derivedType = 'debt';
        }
    }

    const destinationAccountId =
        derivedType === "transfer" || derivedType === "debt" || derivedType === "repayment"
            ? txn.target_account_id ?? undefined
            : undefined;

    return {
        occurred_at: txn.occurred_at ? new Date(txn.occurred_at) : new Date(),
        type: derivedType,
        amount: Math.abs(baseAmount ?? 0),
        note: txn.note ?? "",
        tag: txn.tag ?? generateTag(new Date()),
        source_account_id: txn.account_id ?? undefined,
        category_id: txn.category_id ?? undefined,
        person_id: txn.person_id ?? undefined,
        debt_account_id: destinationAccountId,
        shop_id: txn.shop_id ?? undefined,
        cashback_share_percent:
            percentValue !== undefined && percentValue !== null ? percentValue : undefined,
        cashback_share_fixed:
            typeof txn.cashback_share_fixed === "number" ? txn.cashback_share_fixed : undefined,
        cashback_mode: (percentValue !== undefined && percentValue !== null && percentValue > 0) ? 'real_percent' :
            (typeof txn.cashback_share_fixed === "number" && txn.cashback_share_fixed > 0) ? 'real_fixed' : 'none_back',
    };
}

interface TransactionTableProps {
    transactions: TransactionWithDetails[]
    accountType?: Account['type']
    selectedTxnIds?: Set<string>
    onSelectionChange?: (selectedIds: Set<string>) => void
    accounts?: Account[]
    categories?: Category[]
    people?: Person[]
    shops?: Shop[]
    contextAccountId?: string | null
    contextPersonId?: string | null
}

export function TransactionTable({
    transactions,
    accountType,
    selectedTxnIds,
    onSelectionChange,
    accounts = [],
    categories = [],
    people = [],
    shops = [],
    contextAccountId,
    contextPersonId,
}: TransactionTableProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'active' | 'void'>('active')
    const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
    const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null)
    const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
    const [isVoiding, setIsVoiding] = useState(false)
    const [isRestoring, setIsRestoring] = useState(false)
    const [voidError, setVoidError] = useState<string | null>(null)
    const [statusOverrides, setStatusOverrides] = useState<Record<string, TransactionWithDetails['status']>>({})
    const [refundDialogTxn, setRefundDialogTxn] = useState<TransactionWithDetails | null>(null)
    const [refundAmount, setRefundAmount] = useState(0)
    const [refundInstant, setRefundInstant] = useState(false)
    const [refundError, setRefundError] = useState<string | null>(null)
    const [refundTargetAccountId, setRefundTargetAccountId] = useState<string | null>(null)
    const [isRefunding, setIsRefunding] = useState(false)
    const [refundDialogMode, setRefundDialogMode] = useState<'request' | 'confirm'>('request')
    const [convertDialogTxn, setConvertDialogTxn] = useState<TransactionWithDetails | null>(null)

    const editingInitialValues = useMemo(
        () => (editingTxn ? buildEditInitialValues(editingTxn) : null),
        [editingTxn]
    )

    const refundAccountOptions = useMemo(
        () => accounts.filter(acc => acc.id !== REFUND_PENDING_ACCOUNT_ID),
        [accounts]
    )

    const selection = selectedTxnIds ?? internalSelection

    const updateSelection = (next: Set<string>) => {
        if (onSelectionChange) {
            onSelectionChange(next)
            return
        }
        setInternalSelection(next)
    }

    const closeVoidDialog = () => {
        setConfirmVoidTarget(null)
        setVoidError(null)
        setIsVoiding(false)
    }

    const handleRestore = (txn: TransactionWithDetails) => {
        setIsRestoring(true)
        void restoreTransaction(txn.id)
            .then(ok => {
                if (!ok) {
                    setVoidError('Unable to restore transaction. Please try again.')
                    return
                }
                setVoidError(null)
                setStatusOverrides(prev => ({ ...prev, [txn.id]: 'posted' }))
                router.refresh()
            })
            .catch(err => {
                console.error('Failed to restore transaction:', err)
                setVoidError('Unable to restore transaction. Please try again.')
            })
            .finally(() => setIsRestoring(false))
    }

    const closeRefundDialog = () => {
        setRefundDialogTxn(null)
        setRefundError(null)
        setIsRefunding(false)
        setRefundInstant(false)
        setRefundAmount(0)
        setRefundTargetAccountId(null)
        setRefundDialogMode('request')
    }

    const openRefundDialog = (txn: TransactionWithDetails) => {
        const baseAmount = Math.abs(txn.original_amount ?? txn.amount ?? 0)
        const defaultAccountId = txn.account_id ?? refundAccountOptions[0]?.id ?? null

        setRefundAmount(baseAmount)
        setRefundInstant(false)
        setRefundTargetAccountId(defaultAccountId)
        setRefundError(null)
        setRefundDialogMode('request')
        setRefundDialogTxn(txn)
    }

    const openConfirmRefundDialog = (txn: TransactionWithDetails) => {
        const amount = Math.abs(txn.amount ?? 0)
        const defaultAccountId = refundAccountOptions[0]?.id ?? null

        setRefundAmount(amount)
        setRefundInstant(false)
        setRefundTargetAccountId(defaultAccountId)
        setRefundError(null)
        setRefundDialogMode('confirm')
        setRefundDialogTxn(txn)
    }

    const handleRefundSubmit = async () => {
        if (!refundDialogTxn) return
        setRefundError(null)
        setIsRefunding(true)
        try {
            if (refundDialogMode === 'confirm') {
                if (!refundTargetAccountId) {
                    setRefundError('Please select a target account.')
                    return
                }

                const confirmResult = await confirmRefund(refundDialogTxn.id, refundTargetAccountId)
                if (!confirmResult.success) {
                    setRefundError(confirmResult.error ?? 'Could not confirm refund.')
                    return
                }

                closeRefundDialog()
                router.refresh()
                return
            }

            const amountBase = Math.abs(refundDialogTxn.original_amount ?? refundDialogTxn.amount ?? 0)
            const requestedAmount = Math.max(Number(refundAmount) || 0, 0)
            const amountToUse = Math.min(requestedAmount || amountBase, amountBase)
            if (amountToUse <= 0) {
                setRefundError('Please enter an amount greater than 0.')
                return
            }

            const isPartial = amountToUse < amountBase
            const requestResult = await requestRefund(refundDialogTxn.id, amountToUse, isPartial)
            if (!requestResult.success) {
                setRefundError(requestResult.error ?? 'Unable to create refund request.')
                return
            }

            if (refundInstant) {
                if (!refundTargetAccountId) {
                    setRefundError('Please select the receiving account.')
                    return
                }

                const confirmResult = await confirmRefund(
                    requestResult.refundTransactionId ?? '',
                    refundTargetAccountId
                )
                if (!confirmResult.success) {
                    setRefundError(confirmResult.error ?? 'Could not confirm refund.')
                    return
                }
            }

            closeRefundDialog()
            router.refresh()
        } finally {
            setIsRefunding(false)
        }
    }

    const handleVoidConfirm = () => {
        if (!confirmVoidTarget) return
        setVoidError(null)
        setIsVoiding(true)
        void voidTransaction(confirmVoidTarget.id)
            .then(ok => {
                if (!ok) {
                    setVoidError('Unable to void transaction. Please try again.')
                    return
                }
                setStatusOverrides(prev => ({ ...prev, [confirmVoidTarget.id]: 'void' }))
                closeVoidDialog()
                router.refresh()
            })
            .catch(err => {
                setVoidError('Unable to void transaction. Please try again.')
            })
            .finally(() => setIsVoiding(false))
    }

    const handleBulkVoid = async () => {
        if (selection.size === 0) return;
        if (!confirm('Are you sure you want to void ' + selection.size + ' transactions?')) return;

        setIsVoiding(true);
        let errorCount = 0;
        for (const id of Array.from(selection)) {
            try {
                const ok = await voidTransaction(id);
                if (ok) {
                    setStatusOverrides(prev => ({ ...prev, [id]: 'void' }));
                } else {
                    errorCount++;
                }
            } catch (e) {
                errorCount++;
            }
        }
        setIsVoiding(false);
        updateSelection(new Set()); // Clear selection
        router.refresh();
        if (errorCount > 0) {
            alert(`Failed to void ${errorCount} transactions.`);
        }
    }

    const handleBulkRestore = async () => {
        if (selection.size === 0) return;
        if (!confirm('Are you sure you want to restore ' + selection.size + ' transactions?')) return;

        setIsRestoring(true);
        let errorCount = 0;
        for (const id of Array.from(selection)) {
            const ok = await restoreTransaction(id);
            if (ok) {
                setStatusOverrides(prev => ({ ...prev, [id]: 'posted' }));
            } else {
                errorCount++;
            }
        }
        setIsRestoring(false);
        updateSelection(new Set()); // Clear selection
        router.refresh();
        if (errorCount > 0) {
            alert(`Failed to restore ${errorCount} transactions.`);
        }
    }

    const handleEditSuccess = () => {
        setEditingTxn(null)
        router.refresh()
    }

    const displayedTransactions = useMemo(() => {
        let list = transactions;
        if (activeTab === 'active') {
            list = transactions.filter(t => (statusOverrides[t.id] ?? t.status) !== 'void');
        } else {
            list = transactions.filter(t => (statusOverrides[t.id] ?? t.status) === 'void');
        }
        return list
    }, [transactions, activeTab, statusOverrides])

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            updateSelection(new Set(displayedTransactions.map(txn => txn.id)))
        } else {
            updateSelection(new Set())
        }
    }

    const handleSelectOne = (txnId: string, checked: boolean) => {
        const newSet = new Set(selection)
        if (checked) {
            newSet.add(txnId)
        } else {
            newSet.delete(txnId)
        }
        updateSelection(newSet)
    }

    const summary = useMemo(() => {
        const selectedTxns = transactions.filter(txn => selection.has(txn.id))
        const initialSummary = {
            sumBack: 0,
            sumAmount: 0,
            sumFinalPrice: 0,
        };

        const incomeSummary = { ...initialSummary };
        const expenseSummary = { ...initialSummary };

        for (const txn of selectedTxns) {
            const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount;
            const percentValue = typeof txn.cashback_share_percent === 'number' ? txn.cashback_share_percent : null;
            const fixedValue = typeof txn.cashback_share_fixed === 'number' ? txn.cashback_share_fixed : 0;
            const derivedSumBack = Math.abs(originalAmount ?? 0) * (percentValue ?? 0) + fixedValue;
            const cashbackAmount = typeof txn.cashback_share_amount === 'number' && txn.cashback_share_amount > 0 ? txn.cashback_share_amount : derivedSumBack;
            const finalPrice = Math.abs(txn.amount ?? 0);

            const targetSummary = txn.type === 'income' ? incomeSummary : expenseSummary;
            targetSummary.sumBack += cashbackAmount;
            targetSummary.sumAmount += Math.abs(originalAmount);
            targetSummary.sumFinalPrice += finalPrice;
        }

        return { incomeSummary, expenseSummary }
    }, [selection, transactions])


    if (transactions.length === 0 && activeTab === 'active') {
        return (
            <div className="text-center py-10 text-gray-400">
                <p>No transactions yet.</p>
                <p className="text-sm mt-2">Add your first transaction to get started.</p>
            </div>
        );
    }

    const isAllSelected = displayedTransactions.length > 0 && selection.size >= displayedTransactions.length

    return (
        <div className="relative space-y-4">
            {/* Header with Tabs and Bulk Actions */}
            <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'active' | 'void')}>
                    <TabsList>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="void">Void</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                    {selection.size > 0 && (
                        activeTab === 'active' ? (
                            <button
                                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-70"
                                onClick={handleBulkVoid}
                                disabled={isVoiding}
                            >
                                {isVoiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                                Void Selected ({selection.size})
                            </button>
                        ) : (
                            <button
                                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-70"
                                onClick={handleBulkRestore}
                                disabled={isRestoring}
                            >
                                {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                Restore Selected ({selection.size})
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Select All Checkbox */}
            {displayedTransactions.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-md border border-slate-200">
                    <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={isAllSelected}
                        onChange={e => handleSelectAll(e.target.checked)}
                    />
                    <span className="text-sm text-slate-600">
                        {isAllSelected ? `All ${displayedTransactions.length} transactions selected` : 'Select all'}
                    </span>
                </div>
            )}

            {/* Transaction Cards */}
            <div className="space-y-2">
                {displayedTransactions.map(txn => {
                    const effectiveStatus = statusOverrides[txn.id] ?? txn.status
                    const isVoided = effectiveStatus === 'void'
                    const isSelected = selection.has(txn.id)

                    return (
                        <TransactionRowCard
                            key={txn.id}
                            transaction={txn}
                            isSelected={isSelected}
                            isVoided={isVoided}
                            onSelect={(checked) => handleSelectOne(txn.id, checked)}
                            onEdit={() => setEditingTxn(txn)}
                            onVoid={() => {
                                setConfirmVoidTarget(txn)
                                setVoidError(null)
                            }}
                            onRestore={() => handleRestore(txn)}
                            onRefund={() => openRefundDialog(txn)}
                            onConfirmRefund={() => openConfirmRefundDialog(txn)}
                            onConvertToInstallment={() => setConvertDialogTxn(txn)}
                            accounts={accounts}
                            people={people}
                            shops={shops}
                            contextAccountId={contextAccountId}
                            contextPersonId={contextPersonId}
                        />
                    )
                })}
            </div>

            {/* Summary Footer */}
            {selection.size > 0 && (
                <div className="mt-4 space-y-2">
                    {summary.incomeSummary.sumAmount > 0 && (
                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-md border border-emerald-200">
                            <span className="font-semibold text-emerald-700">Total Income</span>
                            <div className="flex items-center gap-4 text-emerald-700">
                                <span>Cashback: {numberFormatter.format(summary.incomeSummary.sumBack)}</span>
                                <span>Amount: {numberFormatter.format(summary.incomeSummary.sumAmount)}</span>
                                <span className="font-semibold">Final: {numberFormatter.format(summary.incomeSummary.sumFinalPrice)}</span>
                            </div>
                        </div>
                    )}
                    {summary.expenseSummary.sumAmount > 0 && (
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-md border border-red-200">
                            <span className="font-semibold text-red-500">Total Expense</span>
                            <div className="flex items-center gap-4 text-red-500">
                                <span>Cashback: {numberFormatter.format(summary.expenseSummary.sumBack)}</span>
                                <span>Amount: {numberFormatter.format(summary.expenseSummary.sumAmount)}</span>
                                <span className="font-semibold">Final: {numberFormatter.format(summary.expenseSummary.sumFinalPrice)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Dialog */}
            {editingTxn && editingInitialValues && createPortal(
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-10"
                    onClick={() => setEditingTxn(null)}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-200"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Edit Transaction</h3>
                            <button
                                className="rounded px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                                onClick={() => setEditingTxn(null)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <TransactionForm
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            transactionId={editingTxn.id}
                            initialValues={editingInitialValues}
                            mode="edit"
                            onSuccess={handleEditSuccess}
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* Void Confirmation Dialog */}
            {confirmVoidTarget && createPortal(
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
                    onClick={closeVoidDialog}
                >
                    <div
                        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
                        onClick={event => event.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-slate-900">Void transaction?</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            This action will mark the transaction as void and adjust the balances accordingly.
                        </p>
                        {voidError && (
                            <p className="mt-2 text-sm text-red-600">{voidError}</p>
                        )}
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                className="rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                                onClick={closeVoidDialog}
                                disabled={isVoiding}
                            >
                                Keep
                            </button>
                            <button
                                className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                                onClick={handleVoidConfirm}
                                disabled={isVoiding}
                            >
                                {isVoiding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Void Transaction
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Refund Dialog */}
            {refundDialogTxn && createPortal(
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
                    onClick={closeRefundDialog}
                >
                    <div
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {refundDialogMode === 'confirm' ? 'Confirm Refund' : 'Request Refund'}
                            </h3>
                            <button
                                className="text-slate-500 transition hover:text-slate-700"
                                onClick={closeRefundDialog}
                            >
                                ×
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            {refundDialogTxn.note ?? 'No note available'}
                        </p>
                        <div className="space-y-4">
                            {refundDialogMode === 'request' ? (
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Refund amount (VND)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={refundAmount}
                                        onChange={event => setRefundAmount(Math.max(Number(event.target.value) || 0, 0))}
                                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Amount to confirm</p>
                                    <p className="text-lg font-semibold text-slate-900">
                                        {numberFormatter.format(
                                            Math.abs(
                                                Math.abs(refundDialogTxn.amount ?? 0)
                                            )
                                        )}
                                    </p>
                                </div>
                            )}
                            {refundDialogMode === 'request' && (
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={refundInstant}
                                        onChange={event => setRefundInstant(event.target.checked)}
                                    />
                                    <span>Money already returned?</span>
                                </label>
                            )}
                            {(refundDialogMode === 'confirm' || (refundDialogMode === 'request' && refundInstant)) && (
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Receiving account</label>
                                    <select
                                        value={refundTargetAccountId ?? ''}
                                        onChange={event => setRefundTargetAccountId(event.target.value || null)}
                                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="">Choose account</option>
                                        {refundAccountOptions.map(account => (
                                            <option key={account.id} value={account.id}>
                                                {account.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {refundError && (
                                <p className="text-sm text-red-600">{refundError}</p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={closeRefundDialog}
                                disabled={isRefunding}
                            >
                                Cancel
                            </button>
                            <button
                                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                                onClick={handleRefundSubmit}
                                disabled={isRefunding}
                            >
                                {isRefunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {refundDialogMode === 'confirm'
                                    ? 'Confirm Refund'
                                    : refundInstant
                                        ? 'Confirm & Refund'
                                        : 'Create Request'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Convert to Installment Dialog */}
            {convertDialogTxn && (
                <ConvertInstallmentDialog
                    open={!!convertDialogTxn}
                    onOpenChange={(open) => !open && setConvertDialogTxn(null)}
                    transaction={convertDialogTxn}
                />
            )}
        </div>
    )
}
