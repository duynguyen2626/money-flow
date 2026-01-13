"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TransactionWithDetails } from "@/types/moneyflow.types"
import { requestRefund } from "@/actions/transaction-actions"
import { useRouter } from "next/navigation"

import { cancelOrder } from "@/actions/transaction-actions"

interface RequestRefundDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction: TransactionWithDetails
    type?: 'refund' | 'cancel'
}

const formSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    note: z.string().optional(),
})

export function RequestRefundDialog({
    open,
    onOpenChange,
    transaction,
    type = 'refund'
}: RequestRefundDialogProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const isCancel = type === 'cancel'
    const title = isCancel ? "Cancel Order" : "Request Refund"
    const description = isCancel
        ? "This will cancel the order and request a full refund."
        : "Request a refund for this transaction."

    // Form definition
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: Math.abs(transaction.amount || 0),
            note: "",
        },
    })

    // Reset form when transaction changes
    useEffect(() => {
        if (open) {
            form.reset({
                amount: Math.abs(transaction.amount),
                note: isCancel ? `Cancel Order: ${transaction.note || ''}` : `Refund for: ${transaction.note || 'Order'}`,
            })
        }
    }, [open, transaction, form, type, isCancel])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true)
        try {
            let result;
            if (isCancel) {
                result = await cancelOrder(transaction.id)
            } else {
                // Determine if partial
                const originalAmount = Math.abs(transaction.amount)
                const isPartial = values.amount < originalAmount
                result = await requestRefund(transaction.id, values.amount, isPartial)
            }

            if (result.success) {
                toast.success(`${title} successful`, {
                    description: isCancel ? "Order cancelled." : "Transaction marked as pending refund."
                })
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error(`Failed to ${title.toLowerCase()}`, {
                    description: result.error
                })
            }
        } catch (error: any) {
            toast.error("An error occurred", {
                description: error.message
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCcw className="h-5 w-5 text-blue-600" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Refund Amount</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                {...field}
                                                type="number"
                                                className="pl-8 font-bold text-lg"
                                                min={0}
                                                max={Math.abs(transaction.amount)}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Note / Reason</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Reason for refund..."
                                            className="resize-none"
                                            rows={3}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Request
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
