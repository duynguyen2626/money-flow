'use client'

import { useState, useEffect } from 'react'
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
import { Select } from '@/components/ui/select'
import { addBatchItemAction } from '@/actions/batch.actions'
import { toast } from 'sonner'

const formSchema = z.object({
    receiver_name: z.string().optional(),
    target_account_id: z.string().optional(),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    note: z.string().optional(),
    bank_name: z.string().optional(),
    bank_number: z.string().optional(),
    card_name: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function AddItemDialog({ batchId, batchName, accounts }: { batchId: string, batchName: string, accounts: any[] }) {
    const [open, setOpen] = useState(false)
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            receiver_name: 'NGUYEN THANH NAM',
            target_account_id: '',
            amount: 0,
            note: '',
            bank_name: '',
            bank_number: '',
            card_name: '',
        },
    })

    const bankName = form.watch('bank_name')
    const cardName = form.watch('card_name')
    const targetAccountId = form.watch('target_account_id')

    // Smart Note Logic
    useEffect(() => {
        if (bankName) {
            const parts = bankName.split('-')
            // Take the part BEFORE the dash (e.g., "VCB" from "VCB - Ngoại Thương")
            const shortBank = parts[0].trim()

            // Extract Tag from Batch Name (assuming format "CKL TAG")
            const batchParts = batchName.split(' ')
            const tag = batchParts.length > 1 ? batchParts[batchParts.length - 1] : ''

            // Construct note: BankName [CardName] MMMYY
            let noteValue = shortBank
            if (cardName && cardName.trim()) {
                noteValue += ` ${cardName.trim()}`
            }
            if (tag) {
                noteValue += ` ${tag}`
            }

            if (noteValue.trim()) {
                form.setValue('note', noteValue)
            }
        }
    }, [bankName, cardName, batchName, form])

    // Note: Receiver name is kept as default "NGUYEN THANH NAM" and not auto-filled from account

    async function onSubmit(values: FormValues) {
        try {
            const targetAccountId = values.target_account_id === 'none' ? null : values.target_account_id

            await addBatchItemAction({
                batch_id: batchId,
                receiver_name: values.receiver_name,
                target_account_id: targetAccountId || null,
                amount: values.amount,
                note: values.note,
                bank_name: values.bank_name,
                bank_number: values.bank_number,
                card_name: values.card_name,
            })
            setOpen(false)
            form.reset({
                receiver_name: 'NGUYEN THANH NAM',
                target_account_id: '',
                amount: 0,
                note: '',
                bank_name: '',
                bank_number: '',
                card_name: '',
            })
            toast.success('Item added successfully')
        } catch (error) {
            console.error(error)
            toast.error('Failed to add item')
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
                <Button variant="outline">Add Item</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Batch Item</DialogTitle>
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
                            name="target_account_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Target Account (Optional)</FormLabel>
                                    <FormControl>
                                        <Select
                                            items={[
                                                { value: 'none', label: 'None' },
                                                ...accounts.map(a => ({ value: a.id, label: a.name }))
                                            ]}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Select account"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
                            name="card_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Card Name (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Amex, Visa" {...field} />
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
                        <Button type="submit">Add</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
