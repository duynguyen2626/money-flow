'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Pencil, Info } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'

const formSchema = z.object({
    receiver_name: z.string().optional(),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    note: z.string().optional(),
    bank_code: z.string().optional(),
    bank_name: z.string().optional(),
    bank_number: z.string().optional(),
    card_name: z.string().optional(),
    target_account_id: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EditItemDialogProps {
    item: any
    accounts?: any[]
    bankMappings?: any[]
    bankType?: 'VIB' | 'MBB'
}

export function EditItemDialog({ item, accounts = [], bankMappings = [], bankType = 'VIB' }: EditItemDialogProps) {
    const [open, setOpen] = useState(false)
    const [accountTab, setAccountTab] = useState<'filtered' | 'all'>('filtered')

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            receiver_name: item.receiver_name || '',
            amount: item.amount || 0,
            note: item.note || '',
            bank_code: '', // We derive this below if possible
            bank_name: item.bank_name || '',
            bank_number: item.bank_number || '',
            card_name: item.card_name || '',
            target_account_id: item.target_account_id || 'none',
        },
    })

    // Initialize values when item changes
    useEffect(() => {
        if (open) {
            let initialBankCode = ''
            if (item.bank_name && bankMappings.length > 0) {
                const mapping = bankMappings.find(b => b.bank_name === item.bank_name || b.short_name === item.bank_name)
                if (mapping) initialBankCode = mapping.bank_code
            }

            form.reset({
                receiver_name: item.receiver_name || '',
                amount: item.amount || 0,
                note: item.note || '',
                bank_name: item.bank_name || '',
                bank_number: item.bank_number || '',
                card_name: item.card_name || '',
                target_account_id: item.target_account_id || 'none',
                bank_code: initialBankCode,
            })
        }
    }, [open, item, bankMappings, form])

    const bankCode = form.watch('bank_code')
    const bankName = form.watch('bank_name')
    const targetAccountId = form.watch('target_account_id')

    // Helper: Logic to generate signature
    const generateSignature = (targetName: string, bankShortName: string) => {
        const date = new Date()
        const month = date.toLocaleString('en-US', { month: 'short' })
        const year = date.getFullYear().toString().slice(-2)

        if (targetName) {
            return `${targetName} ${month}${year}`
        }
        if (bankShortName) {
            return `${bankShortName} ${month}${year}`
        }
        return ''
    }

    // HANDLER: Target Account Change
    const handleAccountChange = (val: string) => {
        form.setValue('target_account_id', val)

        if (val && val !== 'none') {
            const target = accounts.find(a => a.id === val)
            if (target) {
                // 1. Set Details
                if (target.receiver_name) form.setValue('receiver_name', target.receiver_name)
                if (target.account_number) form.setValue('bank_number', target.account_number)

                // 2. Set Card Name & Note (Target Name priority)
                const signature = generateSignature(target.name, '')
                form.setValue('card_name', target.name)
                form.setValue('note', signature)
            }
        }
        // If 'none', we do nothing (preserve manual edits)
    }

    // HANDLER: Bank Code Change (MBB)
    const handleBankCodeChange = (code: string | undefined) => {
        if (!code) return
        form.setValue('bank_code', code)

        const mapping = bankMappings.find(b => b.bank_code === code)
        if (mapping) {
            form.setValue('bank_name', mapping.short_name)

            // Only auto-fill signature if NO target account selected
            const currentTarget = form.getValues('target_account_id')
            if (!currentTarget || currentTarget === 'none') {
                const signature = generateSignature('', mapping.short_name)
                form.setValue('card_name', signature)
                form.setValue('note', signature)
            }
        }
    }

    // HANDLER: Bank Name Change (VIB/MBB)
    const handleBankNameChange = (name: string | undefined) => {
        if (!name) return
        form.setValue('bank_name', name)

        // Try to sync code
        const mapping = bankMappings.find(b => b.short_name === name)
        if (mapping) {
            form.setValue('bank_code', mapping.bank_code)
        }
    }

    const allAccountItems = useMemo(() => [
        { value: 'none', label: 'None', description: 'Manual entry' },
        ...accounts
            .filter((a: any) => a.type !== 'debt' && a.type !== 'loan' && a.type !== 'savings')
            .map((a: any) => ({
                value: a.id,
                label: a.name,
                description: a.account_number || 'No account number',
                icon: a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt="" className="h-6 w-6 rounded-none object-contain" />
                ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-none bg-slate-200 text-[10px] font-semibold text-slate-700">
                        {a.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                ),
            }))
    ], [accounts])

    const filteredAccountItems = useMemo(() => [
        { value: 'none', label: 'None', description: 'Manual entry' },
        ...accounts
            .filter((a: any) => {
                if (a.type === 'debt' || a.type === 'loan' || a.type === 'savings') return false
                if (!bankName && !bankCode) return true

                const searchTerms = new Set<string>()
                if (bankName) searchTerms.add(bankName.toLowerCase())
                if (bankCode) searchTerms.add(bankCode.toLowerCase())

                const mapping = bankMappings.find(b => b.bank_code === bankCode || b.short_name === bankName)
                if (mapping?.short_name) searchTerms.add(mapping.short_name.toLowerCase())
                if (mapping?.bank_code) searchTerms.add(mapping.bank_code.toLowerCase())

                const accountName = (a.name || '').toLowerCase()
                const accountNumber = (a.account_number || '').toLowerCase()

                return Array.from(searchTerms).some(term => {
                    if (term.length < 2) return false
                    return accountName.includes(term) || accountNumber.includes(term)
                })
            })
            .map((a: any) => ({
                value: a.id,
                label: a.name,
                description: a.account_number || 'No account number',
                icon: a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt="" className="h-6 w-6 rounded-none object-contain" />
                ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-none bg-slate-200 text-[10px] font-semibold text-slate-700">
                        {a.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                ),
            }))
    ], [accounts, bankCode, bankMappings, bankName])

    async function onSubmit(values: FormValues) {
        try {
            await updateBatchItemAction(item.id, {
                receiver_name: values.receiver_name,
                amount: values.amount,
                note: values.note,
                bank_name: values.bank_name,
                bank_number: values.bank_number,
                card_name: values.card_name,
                target_account_id: values.target_account_id === 'none' ? null : values.target_account_id
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
                    <DialogTitle>Edit Batch Item ({bankType})</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                            {bankType === 'VIB' ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="bank_code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-600">Bank Code</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        items={bankMappings.map(b => ({
                                                            value: b.bank_code,
                                                            label: b.bank_code,
                                                            description: b.bank_name,
                                                            searchValue: `${b.bank_code} ${b.bank_name}`
                                                        }))}
                                                        value={field.value}
                                                        onValueChange={(val) => handleBankCodeChange(val)}
                                                        placeholder="Select bank"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bank_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-600">Bank Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g., VCB"
                                                        {...field}
                                                        disabled={!!bankCode}
                                                        className={bankCode ? 'bg-slate-50 text-slate-500' : ''}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="bank_name"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel className="text-xs font-semibold text-slate-600">Bank Name</FormLabel>
                                            <FormControl>
                                                <Combobox
                                                    items={(() => {
                                                        const seen = new Set()
                                                        return bankMappings
                                                            .filter(b => {
                                                                if (!b.short_name) return false
                                                                const duplicate = seen.has(b.short_name)
                                                                seen.add(b.short_name)
                                                                return !duplicate
                                                            })
                                                            .map(b => ({
                                                                value: b.short_name,
                                                                label: `${b.short_name} (${b.bank_code})`,
                                                                description: b.bank_name,
                                                                searchValue: `${b.short_name} ${b.bank_name} ${b.bank_code}`
                                                            }))
                                                    })()}
                                                    value={field.value}
                                                    onValueChange={(val) => {
                                                        // MBB: Selecting Bank Name needs to trigger Code + Signature Logic
                                                        const found = bankMappings.find(b => b.short_name === val)
                                                        if (found) {
                                                            handleBankCodeChange(found.bank_code)
                                                        } else {
                                                            handleBankNameChange(val)
                                                        }
                                                    }}
                                                    placeholder="Select bank"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-4 shadow-sm">
                            <FormField
                                control={form.control}
                                name="target_account_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Target Internal Account
                                        </FormLabel>
                                        <FormControl>
                                            <Combobox
                                                items={accountTab === 'filtered' ? filteredAccountItems : allAccountItems}
                                                tabs={[
                                                    { value: 'filtered', label: `Filtered (${filteredAccountItems.length - 1})`, active: accountTab === 'filtered', onClick: () => setAccountTab('filtered') },
                                                    { value: 'all', label: `All (${allAccountItems.length - 1})`, active: accountTab === 'all', onClick: () => setAccountTab('all') }
                                                ]}
                                                value={field.value || 'none'}
                                                onValueChange={(val) => handleAccountChange(val ?? 'none')}
                                                placeholder="Select internal account"
                                                className="bg-white border-blue-100 ring-2 ring-blue-50/50"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {(!targetAccountId || targetAccountId === 'none') && (
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-2 rounded-lg">
                                    <Info className="h-4 w-4 text-blue-500 shrink-0" />
                                    <p className="text-[10px] text-blue-700">
                                        Tip: Select a Target Account above to auto-fill Bank Number and Receiver Name.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="bank_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Bank Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 123456" {...field} className="font-mono" />
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
                                        <FormLabel className="text-xs font-semibold text-slate-600">Receiver Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="card_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600">Card Name (Optional)</FormLabel>
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
                                        <FormLabel className="text-xs font-semibold text-slate-600">Amount (VND)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="0"
                                                className="font-bold text-blue-600"
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
                        </div>

                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-slate-600">Note</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Note" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">Save Changes</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
