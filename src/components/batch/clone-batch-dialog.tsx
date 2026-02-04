'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Copy, Loader2 } from 'lucide-react'
import { addMonths, subMonths } from 'date-fns'
import { cloneBatchAction } from '@/actions/batch.actions'
import { useRouter } from 'next/navigation'
import { isLegacyMMMYY, isYYYYMM, toYYYYMMFromDate, normalizeMonthTag } from '@/lib/month-tag'

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sheet_link: z.string().optional(),
    sheet_name: z.string().optional(),
    source_account_id: z.string().optional(),
    is_template: z.boolean().default(false),
    auto_clone_day: z.number().min(1).max(31).optional(),
    bank_type: z.enum(['VIB', 'MBB']).default('VIB'),
})

interface CloneBatchDialogProps {
    batch: any
    accounts: any[]
    webhookLinks?: { id: string; name: string; url: string }[]
}

export function CloneBatchDialog({ batch, accounts, webhookLinks }: CloneBatchDialogProps) {
    const [open, setOpen] = useState(false)
    const [monthMode, setMonthMode] = useState<'current' | 'last'>('current')
    const router = useRouter()

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            sheet_link: batch.sheet_link || '',
            sheet_name: batch.sheet_name || (batch.bank_type === 'MBB' ? 'eMB_BulkPayment' : 'Danh sách chuyển tiền'),
            source_account_id: batch.source_account_id || '',
            is_template: false,
            auto_clone_day: batch.auto_clone_day || 1,
            bank_type: batch.bank_type || 'VIB',
        },
        mode: 'onChange',
    })

    // Auto-generate name when monthMode changes
    useEffect(() => {
        if (open) {
            const nameParts = batch.name.split(' ')
            const lastPart = nameParts[nameParts.length - 1]

            const targetDate = monthMode === 'current' ? new Date() : addMonths(new Date(), -1)
            const newTag = toYYYYMMFromDate(targetDate)
            const normalizedTag = normalizeMonthTag(newTag) ?? newTag

            const hasMonthTagAtEnd = isYYYYMM(lastPart) || isLegacyMMMYY(lastPart)

            if (hasMonthTagAtEnd) {
                nameParts[nameParts.length - 1] = normalizedTag
                form.setValue('name', nameParts.join(' '))
            } else {
                form.setValue('name', `${batch.name} ${normalizedTag}`)
            }
        }
    }, [monthMode, open, batch.name, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const newBatch = await cloneBatchAction(batch.id, values)
            setOpen(false)
            router.push(`/batch/${newBatch.id}`)
        } catch (error) {
            console.error(error)
            alert('Failed to clone batch')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    size="icon" 
                    title="Clone Batch" 
                    onClick={(e) => e.stopPropagation()}
                    data-clone-batch-trigger
                >
                    <Copy className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Clone Batch: {batch.name}</DialogTitle>
                    <DialogDescription>
                        Review and update the details for the new batch. All items will be copied.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="cloneMonthMode"
                            checked={monthMode === 'current'}
                            onChange={() => setMonthMode('current')}
                            className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium">Tháng này (Current)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="cloneMonthMode"
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
                                    <FormLabel>New Batch Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., CKL 2025-11" {...field} />
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
                                            form.setValue('sheet_link', val || '')
                                        }}
                                        placeholder="Select saved webhook"
                                    />
                                </FormItem>
                            )}
                        </div>
                        <FormField
                            control={form.control}
                            name="bank_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Type</FormLabel>
                                    <Select
                                        items={[
                                            { value: 'VIB', label: 'VIB (Legacy)' },
                                            { value: 'MBB', label: 'MB Bank' }
                                        ]}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select bank type"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sheet_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sheet Name (Target)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., eMB_BulkPayment" {...field} />
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
                        <Button type="submit" className="w-full" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Clone with Overrides
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
