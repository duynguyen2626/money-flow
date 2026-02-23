'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Loader2, Plus, Edit, Info } from 'lucide-react'
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
    batch?: any
    cutoffDay?: number
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
    batch,
    cutoffDay = 15,
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
            label: `Recommended (Cutoff: ${cutoffDay})`,
            items: accounts
                .filter((a: any) => {
                    if (a.type === 'debt' || a.type === 'loan' || a.type === 'savings') return false;
                    // If batch is provided, filter based on due_date primarily, then statement_day
                    if (batch?.period) {
                        try {
                            const config = a.cashback_config ? JSON.parse(a.cashback_config) : null;
                            const effectiveDay = Number(a.due_date || a.statement_day || config?.program?.statementDay || 0);

                            if (effectiveDay > 0) {
                                // If effective day <= cutoffDay, it belongs to "before"
                                const isBefore = effectiveDay <= cutoffDay;
                                return batch.period === 'before' ? isBefore : !isBefore;
                            }
                        } catch (e) { }
                    }
                    return false;
                })
                .map((a: any) => ({
                    value: a.id,
                    label: a.name,
                    description: `${a.due_date ? `Due: ${a.due_date}` : (a.statement_day ? `Stmt: ${a.statement_day}` : 'No date')}`,
                    icon: a.image_url ? (
                        <img src={a.image_url} alt="" className="w-4 h-4 rounded-none object-contain" />
                    ) : (
                        <div className="w-4 h-4 rounded-none bg-slate-900 flex items-center justify-center text-[8px] font-black text-white shrink-0 uppercase">
                            {a.name?.[0]}
                        </div>
                    )
                }))
        },
        {
            label: "Other Internal Accounts",
            items: accounts
                .filter((a: any) => {
                    if (a.type === 'debt' || a.type === 'loan' || a.type === 'savings') return false;

                    if (batch?.period) {
                        try {
                            const config = a.cashback_config ? JSON.parse(a.cashback_config) : null;
                            const effectiveDay = Number(a.due_date || a.statement_day || config?.program?.statementDay || 0);

                            if (effectiveDay > 0) {
                                const isBefore = effectiveDay <= cutoffDay;
                                // Return true if it does NOT match the current period (it belongs in "Other")
                                return batch.period === 'before' ? !isBefore : isBefore;
                            }
                        } catch (e) { }
                    }
                    return true;
                })
                .map((a: any) => ({
                    value: a.id,
                    label: a.name,
                    description: `${a.due_date ? `Due: ${a.due_date}` : (a.statement_day ? `Stmt: ${a.statement_day}` : 'No date')}`,
                    icon: a.image_url ? (
                        <img src={a.image_url} alt="" className="w-4 h-4 rounded-none object-contain" />
                    ) : (
                        <div className="w-4 h-4 rounded-none bg-slate-900 flex items-center justify-center text-[8px] font-black text-white shrink-0 uppercase">
                            {a.name?.[0]}
                        </div>
                    )
                }))
        }
    ].filter(g => g.items.length > 0)

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
                form.setValue('note', target.name)
            }
        }
    }, [accounts, form, targetAccountId])

    // Grouping for Account Number Suggestions
    const accountNoItems = useMemo(() => {
        const uniqueNos = new Map<string, any>()
        accounts.forEach(a => {
            if (a.account_number && !uniqueNos.has(a.account_number)) {
                uniqueNos.set(a.account_number, {
                    value: a.account_number,
                    label: a.account_number,
                    description: `${a.bank_name || ''} - ${a.name || ''}`,
                    receiver_name: a.receiver_name
                })
            }
        })
        return Array.from(uniqueNos.values())
    }, [accounts])

    // Convert to Combobox items format
    // Grouping for Bank Mappings (Mapped vs All)
    const bankGroups: ComboboxGroup[] = useMemo(() => {
        if (!bankMappings) return []

        // Deduplicate bankMappings by bank_code to avoid unique key errors in Combobox
        const uniqueBankMappings = Array.from(
            bankMappings.reduce((map, bank) => {
                const bankCode = (bank as any).bank_code
                if (bankCode && !map.has(bankCode)) {
                    map.set(bankCode, bank)
                }
                return map
            }, new Map<string, any>()).values()
        )

        const targetAccountId = form.watch('target_account_id')
        const selectedAccount = accounts.find(a => a.id === targetAccountId)

        let recommendedCodes: string[] = []
        if (selectedAccount?.bank_name) {
            const search = selectedAccount.bank_name.toLowerCase()
            recommendedCodes = uniqueBankMappings
                .filter(b =>
                    (b as any).bank_code.toLowerCase().includes(search) ||
                    (b as any).short_name?.toLowerCase().includes(search) ||
                    (b as any).bank_name.toLowerCase().includes(search)
                )
                .map(b => (b as any).bank_code)
        }

        const mappedBanks = uniqueBankMappings.filter(b => recommendedCodes.includes((b as any).bank_code))
        const otherBanks = uniqueBankMappings.filter(b => !recommendedCodes.includes((b as any).bank_code))

        const groups: ComboboxGroup[] = []

        if (mappedBanks.length > 0) {
            groups.push({
                label: "Mapped Bank",
                items: mappedBanks.map(b => ({
                    label: `${(b as any).bank_code} - ${(b as any).bank_name}`,
                    value: (b as any).bank_code,
                    description: (b as any).short_name,
                    icon: (
                        <div className="w-6 h-4 rounded-sm bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[7px] font-black text-indigo-600 uppercase">
                            {(b as any).bank_code}
                        </div>
                    )
                }))
            })
        }

        groups.push({
            label: "All bank",
            items: otherBanks.map(b => ({
                label: `${(b as any).bank_code} - ${(b as any).bank_name}`,
                value: (b as any).bank_code,
                description: (b as any).short_name,
                icon: (
                    <div className="w-6 h-4 rounded-sm bg-slate-50 border border-slate-100 flex items-center justify-center text-[7px] font-black text-slate-400 uppercase">
                        {(b as any).bank_code}
                    </div>
                )
            }))
        })

        return groups
    }, [bankMappings, accounts, form.watch('target_account_id')])

    // Grouping for Receiver Suggestions
    const receiverItems = useMemo(() => {
        const uniqueReceivers = new Map<string, any>()
        accounts.forEach(a => {
            if (a.receiver_name && !uniqueReceivers.has(a.receiver_name)) {
                uniqueReceivers.set(a.receiver_name, {
                    value: a.receiver_name,
                    label: a.receiver_name,
                    description: `${a.bank_name || ''} ${a.account_number || ''}`,
                    bank_number: a.account_number
                })
            }
        })
        return Array.from(uniqueReceivers.values())
    }, [accounts])

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
                            {/* SECTION 1: Internal Connection */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Bank Connection</span>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 space-y-6 shadow-sm">
                                    <FormField
                                        control={form.control}
                                        name="target_account_id"
                                        render={({ field }) => {
                                            const selectedAccount = accounts.find(a => a.id === field.value)
                                            const effectiveDay = selectedAccount ? Number(selectedAccount.due_date || selectedAccount.statement_day || 0) : 0;
                                            const isWrongPeriod = effectiveDay > 0 && (
                                                batch?.period === 'before' ? effectiveDay > cutoffDay : effectiveDay <= cutoffDay
                                            );

                                            return (
                                                <FormItem className="space-y-1.5">
                                                    <div className="flex items-center justify-between px-1">
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
                                                        <div className="space-y-2">
                                                            <Combobox
                                                                groups={accountGroups}
                                                                value={field.value || 'none'}
                                                                onValueChange={(val) => field.onChange(val ?? 'none')}
                                                                placeholder="Select internal account"
                                                                inputPlaceholder="Search accounts..."
                                                                className={cn(
                                                                    "h-12 border-slate-200 bg-white shadow-sm",
                                                                    isWrongPeriod ? "border-amber-200 bg-amber-50/20" : selectedAccount ? "border-emerald-100 bg-emerald-50/20" : ""
                                                                )}
                                                            />
                                                            {isWrongPeriod && (
                                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-start animate-in fade-in slide-in-from-top-1">
                                                                    <div className="p-1 bg-amber-100 rounded-full">
                                                                        <Info className="h-3 w-3 text-amber-600" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="text-[11px] leading-tight font-medium text-amber-800">
                                                                            This account has a {selectedAccount.due_date ? 'due date' : 'statement day'} of <span className="font-black">{effectiveDay}</span>, which belongs to the <span className="font-black italic uppercase">{batch?.period === 'before' ? 'After' : 'Before'} {cutoffDay}</span> cutoff.
                                                                        </p>
                                                                        <p className="text-[10px] text-amber-600 mt-1 font-bold">
                                                                            Consider moving this item to the {batch?.period === 'before' ? 'After' : 'Before'} tab.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )
                                        }}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="bank_code"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                                    Bank Mapping
                                                </FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        groups={bankGroups}
                                                        value={field.value || ''}
                                                        onValueChange={field.onChange}
                                                        placeholder="Bank"
                                                        className="h-12 border-slate-200 bg-white"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* SECTION 2: Target Identity */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Target Identity</span>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 space-y-6 shadow-sm">
                                    <FormField
                                        control={form.control}
                                        name="receiver_name"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                                    Receiver Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        items={receiverItems}
                                                        value={field.value}
                                                        onValueChange={(val) => {
                                                            field.onChange(val)
                                                            const match = receiverItems.find((r: any) => r.value === val)
                                                            if (match?.bank_number) {
                                                                form.setValue('bank_number', match.bank_number)
                                                            }
                                                        }}
                                                        placeholder="Receiver Name..."
                                                        className="h-12 border-slate-200 bg-white"
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
                                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                                    Account No
                                                </FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        items={accountNoItems}
                                                        value={field.value}
                                                        onValueChange={(val) => {
                                                            field.onChange(val)
                                                            const match = accountNoItems.find((r: any) => r.value === val)
                                                            if (match?.receiver_name) {
                                                                form.setValue('receiver_name', match.receiver_name)
                                                            }
                                                        }}
                                                        placeholder="01234..."
                                                        className="h-12 border-slate-200 bg-white tabular-nums font-bold"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Card Name hidden or minimized? User didn't ask but it was there */}
                                    <FormField
                                        control={form.control}
                                        name="card_name"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-slate-400 px-1">
                                                    Card Name (Legacy Label)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g., Diamond, Platinum"
                                                        {...field}
                                                        className="h-11 bg-white border-slate-200 font-medium"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
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
                        className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        <span>{isEditMode ? 'Update' : 'Add'} Item</span>
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
