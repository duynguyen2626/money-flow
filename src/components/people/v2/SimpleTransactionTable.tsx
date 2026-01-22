'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { TransactionWithDetails, Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
import { buildEditInitialValues } from '@/lib/transaction-mapper'

interface SimpleTransactionTableProps {
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    searchTerm?: string
    context?: 'account' | 'person' | 'general'
    contextId?: string
}

/**
 * Simple transaction table without the header toolbar
 * Used in V2 Member Details page where the header is custom
 */
export function SimpleTransactionTable({
    transactions,
    accounts,
    categories,
    people,
    shops,
    searchTerm = '',
    context,
    contextId,
}: SimpleTransactionTableProps) {
    const router = useRouter()

    // Apply search filter
    const filteredTransactions = searchTerm
        ? transactions.filter(txn => {
            const lowerTerm = searchTerm.toLowerCase()
            return (
                txn.note?.toLowerCase().includes(lowerTerm) ||
                txn.id?.toLowerCase().includes(lowerTerm) ||
                txn.category_name?.toLowerCase().includes(lowerTerm) ||
                txn.shop_name?.toLowerCase().includes(lowerTerm) ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (txn as any).person_name?.toLowerCase().includes(lowerTerm)
            )
        })
        : transactions

    // State for Slide V2 handling
    const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null)
    const [cloningTxn, setCloningTxn] = useState<TransactionWithDetails | null>(null)

    // Calculate initial values for form
    const formInitialValues = React.useMemo(() => {
        if (editingTxn) return buildEditInitialValues(editingTxn)
        if (cloningTxn) return buildEditInitialValues(cloningTxn)
        return undefined
    }, [editingTxn, cloningTxn])

    const isSheetOpen = !!editingTxn || !!cloningTxn
    const closeSheet = () => {
        setEditingTxn(null)
        setCloningTxn(null)
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200">
            <UnifiedTransactionTable
                transactions={filteredTransactions}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                context={context}
                contextId={contextId}
                hiddenColumns={['id', 'tag']}
                onEdit={setEditingTxn}
                onDuplicate={setCloningTxn}
            />

            {isSheetOpen && (
                <TransactionSlideV2
                    open={isSheetOpen}
                    onOpenChange={(open) => !open && closeSheet()}
                    mode="single"
                    editingId={editingTxn?.id}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialData={formInitialValues as any}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    onSuccess={() => {
                        closeSheet()
                        router.refresh()
                    }}
                />
            )}
        </div>
    )
}
