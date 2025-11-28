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
import { updateBatchAction } from '@/actions/batch.actions'
import { Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sheet_link: z.string().optional(),
    is_template: z.boolean().optional(),
    auto_clone_day: z.number().min(1).max(31).optional().or(z.literal(0)),
})

export function BatchSettingsDialog({ batch }: { batch: any }) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: batch.name,
            sheet_link: batch.sheet_link || '',
            is_template: batch.is_template || false,
            auto_clone_day: Number(batch.auto_clone_day) || 1,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await updateBatchAction(batch.id, {
                name: values.name,
                sheet_link: values.sheet_link,
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
                                    <FormLabel>Sheet Webhook Link</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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

                        <Button type="submit" className="w-full">Save Changes</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
