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
import { Combobox, ComboboxGroup } from '@/components/ui/combobox'
import { addBatchItemAction, updateBatchItemAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { SmartAmountInput } from '@/components/ui/smart-amount-input'
import { formatShortVietnameseCurrency } from '@/lib/number-to-text'
import { cn } from '@/lib/utils'

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

    const handleClose = () => {
        const values = form.getValues()
        const isDirty = form.formState.isDirty
        const hasData = values.receiver_name || values.amount > 0 || (values.target_account_id && values.target_account_id !== 'none')

        if (hasData && isDirty && !isEditMode) {
            if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                onOpenChange(false)
            }
        } else {
            onOpenChange(false)
        }
    }

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
    const currentAmount = form.watch('amount')

    const accountGroups: ComboboxGroup[] = [
        {
            label: "System",
            items: [{ value: 'none', label: 'None', description: 'Manual entry' }]
        },
        {
            label: "Internal Accounts",
            items: accounts
                .filter((a: any) => a.type !== 'debt' && a.type !== 'loan' && a.type !== 'savings')
                .map((a: any) => ({
                    value: a.id,
                    label: a.name,
                    description: a.account_number || 'No account number',
                    icon: a.image_url ? (
                        <img src={a.image_url} alt="" className="w-4 h-4 rounded-none object-contain" />
                    ) : (
                        <div className="w-4 h-4 rounded-none bg-slate-900 flex items-center justify-center text-[8px] font-black text-white shrink-0 uppercase">
                            {a.name?.[0]}
                        </div>
                    )
                }))
        }
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
                    onClick={handleClose}
                />
            )}

            {/* Slide */}
            <div
                className={`fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border",
                            isEditMode ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                        )}>
                            {isEditMode ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 leading-none">
                                {isEditMode ? 'Edit Item' : 'Add Item'}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Batch Processing</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Target Account */}
                            <FormField
                                control={form.control}
                                name="target_account_id"
                                render={({ field }) => {
                                    const selectedAccount = accounts.find(a => a.id === field.value)
                                    return (
                                        <FormItem className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Target Internal Account
                                                </FormLabel>
                                                {field.value && field.value !== 'none' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedAccountForEdit(selectedAccount)
                                                            setIsAccountSlideOpen(true)
                                                        }}
                                                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <Edit className="h-3 w-3" /> EDIT INFO
                                                    </button>
                                                )}
                                            </div>
                                            <FormControl>
                                                <Combobox
                                                    groups={accountGroups}
                                                    value={field.value || 'none'}
                                                    onValueChange={(val) => field.onChange(val ?? 'none')}
                                                    placeholder="Select internal account"
                                                    inputPlaceholder="Search accounts..."
                                                    className="h-11 shadow-sm"
                                                    triggerClassName={selectedAccount ? "border-emerald-100 bg-emerald-50/20" : ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )
                                }}
                            />

                            <div className="grid grid-cols-1 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                {/* Receiver Name */}
                                <FormField
                                    control={form.control}
                                    name="receiver_name"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Receiver Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., John Doe"
                                                    {...field}
                                                    className="h-11 bg-white border-slate-200"
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
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-slate-400">
                                                Card Name (Legacy Label)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., Diamond, Platinum"
                                                    {...field}
                                                    className="h-11 bg-white border-slate-200"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Bank Selection & Number */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="bank_code"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Bank
                                            </FormLabel>
                                            <FormControl>
                                                <Combobox
                                                    items={bankItems}
                                                    value={field.value || ''}
                                                    onValueChange={field.onChange}
                                                    placeholder="Bank"
                                                    className="h-11 bg-white"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="bank_number"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Account No
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="1234..."
                                                    {...field}
                                                    className="h-11 bg-white"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Amount */}
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Amount (VND)
                                        </FormLabel>
                                        <FormControl>
                                            <SmartAmountInput
                                                value={field.value}
                                                onChange={(val) => field.onChange(val || 0)}
                                                placeholder="0"
                                                className="h-14 text-2xl font-black border-2 border-slate-200 focus:border-indigo-500"
                                            />
                                        </FormControl>
                                        {field.value > 0 && (
                                            <p className="text-[10px] font-black text-rose-500 italic uppercase tracking-wider px-1">
                                                {formatShortVietnameseCurrency(field.value)}
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Note */}
                            <FormField
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Note (Optional)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Add a note..."
                                                {...field}
                                                className="h-11 bg-white"
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
                        onClick={handleClose}
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl border-slate-200 font-bold text-slate-600"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
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
