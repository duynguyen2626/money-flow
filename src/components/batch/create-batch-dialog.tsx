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
    DialogDescription,
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
import { Switch } from '@/components/ui/switch'
import { createBatchAction } from '@/actions/batch.actions'

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sheet_link: z.string().optional(),
    source_account_id: z.string().optional(),
    is_template: z.boolean().default(false),
    auto_clone_day: z.number().min(1).max(31).optional(),
})

type WebhookLink = { id: string; name: string; url: string }

export function CreateBatchDialog({ accounts, webhookLinks }: { accounts: any[], webhookLinks?: WebhookLink[] }) {
    const [open, setOpen] = useState(false)
    const [monthMode, setMonthMode] = useState<'current' | 'last'>('current')

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            sheet_link: '',
            source_account_id: '',
            is_template: false,
            auto_clone_day: 1,
        },
        mode: 'onChange',
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
                    <DialogDescription>
                        Create a new batch for processing transactions.
                    </DialogDescription>
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
                        <div className="grid gap-3 md:grid-cols-2">
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
                            {webhookLinks && webhookLinks.length > 0 && (
                                <FormItem>
                                    <FormLabel>Reuse Saved Webhook</FormLabel>
                                    <Select
                                        items={[
                                            { value: '', label: 'None' },
                                            ...webhookLinks.map(w => ({ value: w.url, label: w.name }))
                                        ]}
                                        value={form.watch('sheet_link') && webhookLinks.some(w => w.url === form.watch('sheet_link')) ? form.watch('sheet_link') : ''}
                                        onValueChange={(val) => {
                                            if (val === '') {
                                                form.setValue('sheet_link', '')
                                            } else {
                                                form.setValue('sheet_link', val)
                                            }
                                        }}
                                        placeholder="Select saved webhook"
                                    />
                                </FormItem>
                            )}
                        </div>
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
                        <FormField
                            control={form.control}
                            name="is_template"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Save as Template</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            This batch will be used as a template for auto-cloning.
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        {form.watch('is_template') && (
                            <FormField
                                control={form.control}
                                name="auto_clone_day"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Auto Clone Day (1-31)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={31}
                                                placeholder="e.g., 1"
                                                {...field}
                                                onChange={(e) => {
                                                    const value = e.target.valueAsNumber
                                                    field.onChange(isNaN(value) ? 1 : value)
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>Create</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    )
}
