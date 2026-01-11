'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { TransactionForm, TransactionFormValues } from './transaction-form'
import { TransactionDateCell, TransactionDetailsCell, AccountPersonFlow, PerformanceBaseAmount, FinalSettlement, TransactionActions } from './v2'
import { voidTransactionAction } from '@/actions/transaction-actions'
import { restoreTransaction } from '@/services/transaction.service'
import { buildEditInitialValues, parseMetadata } from '@/lib/transaction-mapper'
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds'
import { cn } from '@/lib/utils'

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
    // Additional props for compatibility
    data?: TransactionWithDetails[]
    accountId?: string
    contextId?: string
}

export function TransactionTable({
    transactions: propTransactions,
    data,
    accountType,
    selectedTxnIds,
    onSelectionChange,
    accounts = [],
    categories = [],
    people = [],
    shops = [],
    contextAccountId,
    contextPersonId,
    contextId,
}: TransactionTableProps) {
    const transactions = data ?? propTransactions
    const router = useRouter()

    const [activeTab, setActiveTab] = useState<'active' | 'void'>('active')
    const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())
    const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null)
    const [confirmVoidTarget, setConfirmVoidTarget] = useState<TransactionWithDetails | null>(null)
    const [isVoiding, setIsVoiding] = useState(false)
    const [isRestoring, setIsRestoring] = useState(false)
    const [voidError, setVoidError] = useState<string | null>(null)
    const [statusOverrides, setStatusOverrides] = useState<Record<string, TransactionWithDetails['status']>>({})

    const selection = selectedTxnIds ?? internalSelection

    const updateSelection = (next: Set<string>) => {
        if (onSelectionChange) {
            onSelectionChange(next)
            return
        }
        setInternalSelection(next)
    }

    const editingInitialValues = useMemo(
        () => (editingTxn ? buildEditInitialValues(editingTxn) : null),
        [editingTxn]
    )

    const refundAccountOptions = useMemo(
        () => accounts.filter(acc => acc.id !== REFUND_PENDING_ACCOUNT_ID),
        [accounts]
    )

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

    const handleVoidConfirm = () => {
        if (!confirmVoidTarget) return
        setVoidError(null)
        setIsVoiding(true)
        void voidTransactionAction(confirmVoidTarget.id)
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
                setVoidError(err.message || 'Unable to void transaction. Please try again.')
            })
            .finally(() => setIsVoiding(false))
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const next = new Set(selection)
        if (checked) {
            next.add(id)
        } else {
            next.delete(id)
        }
        updateSelection(next)
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            updateSelection(new Set(displayedTransactions.map(t => t.id)))
        } else {
            updateSelection(new Set())
        }
    }

    const displayedTransactions = useMemo(() => {
        return transactions.filter(txn => {
            const effectiveStatus = statusOverrides[txn.id] ?? txn.status
            if (activeTab === 'void') {
                return effectiveStatus === 'void'
            }
            return effectiveStatus !== 'void'
        })
    }, [transactions, activeTab, statusOverrides])

    const isAllSelected = displayedTransactions.length > 0 && selection.size >= displayedTransactions.length

    return (
        <div className="flex flex-col h-full w-full">
            {/* Table Container with Scroll */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    {/* Header */}
                    <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left w-12">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                />
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-sm text-slate-700 w-32">
                                Timeline
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-sm text-slate-700">
                                Transaction Details
                            </th>
                            <th className="px-4 py-3 text-center font-semibold text-sm text-slate-700 w-72">
                                Flow
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-sm text-slate-700 w-36">
                                Base Amount
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-sm text-slate-700 w-36">
                                Final
                            </th>
                            <th className="px-4 py-3 text-center font-semibold text-sm text-slate-700 w-32">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    {/* Body */}
                    <tbody>
                        {displayedTransactions.map(txn => {
                            const isSelected = selection.has(txn.id)
                            const effectiveStatus = statusOverrides[txn.id] ?? txn.status
                            const isVoided = effectiveStatus === 'void'
                            const metadata = parseMetadata(txn.metadata)
                            const refundStatus = metadata?.refund_status as string | undefined

                            // Calculate amounts
                            const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount ?? 0
                            const percentValue = typeof txn.cashback_share_percent === 'number' ? txn.cashback_share_percent : 0
                            const fixedValue = typeof txn.cashback_share_fixed === 'number' ? txn.cashback_share_fixed : 0
                            const finalPrice = Math.abs(txn.amount ?? 0)

                            // Determine type
                            const txnType = (txn.type || 'expense') as 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'

                            return (
                                <tr
                                    key={txn.id}
                                    className={cn(
                                        'border-b border-slate-200 hover:bg-slate-50 transition-colors',
                                        isSelected && 'bg-blue-50',
                                        isVoided && 'opacity-60'
                                    )}
                                >
                                    {/* Checkbox */}
                                    <td className="px-4 py-3">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelectOne(txn.id, checked as boolean)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>

                                    {/* Timeline (Date) */}
                                    <td className="px-4 py-3">
                                        <TransactionDateCell date={txn.occurred_at} />
                                    </td>

                                    {/* Transaction Details */}
                                    <td className="px-4 py-3">
                                        <TransactionDetailsCell
                                            note={txn.note}
                                            shopName={txn.shop_name}
                                            shopImageUrl={txn.shop_image_url}
                                            categoryName={txn.category_name}
                                            transactionId={txn.id}
                                            tag={txn.tag}
                                            date={txn.occurred_at}
                                            isInstallment={txn.is_installment}
                                            refundStatus={refundStatus}
                                        />
                                    </td>

                                    {/* Flow */}
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center">
                                            <AccountPersonFlow
                                                accountName={txn.account_name}
                                                accountImageUrl={null}
                                                personName={(txn as any).person_name}
                                                personImageUrl={null}
                                                type={txnType}
                                                contextAccountId={contextAccountId || contextId}
                                                contextPersonId={contextPersonId || contextId}
                                                transactionAccountId={txn.account_id}
                                                transactionPersonId={txn.person_id}
                                                cycleTag={txn.tag}
                                            />
                                        </div>
                                    </td>

                                    {/* Performance-Base Amount */}
                                    <td className="px-4 py-3">
                                        <PerformanceBaseAmount
                                            amount={originalAmount}
                                            cashbackPercent={percentValue}
                                            cashbackFixed={fixedValue}
                                            type={txnType}
                                        />
                                    </td>

                                    {/* Final Settlement */}
                                    <td className="px-4 py-3">
                                        <FinalSettlement
                                            finalPrice={finalPrice}
                                            type={txnType}
                                            baseAmount={originalAmount}
                                            cashbackPercent={percentValue}
                                            cashbackFixed={fixedValue}
                                        />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center">
                                            <TransactionActions
                                                isVoided={isVoided}
                                                canRequestRefund={txn.type === 'expense'}
                                                isPendingRefund={refundStatus === 'requested'}
                                                onEdit={() => setEditingTxn(txn)}
                                                onClone={() => {
                                                    // TODO: Implement clone
                                                    toast.info('Clone feature coming soon')
                                                }}
                                                onVoid={() => {
                                                    setConfirmVoidTarget(txn)
                                                    setVoidError(null)
                                                }}
                                                onRestore={() => handleRestore(txn)}
                                                onHistory={() => {
                                                    // TODO: Implement history
                                                    toast.info('History feature coming soon')
                                                }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Edit Dialog */}
            {editingTxn && editingInitialValues && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
                        <TransactionForm
                            initialValues={editingInitialValues}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            onSuccess={() => {
                                setEditingTxn(null)
                                router.refresh()
                            }}
                            onCancel={() => setEditingTxn(null)}
                        />
                    </div>
                </div>
            )}

            {/* Void Confirmation Dialog */}
            {confirmVoidTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Void Transaction?</h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Are you sure you want to void this transaction? This action can be reversed later.
                        </p>
                        {voidError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                {voidError}
                            </div>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={closeVoidDialog}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded"
                                disabled={isVoiding}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVoidConfirm}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                                disabled={isVoiding}
                            >
                                {isVoiding ? 'Voiding...' : 'Void Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
