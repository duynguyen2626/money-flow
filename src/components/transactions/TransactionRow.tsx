
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { TransactionTimelineCell } from './TransactionTimelineCell'
import { TransactionDetailsCell } from './TransactionDetailsCell'
import { TransactionFlowCell } from './TransactionFlowCell'
import { TransactionBaseAmountCell } from './TransactionBaseAmountCell'
import { TransactionFinalSettlementCell } from './TransactionFinalSettlementCell'
import { TransactionActionsCell } from './TransactionActionsCell'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Edit2, Copy, CopyPlus, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TransactionRowProps {
    transaction: TransactionWithDetails
    isSelected?: boolean
    onSelect?: (id: string) => void
    onEdit?: (t: TransactionWithDetails) => void
    onRefund?: (t: TransactionWithDetails) => void
    onVoid?: (t: TransactionWithDetails) => void
    onDuplicate?: (t: TransactionWithDetails) => void
}

export function TransactionRow({
    transaction,
    isSelected,
    onSelect,
    onEdit,
    onRefund,
    onVoid,
    onDuplicate
}: TransactionRowProps) {

    const handleCopy = () => {
        navigator.clipboard.writeText(transaction.id)
        toast.success(`Copied ID: #${transaction.id.slice(0, 8)}`)
    }

    return (
        <div className={cn(
            "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 border rounded-lg bg-card hover:shadow-sm transition-all group",
            isSelected && "border-primary bg-primary/5"
        )}>

            {/* DESKTOP CONTENT (md+) - FIXED GRID LAYOUT */}
            <div className="hidden md:grid grid-cols-[40px_80px_280px_480px_180px_200px_120px] gap-4 items-center min-w-[1380px]">

                {/* 1. Checkbox */}
                <div className="flex justify-center">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelect?.(transaction.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                </div>

                {/* 2. Date */}
                <div>
                    <TransactionTimelineCell occurredAt={transaction.occurred_at} />
                </div>

                {/* 3. Details (280px) */}
                <div className="w-full overflow-hidden">
                    <TransactionDetailsCell transaction={transaction} className="w-full" />
                </div>

                {/* 4. Flow (480px) */}
                <div className="w-full overflow-hidden">
                    <TransactionFlowCell transaction={transaction} />
                </div>

                {/* 5. Base Amount (180px) */}
                <div className="w-full flex justify-end">
                    <TransactionBaseAmountCell transaction={transaction} />
                </div>

                {/* 6. Net Amount (200px) */}
                <div className="w-full flex justify-end">
                    <TransactionFinalSettlementCell transaction={transaction} />
                </div>

                {/* 7. Actions (120px) */}
                <div className="flex items-center justify-end gap-1 w-full">
                    {/* Edit */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0" onClick={() => onEdit?.(transaction)} title="Edit">
                        <Edit2 className="h-4 w-4" />
                    </Button>

                    {/* Clone / Duplicate */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0" onClick={() => onDuplicate?.(transaction)} title="Clone Transaction">
                        <CopyPlus className="h-4 w-4" />
                    </Button>

                    {/* More Menu */}
                    <TransactionActionsCell
                        transaction={transaction}
                        onEdit={onEdit}
                        onRefund={onRefund}
                        onVoid={onVoid}
                    />
                </div>
            </div>

            {/* MOBILE/TABLET LAYOUT (< md) */}
            <div className="md:hidden flex flex-col p-4 gap-3 border-t md:border-t-0 mt-2 md:mt-0 pt-2 md:pt-0">
                {/* Top Row: Timeline + Actions */}
                <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                        <TransactionTimelineCell occurredAt={transaction.occurred_at} className="items-start text-left min-w-[50px]" />
                        <TransactionDetailsCell transaction={transaction} className="flex-1" />
                    </div>
                    <TransactionActionsCell
                        transaction={transaction}
                        onEdit={onEdit}
                        onRefund={onRefund}
                        onVoid={onVoid}
                        className="-mt-1 -mr-2"
                    />
                </div>

                {/* Middle Row: Flow */}
                <div className="pl-[62px]">
                    <TransactionFlowCell transaction={transaction} />
                </div>

                {/* Bottom Row: Amounts */}
                <div className="flex justify-between items-end pl-[62px] border-t pt-2 mt-1 border-border/40">
                    <TransactionBaseAmountCell transaction={transaction} className="items-start" />
                    <TransactionFinalSettlementCell transaction={transaction} />
                </div>
            </div>

        </div>
    )
}
