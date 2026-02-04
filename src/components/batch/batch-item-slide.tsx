'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Loader2, Plus, Edit } from 'lucide-react'
import { AccountSlideV2 } from '@/components/accounts/v2/AccountSlideV2'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { addBatchItemAction, updateBatchItemAction } from '@/actions/batch.actions'
import { toast } from 'sonner'

const formSchema = z.object({
    receiver_name: z.string().min(1, 'Receiver name is required'),
    bank_number: z.string().min(1, 'Bank number is required'),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    note: z.string().optional(),
    bank_code: z.string().optional(),
    bank_name: z.string().optional(),
    card_name: z.string().optional(),
    target_account_id: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface BatchItemSlideProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    batchId: string
    item?: any // For edit mode
    bankType?: 'VIB' | 'MBB'
    bankMappings?: any[]
    accounts: any[]
    onSuccess?: () => void
}

export function BatchItemSlide({
    isOpen,
    onOpenChange,
    batchId,
    item,
    bankType = 'VIB',
    bankMappings = [],
    accounts,
    onSuccess,
}: BatchItemSlideProps) {
    const [loading, setLoading] = useState(false)
    const [isAccountSlideOpen, setIsAccountSlideOpen] = useState(false)
    const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<any>(null)
    const isEditMode = !!item?.id

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            receiver_name: item?.receiver_name || '',
            bank_number: item?.bank_number || '',
            amount: item?.amount || 0,
            note: item?.note || '',
            bank_code: item?.bank_code || '',
            bank_name: item?.bank_name || '',
            card_name: item?.card_name || '',
            target_account_id: item?.target_account_id || 'none',
        },
    })

    useEffect(() => {
        if (isEditMode && item) {
            form.reset({
                receiver_name: item.receiver_name || '',
                bank_number: item.bank_number || '',
                amount: item.amount || 0,
                note: item.note || '',
                bank_code: item.bank_code || '',
                bank_name: item.bank_name || '',
                card_name: item.card_name || '',
                target_account_id: item.target_account_id || 'none',
            })
        } else {
            form.reset({
                receiver_name: '',
                bank_number: '',
                amount: 0,
                note: '',
                bank_code: '',
                bank_name: '',
                card_name: '',
                target_account_id: 'none',
            })
        }
    }, [isOpen, item, isEditMode, form])

    const bankCode = form.watch('bank_code')
    const bankName = form.watch('bank_name')
    const targetAccountId = form.watch('target_account_id')

    const accountItems = [
        { value: 'none', label: 'None', description: 'Manual entry' },
        ...accounts
            .filter((a: any) => a.type !== 'debt' && a.type !== 'loan' && a.type !== 'savings')
            .map((a: any) => ({
                value: a.id,
                label: a.name,
                description: a.account_number || 'No account number',
            }))
    ]

    useEffect(() => {
        if (bankCode && bankMappings.length > 0) {
            const selectedBank = bankMappings.find(b => b.bank_code === bankCode)
            if (selectedBank) {
                form.setValue('bank_name', selectedBank.short_name || selectedBank.bank_name)
            }
        }
    }, [bankCode, bankMappings, form])

    useEffect(() => {
        if (!targetAccountId || targetAccountId === 'none') return
        const target = accounts.find(a => a.id === targetAccountId)
        if (target) {
            if (target.receiver_name) form.setValue('receiver_name', target.receiver_name)
            if (target.account_number) form.setValue('bank_number', target.account_number)
            if (target.name) {
                form.setValue('card_name', target.name)
                const date = new Date()
                const month = date.toLocaleString('en-US', { month: 'short' })
                const year = date.getFullYear().toString().slice(-2)
                form.setValue('note', `${target.name} ${month}${year}`)
            }
        }
    }, [accounts, form, targetAccountId])

    const bankOptions = bankMappings.map((b) => ({
        label: `${b.bank_code} - ${b.bank_name}`,
        value: b.bank_code,
    }))

    // Convert to Combobox items format
    const bankItems = bankMappings.map((b) => ({
        label: `${b.bank_code} - ${b.bank_name}`,
        value: b.bank_code,
    }))

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            if (isEditMode) {
                // Only send valid batch_items columns (exclude bank_code which comes from bank_mappings)
                const updateData = {
                    receiver_name: values.receiver_name,
                    target_account_id: values.target_account_id === 'none' ? null : values.target_account_id,
                    amount: values.amount,
                    note: values.note,
                    bank_name: values.bank_name,
                    bank_number: values.bank_number,
                    card_name: values.card_name,
                }
                const result = await updateBatchItemAction(item.id, updateData, batchId)
                if (result?.success) {
                    toast.success('Item updated successfully')
                    onOpenChange(false)
                    onSuccess?.()
                } else if (result?.error) {
                    toast.error(result.error)
                }
            } else {
                const result = await addBatchItemAction({
                    batch_id: batchId,
                    receiver_name: values.receiver_name,
                    target_account_id: values.target_account_id === 'none' ? null : values.target_account_id,
                    amount: values.amount,
                    note: values.note,
                    bank_name: values.bank_name,
                    bank_number: values.bank_number,
                    card_name: values.card_name,
                })
                if (result) {
                    toast.success('Item added successfully')
                    form.reset()
                    onOpenChange(false)
                    onSuccess?.()
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to save item')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
                    onClick={() => onOpenChange(false)}
                />
            )}

            {/* Slide */}
            <div
                className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        {isEditMode ? (
                            <Edit className="h-5 w-5 text-blue-600" />
                        ) : (
                            <Plus className="h-5 w-5 text-green-600" />
                        )}
                        <h2 className="text-lg font-semibold text-slate-900">
                            {isEditMode ? 'Edit Item' : 'Add Item'}
                        </h2>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Target Account */}
                            <FormField
                                control={form.control}
                                name="target_account_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-slate-700 font-medium">
                                                Target Internal Account
                                            </FormLabel>
                                            {field.value && field.value !== 'none' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const account = accounts.find(a => a.id === field.value)
                                                        setSelectedAccountForEdit(account)
                                                        setIsAccountSlideOpen(true)
                                                    }}
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                >
                                                    <Edit className="h-3 w-3" /> Edit Info
                                                </button>
                                            )}
                                        </div>
                                        <FormControl>
                                            <Combobox
                                                items={accountItems}
                                                value={field.value || 'none'}
                                                onValueChange={(val) => field.onChange(val ?? 'none')}
                                                placeholder="Select internal account"
                                                inputPlaceholder="Search accounts..."
                                                emptyState="No account found"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Receiver Name */}
                            <FormField
                                control={form.control}
                                name="receiver_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">
                                            Receiver Name
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., John Doe"
                                                {...field}
                                                className="h-10"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Card Name */}
                            <FormField
                                control={form.control}
                                name="card_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">
                                            Card Name (Optional)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Diamond, Platinum"
                                                {...field}
                                                className="h-10"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Bank Selection */}
                            <FormField
                                control={form.control}
                                name="bank_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">
                                            Bank
                                        </FormLabel>
                                        <FormControl>
                                            <Combobox
                                                items={bankItems}
                                                value={field.value || ''}
                                                onValueChange={field.onChange}
                                                placeholder="Select bank..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Bank Number */}
                            <FormField
                                control={form.control}
                                name="bank_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">
                                            Bank Account Number
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., 1234567890"
                                                {...field}
                                                className="h-10"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Amount */}
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">
                                            Amount (VND)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                                className="h-10"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Note */}
                            <FormField
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">
                                            Note (Optional)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Add a note..."
                                                {...field}
                                                className="h-10"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                {/* Footer */}
                <div className="border-t p-6 bg-slate-50 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {isEditMode ? 'Update' : 'Add'} Item
                    </Button>
                </div>
            </div>

            {/* Account Slide for editing account details */}
            {selectedAccountForEdit && (
                <AccountSlideV2
                    account={selectedAccountForEdit}
                    open={isAccountSlideOpen}
                    onOpenChange={setIsAccountSlideOpen}
                />
            )}
        </>
    )
}
