'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { updateBatchItemAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'

const formSchema = z.object({
    receiver_name: z.string().optional(),
    amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
    note: z.string().optional(),
    bank_name: z.string().optional(),
    bank_number: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function EditItemDialog({ item }: { item: any }) {
    const [open, setOpen] = useState(false)
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            receiver_name: item.receiver_name || '',
            amount: item.amount || 0,
            note: item.note || '',
            bank_name: item.bank_name || '',
            bank_number: item.bank_number || '',
        },
    })

    async function onSubmit(values: FormValues) {
        try {
            await updateBatchItemAction(item.id, {
                receiver_name: values.receiver_name,
                amount: values.amount,
                note: values.note,
                bank_name: values.bank_name,
                bank_number: values.bank_number,
            })
            setOpen(false)
            toast.success('Item updated successfully')
        } catch (error) {
            console.error(error)
            toast.error('Failed to update item')
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value)
    }

    const parseCurrency = (value: string) => {
        return parseInt(value.replace(/\./g, ''), 10) || 0
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Batch Item</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="bank_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bank Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., VCB" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="bank_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bank Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 123456" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="receiver_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Receiver Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="0"
                                            value={field.value ? formatCurrency(field.value) : ''}
                                            onChange={(e) => {
                                                const val = parseCurrency(e.target.value)
                                                field.onChange(val)
                                            }}
                                        />
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
                                    <FormLabel>Note</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Note" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Save Changes</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
