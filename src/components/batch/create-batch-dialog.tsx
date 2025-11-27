'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { format, subMonths } from 'date-fns'
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
import { createBatchAction } from '@/actions/batch.actions'

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sheet_link: z.string().optional(),
    source_account_id: z.string().optional(),
})

export function CreateBatchDialog({ accounts }: { accounts: any[] }) {
    const [open, setOpen] = useState(false)
    const [monthMode, setMonthMode] = useState<'current' | 'last'>('current')

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            sheet_link: '',
            source_account_id: '',
        },
    })

    // Auto-generate name when monthMode changes
    useEffect(() => {
        if (open) {
            const date = monthMode === 'current' ? new Date() : subMonths(new Date(), 1)
            const tag = format(date, 'MMMyy').toUpperCase()
            form.setValue('name', `CKL ${tag}`)
        }
    }, [monthMode, open, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await createBatchAction(values)
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error(error)
            alert('Failed to create batch')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Create Batch</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Batch</DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="monthMode"
                            checked={monthMode === 'current'}
                            onChange={() => setMonthMode('current')}
                            className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium">Tháng này (Current)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="monthMode"
                            checked={monthMode === 'last'}
                            onChange={() => setMonthMode('last')}
                            className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium">Tháng trước (Last)</span>
                    </label>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Batch Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., CKL NOV25" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sheet_link"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sheet Webhook Link</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://script.google.com/..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="source_account_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source Account</FormLabel>
                                    <FormControl>
                                        <Select
                                            items={accounts
                                                .filter(a => a.type === 'bank')
                                                .map(a => ({ value: a.id, label: a.name }))}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Select account"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Create</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    )
}
