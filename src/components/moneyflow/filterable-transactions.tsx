'use client'

import { useEffect } from 'react'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { useTagFilter } from '@/context/tag-filter-context'

export function FilterableTransactions({ 
    transactions 
}: { 
    transactions: TransactionWithDetails[] 
}) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    
    // Lấy danh sách các tag duy nhất từ giao dịch
    const allTags = Array.from(
        new Set(transactions.map(txn => txn.tag || 'UNTAGGED'))
    ).filter(tag => tag !== 'UNTAGGED')

    // Lọc giao dịch theo tag được chọn
    const filteredTransactions = selectedTag 
        ? transactions.filter(txn => txn.tag === selectedTag)
        : transactions

    const clearTagFilter = () => {
        setSelectedTag(null)
    }

    return (
        <div className="space-y-4">
            {/* Tag filter chips */}
            <div className="flex flex-wrap gap-2">
                <button
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedTag === null
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={clearTagFilter}
                >
                    Tất cả
                </button>
                
                {allTags.map(tag => (
                    <button
                        key={tag}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedTag === tag
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    >
                        {tag}
                    </button>
                ))}
                
                {selectedTag && (
                    <button
                        className="px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white"
                        onClick={clearTagFilter}
                    >
                        Bỏ lọc: {selectedTag}
                    </button>
                )}
            </div>
            
            {/* Transaction list */}
            <div>
                <RecentTransactions transactions={filteredTransactions} />
            </div>
        </div>
    )
}