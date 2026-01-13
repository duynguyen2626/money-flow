import { TransactionWithDetails } from '@/types/moneyflow.types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
    ShoppingBag,
    Utensils,
    Car,
    Home,
    Zap,
    HeartPulse,
    Gamepad2,
    GraduationCap,
    Plane,
    Briefcase,
    MoreHorizontal,
    Split,
    Layers,
    RotateCcw,
    CreditCard
} from 'lucide-react'
import { toast } from 'sonner'

interface TransactionDetailsCellProps {
    transaction: TransactionWithDetails
    className?: string
}

// Map category icon (simplified for now, can be expanded)
const getCategoryIcon = (categoryName: string | undefined) => {
    if (!categoryName) return MoreHorizontal
    const lower = categoryName.toLowerCase()
    if (lower.includes('food')) return Utensils
    if (lower.includes('shopping')) return ShoppingBag
    if (lower.includes('transport')) return Car
    if (lower.includes('home') || lower.includes('rent')) return Home
    if (lower.includes('util')) return Zap
    if (lower.includes('health')) return HeartPulse
    if (lower.includes('entert')) return Gamepad2
    if (lower.includes('educ')) return GraduationCap
    if (lower.includes('travel')) return Plane
    if (lower.includes('work')) return Briefcase
    return MoreHorizontal
}

export function TransactionDetailsCell({ transaction, className }: TransactionDetailsCellProps) {
    const CategoryIcon = getCategoryIcon(transaction.category_name)

    // Extract badges from metadata
    const badges = []

    if (transaction.metadata?.is_split_transaction) {
        badges.push({ label: 'Split', icon: Split, variant: 'outline' as const })
    }
    if (transaction.metadata?.original_bulk_id) {
        badges.push({ label: 'Bulk', icon: Layers, variant: 'outline' as const })
    }
    if (transaction.metadata?.is_refunded) {
        badges.push({ label: 'Refunded', icon: RotateCcw, variant: 'destructive' as const })
    }
    if (transaction.is_installment) {
        badges.push({ label: 'Installment', icon: CreditCard, variant: 'secondary' as const })
    }

    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(transaction.id)
        toast.success(`Copied ID: #${transaction.id.slice(0, 8)}`)
    }

    return (
        <div className={cn("flex flex-col gap-1", className)}>
            {/* Row 1: Icon/Image + Note + ID */}
            <div className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5">
                    {transaction.shop_image_url ? (
                        <div className="h-10 w-10 rounded-md bg-white border flex items-center justify-center overflow-hidden">
                            <img src={transaction.shop_image_url} alt="Shop" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-start gap-1">
                        <span className="font-medium text-sm text-foreground line-clamp-2 leading-tight" title={transaction.note || ''}>
                            {transaction.note || 'No description'}
                        </span>
                        <Badge
                            variant="outline"
                            className="ml-1 h-[24px] px-2 text-xs text-muted-foreground font-mono cursor-pointer hover:bg-muted"
                            onClick={handleCopyId}
                            title="Copy Full ID"
                        >
                            #{transaction.id.slice(0, 4)}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Row 2: Category (Badge) & Status */}
            <div className="flex items-center gap-2 pl-8">
                {transaction.category_name ? (
                    <Badge variant="secondary" className="h-[24px] px-2 text-xs font-normal bg-slate-100 text-slate-700 hover:bg-slate-200">
                        {transaction.category_name}
                    </Badge>
                ) : (
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">Uncategorized</span>
                )}
            </div>

            {/* Row 3: Badges */}
            {badges.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-8 mt-0.5">
                    {badges.map((b, i) => (
                        <Badge key={i} variant={b.variant} className="h-[24px] px-2 text-xs gap-0.5 font-normal">
                            <b.icon className="h-3 w-3" />
                            {b.label}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
