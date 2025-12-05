'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { convertTransactionToInstallment } from "@/services/installment.service"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ConvertInstallmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction: any
}

export function ConvertInstallmentDialog({ open, onOpenChange, transaction }: ConvertInstallmentDialogProps) {
    const [term, setTerm] = useState(3)
    const [fee, setFee] = useState(0)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleConvert = async () => {
        if (!transaction) return

        setLoading(true)
        try {
            await convertTransactionToInstallment({
                transactionId: transaction.id,
                term: Number(term),
                fee: Number(fee),
                type: 'credit_card', // Defaulting to credit card for now as per requirement context
                name: transaction.note || 'Installment Plan'
            })
            toast.success("Transaction converted to installment plan")
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to convert transaction")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Convert to Installment</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="term" className="text-right">
                            Term (Months)
                        </Label>
                        <Input
                            id="term"
                            type="number"
                            value={term}
                            onChange={(e) => setTerm(Number(e.target.value))}
                            className="col-span-3"
                            min={1}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fee" className="text-right">
                            Conversion Fee
                        </Label>
                        <Input
                            id="fee"
                            type="number"
                            value={fee}
                            onChange={(e) => setFee(Number(e.target.value))}
                            className="col-span-3"
                            min={0}
                        />
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                        Original Amount: {transaction?.amount?.toLocaleString()}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleConvert} disabled={loading}>
                        {loading ? "Converting..." : "Convert"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
