'use client'

import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { TransactionWithDetails, Account, Category, Person, Shop } from '@/types/moneyflow.types'

interface SimpleTransactionTableProps {
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    searchTerm?: string
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
}: SimpleTransactionTableProps) {
    // Apply search filter
    const filteredTransactions = searchTerm
        ? transactions.filter(txn => {
            const lowerTerm = searchTerm.toLowerCase()
            return (
                txn.note?.toLowerCase().includes(lowerTerm) ||
                txn.id?.toLowerCase().includes(lowerTerm) ||
                txn.category_name?.toLowerCase().includes(lowerTerm) ||
                txn.shop_name?.toLowerCase().includes(lowerTerm) ||
                (txn as any).person_name?.toLowerCase().includes(lowerTerm)
            )
        })
        : transactions

    return (
        <div className="bg-white rounded-lg border border-slate-200">
            <UnifiedTransactionTable
                transactions={filteredTransactions}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                visibleColumns={{
                    date: true,
                    shop: false,
                    note: true,
                    category: true,
                    tag: false,
                    account: true,
                    amount: true,
                    back_info: false,
                    final_price: false,
                    id: false,
                    people: true,
                }}
            />
        </div>
    )
}
