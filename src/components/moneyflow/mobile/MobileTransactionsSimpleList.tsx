import { Category, TransactionWithDetails } from "@/types/moneyflow.types"
import { ArrowRight } from "lucide-react"

interface MobileTransactionsSimpleListProps {
    transactions: TransactionWithDetails[]
    categories: Category[]
    selectedTxnIds: Set<string>
    onSelectTxn: (id: string, selected: boolean) => void
    onRowClick?: (txn: TransactionWithDetails) => void
    formatters: {
        currency: (val: number) => string
        date: (date: string | number | Date) => string
    }
}

export function MobileTransactionsSimpleList({
    transactions,
    categories,
    selectedTxnIds,
    onSelectTxn,
    onRowClick,
    formatters,
}: MobileTransactionsSimpleListProps) {
    if (!transactions.length) {
        return (
            <div className="p-4 text-center text-slate-500 text-sm">
                No transactions found
            </div>
        )
    }

    return (
        <div className="block md:hidden flex-1 overflow-y-auto h-full bg-slate-50/50 pb-20">
            <div className="space-y-2 p-3">
                {transactions.map((txn) => {
                    const isSelected = selectedTxnIds.has(txn.id)

                    // Date: dd-mm format only
                    const dateValue = txn.occurred_at || txn.created_at
                    const date = dateValue ? new Date(dateValue) : new Date()
                    const dateStr = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`

                    // Note: shop image + note text
                    const shopImage = txn.shop_image_url || txn.source_image
                    const noteText = txn.note || txn.shop_name || 'No note'

                    // Flow & Entity: source -> target
                    const sourceImage = txn.source_image || txn.shop_image_url
                    const targetImage = (txn as any).person_avatar_url || (txn as any).destination_image_url
                    const showFlow = txn.type === 'transfer' || txn.type === 'debt' || txn.type === 'repayment'

                    // Value: raw amount only
                    const rawAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount ?? 0
                    const absAmount = Math.abs(rawAmount)
                    const amountStr = formatters.currency(absAmount)

                    // Determine amount color
                    const visualType = (txn as any).displayType ?? txn.type
                    const isRepayment = txn.type === 'repayment'
                    const amountColor =
                        visualType === 'income' || isRepayment
                            ? 'text-emerald-700'
                            : visualType === 'expense'
                                ? 'text-red-500'
                                : 'text-slate-600'

                    // Category: plain text only
                    const categoryName = categories.find(cat => cat.id === txn.category_id)?.name || txn.category_name || 'Uncategorized'

                    return (
                        <div
                            key={txn.id}
                            className={`border border-slate-200 rounded-lg p-3 bg-white ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                                }`}
                            onClick={() => onRowClick && onRowClick(txn)}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    className="mt-1 rounded border-slate-300 h-4 w-4"
                                    checked={isSelected}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => onSelectTxn(txn.id, e.target.checked)}
                                />

                                {/* Middle: Date + Note + Flow */}
                                <div className="flex-1 min-w-0">
                                    {/* Date */}
                                    <div className="text-xs text-slate-500 mb-1">{dateStr}</div>

                                    {/* Note with shop image */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {shopImage && (
                                            <img
                                                src={shopImage}
                                                alt=""
                                                className="h-6 w-6 object-contain flex-shrink-0"
                                            />
                                        )}
                                        <div className="text-sm font-medium text-slate-900 truncate">
                                            {noteText}
                                        </div>
                                    </div>

                                    {/* Flow & Entity - Simple arrow display */}
                                    {showFlow && (
                                        <div className="flex items-center gap-1 text-xs text-slate-600">
                                            {sourceImage && (
                                                <img
                                                    src={sourceImage}
                                                    alt=""
                                                    className="h-4 w-4 rounded-full object-cover"
                                                />
                                            )}
                                            {targetImage && (
                                                <>
                                                    <ArrowRight className="h-3 w-3 text-slate-400" />
                                                    <img
                                                        src={targetImage}
                                                        alt=""
                                                        className="h-4 w-4 rounded-full object-cover"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Value and Category */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    {/* Value */}
                                    <div className={`text-sm font-semibold ${amountColor}`}>
                                        {amountStr}
                                    </div>

                                    {/* Category */}
                                    <div className="text-xs text-slate-500">
                                        {categoryName}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
