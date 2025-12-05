'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createManualInstallment, convertTransactionToInstallment } from "@/services/installment.service"
import { toast } from "sonner"

interface CreateInstallmentDialogProps {
    initialData?: {
        name?: string
        totalAmount?: number
        transactionId?: string
    }
    trigger?: React.ReactNode
}

export function CreateInstallmentDialog({ initialData, trigger }: CreateInstallmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        totalAmount: initialData?.totalAmount?.toString() || "",
        term: "3",
        fee: "0",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (initialData?.transactionId) {
                await convertTransactionToInstallment({
                    transactionId: initialData.transactionId,
                    term: Number(formData.term),
                    fee: Number(formData.fee),
                    type: 'credit_card',
                    name: formData.name
                })
            } else {
                await createManualInstallment({
                    name: formData.name,
                    totalAmount: Number(formData.totalAmount),
                    term: Number(formData.term),
                    fee: Number(formData.fee),
                    type: 'credit_card',
                })
            }

            toast.success("Installment plan created successfully")
            setOpen(false)
            setFormData({ name: "", totalAmount: "", term: "3", fee: "0" })
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to create installment plan")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Manual Plan
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Manual Installment Plan</DialogTitle>
                    <DialogDescription>
                        {initialData?.transactionId
                            ? "Setup an installment plan for this transaction."
                            : "Create a new installment plan manually without linking to an existing transaction."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Total Amount
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={formData.totalAmount}
                            onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                            className="col-span-3"
                            required
                            min="0"
                            disabled={!!initialData?.transactionId}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="term" className="text-right">
                            Term (Months)
                        </Label>
                        <Input
                            id="term"
                            type="number"
                            value={formData.term}
                            onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                            className="col-span-3"
                            required
                            min="1"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fee" className="text-right">
                            Fee
                        </Label>
                        <Input
                            id="fee"
                            type="number"
                            value={formData.fee}
                            onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                            className="col-span-3"
                            min="0"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : (initialData?.transactionId ? "Setup Plan" : "Create Plan")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
