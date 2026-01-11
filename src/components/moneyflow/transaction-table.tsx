'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { TransactionForm } from './transaction-form'
import { TransactionCard } from './v2/TransactionCard'
import { voidTransactionAction } from '@/actions/transaction-actions'
import { restoreTransaction } from '@/services/transaction.service'
import { buildEditInitialValues } from '@/lib/transaction-mapper'
import { cn } from '@/lib/utils'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'

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

    const updateSelection = (newSelection: Set<string>) => {
        if (onSelectionChange) {
            onSelectionChange(newSelection)
        } else {
            setInternalSelection(newSelection)
        }
    }

    const handleRestore = (txn: TransactionWithDetails) => {
        setIsRestoring(true)
        restoreTransaction(txn.id)
            .then(result => {
                if (result) {
                    toast.success('Transaction restored successfully')
                    setStatusOverrides(prev => ({ ...prev, [txn.id]: 'completed' }))
                    router.refresh()
                } else {
                    toast.error('Failed to restore transaction')
                }
            })
            .catch(err => {
                toast.error('An error occurred while restoring')
                console.error(err)
            })
            .finally(() => setIsRestoring(false))
    }

    const handleVoidConfirm = () => {
        if (!confirmVoidTarget) return
        setVoidError(null)
        setIsVoiding(true)
        voidTransactionAction(confirmVoidTarget.id)
            .then(ok => {
                if (!ok) {
                    setVoidError('Unable to void transaction. Please try again.')
                    return
                }
                setStatusOverrides(prev => ({ ...prev, [confirmVoidTarget.id]: 'void' }))
                setConfirmVoidTarget(null)
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

    const handleClone = (txn: TransactionWithDetails) => {
        // Clone transaction by opening edit form with pre-filled data but NO ID
        // The TransactionForm/mapper needs to handle empty ID as "Create"
        const clonedTxn = { ...txn, id: '' } as TransactionWithDetails
        setEditingTxn(clonedTxn)
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
        <div className="flex flex-col h-full w-full gap-4 p-4">
            {/* Sticky Header with integrated Tabs */}
            <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 pb-3 pt-2 -mx-4 px-4 shadow-sm">
                <div className="grid grid-cols-[40px_80px_minmax(200px,1fr)_minmax(300px,400px)_140px_140px_100px] gap-4 items-center px-4">
                    {/* Checkbox Header */}
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                        />
                    </div>

                    {/* Timeline Header */}
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Timeline
                    </div>

                    {/* Details Header */}
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Transaction Details
                    </div>

                    {/* Flow Header */}
                    <div className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Flow
                    </div>

                    {/* Base Amount Header */}
                    <div className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Base Amount
                    </div>

                    {/* Final Header */}
                    <div className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Final
                    </div>

                    {/* Actions Header with Mini Tabs */}
                    <div className="flex justify-center">
                        <div className="bg-slate-200 rounded p-0.5 flex gap-0.5">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={cn(
                                    "px-2 py-0.5 text-[10px] font-medium rounded transition-all",
                                    activeTab === 'active' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setActiveTab('void')}
                                className={cn(
                                    "px-2 py-0.5 text-[10px] font-medium rounded transition-all",
                                    activeTab === 'void' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Void
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Cards Container */}
            <div className="flex-1 overflow-auto -mx-4 px-4 pb-20">
                <div className="flex flex-col gap-3">
                    {displayedTransactions.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 italic">
                            No transactions found.
                        </div>
                    ) : (
                        displayedTransactions.map(txn => {
                            const effectiveStatus = statusOverrides[txn.id] ?? txn.status
                            const isVoided = effectiveStatus === 'void'
                            return (
                                <TransactionCard
                                    key={txn.id}
                                    transaction={txn}
                                    isSelected={selection.has(txn.id)}
                                    isVoided={isVoided}
                                    onSelect={(checked) => handleSelectOne(txn.id, checked)}
                                    onEdit={() => setEditingTxn(txn)}
                                    onClone={() => handleClone(txn)}
                                    onVoid={() => setConfirmVoidTarget(txn)}
                                    onRestore={() => handleRestore(txn)}
                                    onHistory={() => toast.info("History feature coming soon")}
                                    contextAccountId={contextAccountId || contextId}
                                    contextPersonId={contextPersonId || contextId}
                                />
                            )
                        }))}
                </div>
            </div>

            {/* Edit/Clone Modal - Wrapped in Sheet for proper behavior */}
            <Sheet open={!!editingTxn} onOpenChange={(open) => {
                // Only allow closing via specific actions if needed, or default behavior
                if (!open) setEditingTxn(null)
            }}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
                    <SheetHeader className="mb-4">
                        <SheetTitle>
                            {editingTxn?.id ? 'Edit Transaction' : 'New Transaction'}
                        </SheetTitle>
                        <SheetDescription>
                            {editingTxn?.id ? 'Make changes to this transaction.' : 'Create a new transaction based on this one.'}
                        </SheetDescription>
                    </SheetHeader>
                    {editingTxn && (
                        <TransactionForm
                            initialValues={buildEditInitialValues(editingTxn)}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            // CRITICAL: Pass mode and ID to ensure correct form behavior
                            mode={editingTxn.id ? 'edit' : 'create'}
                            transactionId={editingTxn.id || undefined}
                            onSuccess={() => {
                                setEditingTxn(null)
                                router.refresh()
                            }}
                            onCancel={() => setEditingTxn(null)}
                        />
                    )}
                </SheetContent>
            </Sheet>

            {/* Void Confirmation Dialog */}
            <AlertDialog open={!!confirmVoidTarget} onOpenChange={(open) => !open && setConfirmVoidTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Void Transaction?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to void this transaction? It will be marked as void and excluded from calculations.
                            {voidError && <div className="mt-2 text-red-500 font-medium">{voidError}</div>}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isVoiding}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleVoidConfirm}
                            disabled={isVoiding}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isVoiding ? 'Voiding...' : 'Yes, Void It'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
