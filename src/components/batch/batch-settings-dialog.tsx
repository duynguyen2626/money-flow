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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { updateBatchAction, updateBatchNoteModeAction } from '@/actions/batch.actions'
import { Settings, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sheet_link: z.string().optional(),
    display_link: z.string().optional(),
    display_name: z.string().optional(),
    sheet_name: z.string().optional(),
    is_template: z.boolean().optional(),
    auto_clone_day: z.number().min(1).max(31).optional().or(z.literal(0)),
})

export function BatchSettingsDialog({ batch }: { batch: any }) {
    const [open, setOpen] = useState(false)
    const [updatingMode, setUpdatingMode] = useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: batch.name,
            sheet_link: batch.sheet_link || '',
            display_link: batch.display_link || '',
            display_name: batch.display_name || '',
            sheet_name: batch.sheet_name || '',
            is_template: batch.is_template || false,
            auto_clone_day: Number(batch.auto_clone_day) || 1,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await updateBatchAction(batch.id, {
                name: values.name,
                sheet_link: values.sheet_link,
                display_link: values.display_link,
                display_name: values.display_name,
                sheet_name: values.sheet_name,
                is_template: values.is_template ?? false,
                auto_clone_day: values.is_template ? (values.auto_clone_day ?? null) : null
            })
            setOpen(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('Failed to update batch settings')
        }
    }

    async function handleModeUpdate(mode: 'previous' | 'current') {
        if (!confirm(`Are you sure you want to update all notes to ${mode} month?`)) return
        setUpdatingMode(true)
        try {
            const result = await updateBatchNoteModeAction(batch.id, mode)
            if (result.success) {
                alert(`Updated ${result.count} items`)
                router.refresh()
            }
        } catch (error) {
            console.error(error)
            alert('Failed to update notes')
        } finally {
            setUpdatingMode(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Settings">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Batch Settings</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Batch Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                    <FormLabel>Sheet Webhook Link (Script)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="https://script.google.com/..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="display_link"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sheet Link (Display)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="https://docs.google.com/..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="display_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name (Link Label)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. Google Sheet" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="sheet_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Target Sheet (Google Script)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g., eMB_BulkPayment" />
                                    </FormControl>
                                    <FormDescription>
                                        The name of the tab in the spreadsheet where data will be sent.
                                    </FormDescription>
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
                                        <FormLabel>Template Mode</FormLabel>
                                        <FormDescription>
                                            Enable auto-cloning for this batch
                                        </FormDescription>
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
                                                {...field}
                                                onChange={(e) => {
                                                    const value = e.target.valueAsNumber
                                                    field.onChange(isNaN(value) ? 1 : value)
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Day of the month to automatically clone this batch
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="rounded-lg border p-3 shadow-sm space-y-3">
                            <div className="space-y-0.5">
                                <FormLabel>Batch Note Mode</FormLabel>
                                <FormDescription>
                                    Bulk update transaction notes (e.g. 2024-11 ↔ 2024-12)
                                </FormDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModeUpdate('previous')}
                                    disabled={updatingMode}
                                    className="flex-1"
                                >
                                    {updatingMode && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
                                    Previous Month
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModeUpdate('current')}
                                    disabled={updatingMode}
                                    className="flex-1"
                                >
                                    {updatingMode && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
                                    Current Month
                                </Button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full">Save Changes</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
