import type { ReactNode } from "react"
import { Category, TransactionWithDetails } from "@/types/moneyflow.types"
import { ArrowRight, Copy, Wrench, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, History, RefreshCcw } from "lucide-react"
import { CycleBadge } from "@/components/transactions-v2/badge/CycleBadge"
import { cn } from "@/lib/utils"

interface MobileTransactionsSimpleListProps {
    transactions: TransactionWithDetails[]
    categories: Category[]
    selectedTxnIds: Set<string>
    onSelectTxn: (id: string, selected: boolean) => void
    onRowClick?: (txn: TransactionWithDetails) => void
    onCopyId?: (id: string) => void
    renderActions?: (txn: TransactionWithDetails) => ReactNode
    formatters: {
        currency: (val: number) => string
        date: (date: string | number | Date) => string
    }
    accounts?: any[] // Optional, to pass to CycleBadge if needed, but we can pass minimal info
}

export function MobileTransactionsSimpleList({
    transactions,
    categories,
    selectedTxnIds,
    onSelectTxn,
    onRowClick,
    onCopyId,
    renderActions,
    formatters,
    accounts = [],
}: MobileTransactionsSimpleListProps) {
    if (!transactions.length) {
        return (
            <div className="p-4 text-center text-slate-500 text-sm">
                No transactions found
            </div>
        )
    }

    // Note: Parent container handles scrolling (flex-1 overflow-y-auto on mobile)
    return (
        <div className="block md:hidden pb-24">
            <div className="space-y-2 p-3">
                {transactions.map((txn) => {
                    const isSelected = selectedTxnIds.has(txn.id)

                    // Line 1: Date & Note
                    // Date: dd-mm format
                    const dateValue = txn.occurred_at || txn.created_at
                    const date = dateValue ? new Date(dateValue) : new Date()
                    const dateStr = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`

                    const noteText = txn.note || txn.shop_name || 'No note'
                    // Shop Image logic: Square (rounded-none) and Contain (not cropped)
                    const shopImage = txn.shop_image_url || txn.source_image
                    const isShop = !!txn.shop_image_url

                    // Line 2: Flow (Left) - Amount (Right)
                    const showFlow = txn.type === 'transfer' || txn.type === 'debt' || txn.type === 'repayment'
                    const sourceImage = txn.source_image || txn.shop_image_url
                    const targetImage = (txn as any).person_image_url || (txn as any).destination_image_url

                    // Value
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

                    // Type Badge Construction
                    const badgeBaseClass = "inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold border"
                    let typeBadge = null;
                    const tType = txn.type;
                    if (tType === 'expense') {
                        typeBadge = <span className={cn(badgeBaseClass, "bg-red-50 text-red-600 border-red-200")}>OUT</span>
                    } else if (tType === 'income') {
                        typeBadge = <span className={cn(badgeBaseClass, "bg-emerald-50 text-emerald-600 border-emerald-200")}>IN</span>
                    } else if (tType === 'transfer') {
                        typeBadge = <span className={cn(badgeBaseClass, "bg-blue-50 text-blue-600 border-blue-200")}>TF</span>
                    } else if (tType === 'debt' || tType === 'loan') {
                        typeBadge = <span className={cn(badgeBaseClass, "bg-amber-50 text-amber-600 border-amber-200")}>DEBT</span>
                    } else if (tType === 'repayment') {
                        typeBadge = <span className={cn(badgeBaseClass, "bg-purple-50 text-purple-600 border-purple-200")}>REPAY</span>
                    }

                    // Line 3: Badges (Cycle, Tag) & Category
                    // Category
                    const actualCategory = categories.find(c => c.id === txn.category_id);
                    const categoryName = actualCategory?.name || txn.category_name || 'Uncategorized'
                    const categoryImage = actualCategory?.image_url

                    // Badges
                    const cycleTag = (txn as any).persisted_cycle_tag || txn.tag
                    const tag = (txn as any).tag // e.g. debt tag

                    // Cycle Logic using Refund Account (Source)
                    const refundAccount = accounts.find(a => a.id === txn.account_id) // rough guess

                    return (
                        <div
                            key={txn.id}
                            className={`border border-slate-200 rounded-lg p-3 bg-white ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                                }`}
                            onClick={() => onRowClick && onRowClick(txn)}
                        >
                            <div className="flex flex-col gap-2">
                                {/* Line 1: Checkbox - Date - Note */}
                                <div className="flex items-center gap-2">
                                    {renderActions ? (
                                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                            {renderActions(txn)}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onSelectTxn(txn.id, !isSelected)
                                            }}
                                            title="Quick actions"
                                        >
                                            <Wrench className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    <span className="text-xs text-slate-500 whitespace-nowrap">{dateStr}</span>

                                    {/* Note with Shop Image if available */}
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        {shopImage && !showFlow && (
                                            <img
                                                src={shopImage}
                                                alt=""
                                                className={`h-5 w-5 object-contain flex-shrink-0 ${isShop ? 'rounded-none' : 'rounded-full'}`}
                                            />
                                        )}
                                        <span className="text-sm font-medium text-slate-900 truncate">
                                            {noteText}
                                        </span>
                                    </div>

                                    {/* Type Badge on Top Right */}
                                    <div className="shrink-0">{typeBadge}</div>
                                </div>

                                {/* Line 2: Flow (Left) - Amount (Right) */}
                                <div className="flex items-center justify-between gap-4">
                                    {/* Left: Flow */}
                                    <div className="flex items-center gap-1 min-w-0">
                                        {showFlow ? (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                {/* Source */}
                                                <div className="flex items-center gap-1">
                                                    {sourceImage ? (
                                                        <img
                                                            src={sourceImage}
                                                            alt=""
                                                            className="h-6 w-6 rounded-none object-contain"
                                                        />
                                                    ) : <span className="text-[10px] italic text-slate-400">Src</span>}
                                                </div>

                                                <ArrowRight className="h-3 w-3 text-slate-400" />

                                                {/* Target */}
                                                <div className="flex items-center gap-1">
                                                    {targetImage ? (
                                                        <img
                                                            src={targetImage}
                                                            alt=""
                                                            className="h-6 w-6 rounded-none object-contain"
                                                        />
                                                    ) : <span className="text-[10px] italic text-slate-400">Dst</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            // Ensure height consistency
                                            <div className="h-6" />
                                        )}
                                    </div>

                                    {/* Right: Copy Icon + Amount */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCopyId?.(txn.id);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 p-0.5 active:bg-slate-100 rounded"
                                            title="Copy ID"
                                        >
                                            <Copy className="h-3 w-3" />
                                        </button>
                                        <div className={`text-sm font-bold ${amountColor}`}>
                                            {amountStr}
                                        </div>
                                    </div>
                                </div>

                                {/* Line 3: Badges (Left) - Category (Right) */}
                                <div className="flex items-center justify-between gap-2 mt-1 min-h-[24px]">
                                    {/* Left: Badges (Cycle, Tag) */}
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <CycleBadge
                                            account={refundAccount}
                                            cycleTag={cycleTag}
                                            txnDate={dateValue}
                                            mini={true} // Use mini version for mobile if supported, else default
                                        />
                                        {tag && tag !== cycleTag && (
                                            <span className="inline-flex items-center rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 ring-1 ring-inset ring-teal-700/10 whitespace-nowrap">
                                                {tag}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: Category (Image + Name) */}
                                    <div className="flex items-center gap-1.5 max-w-[150px] justify-end">
                                        {categoryImage && (
                                            <img src={categoryImage} alt="" className="h-5 w-5 object-contain" />
                                        )}
                                        <div className="text-xs text-slate-500 font-medium truncate">
                                            {categoryName}
                                        </div>
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
