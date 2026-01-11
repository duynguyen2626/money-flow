import { ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ShopIconCellProps {
    shopName?: string | null
    shopImageUrl?: string | null
    note?: string | null
    categoryName?: string | null
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
}

/**
 * Displays shop icon/logo with transaction name and category badges
 * Icons are square (rounded-none) per design rules
 */
export function ShopIconCell({
    shopName,
    shopImageUrl,
    note,
    categoryName,
    type,
}: ShopIconCellProps) {
    const displayName = shopName || note || 'Transaction'
    const displayCategory = categoryName || type

    return (
        <div className="flex items-center gap-3">
            {/* Shop Icon - Square with rounded-none */}
            <div className="flex-shrink-0">
                {shopImageUrl ? (
                    <img
                        src={shopImageUrl}
                        alt={shopName || 'Shop'}
                        className="h-10 w-10 rounded-none object-cover border border-slate-200"
                    />
                ) : (
                    <div className="h-10 w-10 rounded-none bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-slate-500" />
                    </div>
                )}
            </div>

            {/* Transaction Info */}
            <div className="flex flex-col gap-1 min-w-0">
                <div className="font-medium text-sm text-slate-900 truncate">
                    {displayName}
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className="text-xs font-medium rounded-sm px-2 py-0"
                    >
                        {displayCategory}
                    </Badge>
                    {note && shopName && (
                        <span className="text-xs text-slate-500 truncate max-w-[150px]">
                            {note}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
