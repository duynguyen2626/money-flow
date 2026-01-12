
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { MoreHorizontal, Edit, Copy, RotateCcw, Trash2, History } from 'lucide-react'
import { useState } from 'react'
import { TransactionHistoryModal } from '@/components/moneyflow/transaction-history-modal'

interface TransactionActionsCellProps {
    transaction: TransactionWithDetails
    className?: string
    onEdit?: (t: TransactionWithDetails) => void
    onRefund?: (t: TransactionWithDetails) => void
    onVoid?: (t: TransactionWithDetails) => void
}

export function TransactionActionsCell({
    transaction,
    className,
    onEdit,
    onRefund,
    onVoid
}: TransactionActionsCellProps) {
    const [open, setOpen] = useState(false)

    const [showHistory, setShowHistory] = useState(false)

    const handleAction = (action: () => void) => {
        action()
        setOpen(false)
    }

    return (
        <div className={cn("flex items-center justify-end gap-1", className)}>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowHistory(true)}
                title="View History"
            >
                <History className="h-4 w-4" />
                <span className="sr-only">History</span>
            </Button>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-1">
                    <div className="flex flex-col space-y-1">
                        <Button variant="ghost" size="sm" className="justify-start h-8 px-2 font-normal" onClick={() => handleAction(() => navigator.clipboard.writeText(transaction.id))}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy ID
                        </Button>
                        <div className="h-px bg-muted my-1" />
                        <Button variant="ghost" size="sm" className="justify-start h-8 px-2 font-normal" onClick={() => handleAction(() => onEdit?.(transaction))}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Transaction
                        </Button>
                        <Button variant="ghost" size="sm" className="justify-start h-8 px-2 font-normal" onClick={() => handleAction(() => onRefund?.(transaction))}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Refund / Void
                        </Button>
                        {transaction.status !== 'void' && (
                            <Button variant="ghost" size="sm" className="justify-start h-8 px-2 font-normal text-destructive hover:text-destructive" onClick={() => handleAction(() => onVoid?.(transaction))}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Quick Void
                            </Button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            <TransactionHistoryModal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                transactionId={transaction.id}
                transactionNote={transaction.note}
            />
        </div>
    )
}
