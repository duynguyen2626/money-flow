'use client'

import { useState } from "react"
import { Installment, settleEarly } from "@/services/installment.service"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface InstallmentDetailsDialogProps {
    installment: Installment
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function InstallmentDetailsDialog({
    installment,
    trigger,
    open,
    onOpenChange
}: InstallmentDetailsDialogProps) {
    const [isSettling, setIsSettling] = useState(false)
    const router = useRouter()

    const handleSettle = async () => {
        try {
            setIsSettling(true)
            await settleEarly(installment.id)
            toast.success("Installment settled successfully")
            onOpenChange?.(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to settle installment")
        } finally {
            setIsSettling(false)
        }
    }

    const progress = ((installment.total_amount - installment.remaining_amount) / installment.total_amount) * 100

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{installment.name}</DialogTitle>
                    <DialogDescription>
                        Plan Details
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <Badge variant={installment.status === 'active' ? 'default' : 'secondary'}>
                                {installment.status}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Account</p>
                            <p className="text-sm font-medium">
                                {installment.original_transaction?.transaction_lines?.find((l: any) => l.type === 'credit')?.account?.name || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                            <p className="text-sm font-medium">{formatCurrency(installment.total_amount)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Monthly Payment</p>
                            <p className="text-sm font-medium">{formatCurrency(installment.monthly_amount)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                            <p className="text-sm font-medium">{formatCurrency(installment.remaining_amount)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Progress</p>
                            <p className="text-sm font-medium">{Math.round(progress)}%</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                            <p className="text-sm font-medium">{format(new Date(installment.start_date), 'dd/MM/yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Next Due</p>
                            <p className="text-sm font-medium">
                                {installment.next_due_date ? format(new Date(installment.next_due_date), 'dd/MM/yyyy') : '-'}
                            </p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    {installment.status === 'active' && (
                        <Button
                            variant="destructive"
                            onClick={handleSettle}
                            disabled={isSettling}
                        >
                            {isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Settle Early (Tất toán)
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
