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
import { Combobox } from '@/components/ui/combobox'
import { addBatchItemAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Info, Edit, Plus } from 'lucide-react'
import { EditAccountDialog } from '@/components/moneyflow/edit-account-dialog'
import { CreateAccountDialog } from '@/components/moneyflow/create-account-dialog'


const formSchema = z.object({
    receiver_name: z.string().optional(),
    target_account_id: z.string().optional(),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    note: z.string().optional(),
    bank_code: z.string().optional(),
    bank_name: z.string().optional(),
    bank_number: z.string().optional(),
    card_name: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>


export function AddItemDialog({ batchId, batchName, accounts, bankType = 'VIB' }: { batchId: string, batchName: string, accounts: any[], bankType?: 'VIB' | 'MBB' }) {
    const [open, setOpen] = useState(false)
    const [bankMappings, setBankMappings] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
    const [duplicateInfo, setDuplicateInfo] = useState<any>(null)
    const [recentBanks, setRecentBanks] = useState<string[]>([])
    const [managedAccounts, setManagedAccounts] = useState<{ name: string; receiverName: string; bankNumber: string }[]>([])
    const [accountTab, setAccountTab] = useState<'filtered' | 'all'>('filtered')

    useEffect(() => {
        const stored = localStorage.getItem('recent_bank_codes')
        if (stored) {
            try {
                setRecentBanks(JSON.parse(stored))
            } catch (e) {
                console.error('Failed to parse recent banks', e)
            }
        }
        const managedStored = localStorage.getItem('batch_managed_accounts')
        if (managedStored) {
            try {
                const parsed = JSON.parse(managedStored)
                setManagedAccounts(Array.isArray(parsed) ? parsed.map((m: any) => ({
                    name: m.name,
                    receiverName: m.receiverName ?? m.name,
                    bankNumber: m.bankNumber ?? '',
                })) : [])
            } catch (error) {
                console.error('Failed to parse managed accounts', error)
            }
        }
    }, [])

    const updateRecentBanks = (code: string) => {
        if (!code) return
        const newRecent = [code, ...recentBanks.filter(c => c !== code)].slice(0, 5)
        setRecentBanks(newRecent)
        localStorage.setItem('recent_bank_codes', JSON.stringify(newRecent))
    }


    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            receiver_name: '',
            target_account_id: 'none',
            amount: 0,
            note: '',
            bank_code: '',
            bank_name: '',
            bank_number: '',
            card_name: '',
        },
    })

    // Fetch bank mappings on mount
    useEffect(() => {
        async function fetchBanks() {
            try {
                const response = await fetch('/api/banks')
                if (response.ok) {
                    const data = await response.json()
                    setBankMappings(data)
                }
            } catch (error) {
                console.error('Failed to fetch banks:', error)
            }
        }
        fetchBanks()
    }, [])

    const bankCode = form.watch('bank_code')
    const bankName = form.watch('bank_name')
    const cardName = form.watch('card_name')
    const targetAccountId = form.watch('target_account_id')
    const bankNumber = form.watch('bank_number')

    const allAccountItems = [
        { value: 'none', label: 'None', description: 'Manual entry' },
        ...accounts.map((a: any) => ({
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
    ]

    const filteredAccountItems = [
        { value: 'none', label: 'None', description: 'Manual entry' },
        ...accounts
            .filter((a: any) => {
                if (!bankName && !bankCode) return true

                const searchTerms = new Set<string>()
                if (bankName) searchTerms.add(bankName.toLowerCase())
                if (bankCode) searchTerms.add(bankCode.toLowerCase())

                // Add short name if available
                const mapping = bankMappings.find(b => b.bank_code === bankCode || b.short_name === bankName)
                if (mapping?.short_name) searchTerms.add(mapping.short_name.toLowerCase())
                if (mapping?.bank_code) searchTerms.add(mapping.bank_code.toLowerCase())

                const accountName = (a.name || '').toLowerCase()
                const accountNumber = (a.account_number || '').toLowerCase()

                return Array.from(searchTerms).some(term => {
                    if (term.length < 2) return false // Avoid too broad matches
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
    ]

    const bankNumberOptions = managedAccounts
        .filter(acc => acc.bankNumber)
        .map(acc => ({
            value: acc.bankNumber,
            label: acc.bankNumber,
            description: acc.receiverName || acc.name,
        }))

    // Auto-fill card name from target account (take everything after the first token)
    useEffect(() => {
        if (!targetAccountId || targetAccountId === 'none') {
            form.setValue('card_name', '')
            return
        }
        const target = accounts.find(a => a.id === targetAccountId)
        if (!target?.name) return

        const parts = target.name.split(/[\s-]+/).filter(Boolean)
        // If it's a single word like "Cash", don't infer card name, or just use it.
        // User example: "Vietcombank Diamond World" -> "Diamond World"
        const inferredCardName = parts.length > 1 ? parts.slice(1).join(' ').trim() : ''

        form.setValue('card_name', inferredCardName)
    }, [accounts, form, targetAccountId])

    // Auto-fill bank name when bank code is selected
    useEffect(() => {
        if (bankCode && bankMappings.length > 0) {
            const selectedBank = bankMappings.find(b => b.bank_code === bankCode)
            if (selectedBank) {
                form.setValue('bank_name', selectedBank.short_name)
            }
        }
    }, [bankCode, bankMappings, form])

    // Sync receiver name / bank number from selected account
    useEffect(() => {
        if (!targetAccountId || targetAccountId === 'none') {
            return
        }
        const target = accounts.find(a => a.id === targetAccountId)
        if (target) {
            form.setValue('receiver_name', target.receiver_name || target.name || '')
            if (target.account_number) {
                form.setValue('bank_number', target.account_number)
            }
        }
    }, [accounts, form, targetAccountId])

    // Sync receiver/bank number from managed accounts dropdown
    useEffect(() => {
        if (!bankNumber) return
        const managed = managedAccounts.find(acc => acc.bankNumber === bankNumber)
        if (managed) {
            form.setValue('receiver_name', managed.receiverName || managed.name)
        }
    }, [bankNumber, managedAccounts, form])

    // Smart Note Logic
    useEffect(() => {
        const fullBankMapping = bankMappings.find(b => b.bank_code === bankCode || b.short_name === bankName)
        const bankPart = fullBankMapping ? fullBankMapping.short_name : (bankName ? bankName.split('-')[0].trim() : '')

        const batchParts = batchName.split(' ')
        const tag = batchParts.length > 1 ? batchParts[batchParts.length - 1] : ''

        let noteValue = bankPart
        if (cardName && cardName.trim()) {
            noteValue += ` ${cardName.trim()}`
        }

        const managed = managedAccounts.find(acc => acc.bankNumber === bankNumber)
        const receiver = managed?.receiverName || managed?.name || form.getValues('receiver_name')

        if (receiver) {
            noteValue = noteValue ? `${noteValue} ${receiver}` : receiver
        }

        if (tag && !noteValue.includes(tag)) {
            noteValue += ` ${tag}`
        }

        if (noteValue.trim()) {
            form.setValue('note', noteValue.trim())
        }
    }, [bankName, bankCode, cardName, batchName, form, managedAccounts, bankNumber, bankMappings])

    async function onSubmit(values: FormValues) {
        try {
            const targetAccountId = values.target_account_id === 'none' ? null : values.target_account_id

            // Check for duplicates if we have bank_number, bank_name, and card_name
            if (values.bank_number && values.bank_name) {
                const response = await fetch(`/api/batch/${batchId}/check-duplicate?` + new URLSearchParams({
                    bank_number: values.bank_number,
                    bank_name: values.bank_name || '',
                    card_name: values.card_name || ''
                }))

                if (response.ok) {
                    const { hasDuplicate, confirmedItem } = await response.json()
                    if (hasDuplicate && confirmedItem) {
                        // Show custom confirm dialog instead of native confirm
                        setDuplicateInfo(confirmedItem)
                        setShowDuplicateDialog(true)
                        return // Will continue after user confirms
                    }
                }
            }

            // Actually add the item
            await performAdd(values)
        } catch (error) {
            console.error(error)
            toast.error('Failed to add item')
        }
    }

    async function performAdd(values: FormValues) {
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
            receiver_name: '',
            target_account_id: 'none',
            amount: 0,
            note: '',
            bank_code: '',
            bank_name: '',
            bank_number: '',
            card_name: '',
        })
        toast.success('Item added successfully')
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value)
    }

    const parseCurrency = (value: string) => {
        return parseInt(value.replace(/\./g, ''), 10) || 0
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>

                <DialogTrigger asChild>
                    <Button variant="outline">Add Item</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Batch Item ({bankType})</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-4 shadow-sm">
                                <FormField
                                    control={form.control}
                                    name="target_account_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    1. Target Internal Account
                                                </FormLabel>
                                                <div className="flex items-center gap-2">
                                                    {field.value && field.value !== 'none' && (
                                                        <EditAccountDialog
                                                            account={accounts.find(a => a.id === field.value)}
                                                            triggerContent={
                                                                <span className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                                                                    <Edit className="h-3 w-3" /> Edit Info
                                                                </span>
                                                            }
                                                        />
                                                    )}
                                                    <CreateAccountDialog
                                                        trigger={
                                                            <span className="text-[10px] text-green-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                                                                <Plus className="h-3 w-3" /> New Account
                                                            </span>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <FormControl>
                                                <Combobox
                                                    items={accountTab === 'filtered' ? filteredAccountItems : allAccountItems}
                                                    tabs={[
                                                        { value: 'filtered', label: `Filtered (${filteredAccountItems.length - 1})`, active: accountTab === 'filtered', onClick: () => setAccountTab('filtered') },
                                                        { value: 'all', label: `All (${allAccountItems.length - 1})`, active: accountTab === 'all', onClick: () => setAccountTab('all') }
                                                    ]}
                                                    value={field.value || 'none'}
                                                    onValueChange={(val) => field.onChange(val ?? 'none')}
                                                    placeholder="Select internal account to pull info"
                                                    inputPlaceholder="Search accounts..."
                                                    emptyState="No account found"
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

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
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
                                                            items={(() => {
                                                                const sorted = [...bankMappings].sort((a, b) => {
                                                                    const indexA = recentBanks.indexOf(a.bank_code)
                                                                    const indexB = recentBanks.indexOf(b.bank_code)
                                                                    if (indexA !== -1 && indexB !== -1) return indexA - indexB
                                                                    if (indexA !== -1) return -1
                                                                    if (indexB !== -1) return 1
                                                                    return 0
                                                                })
                                                                return sorted.map(b => ({
                                                                    value: b.bank_code,
                                                                    label: b.bank_code,
                                                                    description: b.bank_name,
                                                                    searchValue: `${b.bank_code} ${b.bank_name} ${b.short_name}`
                                                                }))
                                                            })()}
                                                            value={field.value}
                                                            onValueChange={(val) => {
                                                                field.onChange(val)
                                                                if (val) updateRecentBanks(val)
                                                            }}
                                                            placeholder="Select bank"
                                                            inputPlaceholder="Search bank..."
                                                            emptyState="No banks found"
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
                                                                    label: b.short_name,
                                                                    description: b.bank_name,
                                                                    searchValue: `${b.short_name} ${b.bank_name}`
                                                                }))
                                                        })()}
                                                        value={field.value}
                                                        onValueChange={(val) => {
                                                            field.onChange(val)
                                                            const found = bankMappings.find(b => b.short_name === val)
                                                            if (found) {
                                                                form.setValue('bank_code', found.bank_code)
                                                                updateRecentBanks(found.bank_code)
                                                            }
                                                        }}
                                                        placeholder="Select bank"
                                                        inputPlaceholder="Search bank..."
                                                        emptyState="No banks found"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
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
                                                <div className="space-y-2">
                                                    <Input
                                                        placeholder="Account number"
                                                        {...field}
                                                        className="font-mono"
                                                    />
                                                    {bankNumberOptions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {bankNumberOptions.slice(0, 3).map(opt => (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => field.onChange(opt.value)}
                                                                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200"
                                                                >
                                                                    {opt.value}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
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
                                                <Input
                                                    placeholder="Recipient name"
                                                    {...field}
                                                    className={targetAccountId && targetAccountId !== 'none' ? 'bg-slate-50 text-slate-500' : ''}
                                                />
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
                                                <Input placeholder="e.g., Diamond, Platinum" {...field} />
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
                                            <Input placeholder="Transaction note" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-bold shadow-lg shadow-blue-200">
                                Add to Batch
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDuplicateDialog}
                onOpenChange={setShowDuplicateDialog}
                title="Duplicate Item Detected"
                description={duplicateInfo ?
                    `Item tương tự đã được confirm trước đó:\n` +
                    `- Tên: ${duplicateInfo.receiver_name}\n` +
                    `- STK: ${duplicateInfo.bank_number}\n` +
                    `- Số tiền: ${duplicateInfo.amount?.toLocaleString('vi-VN')}\n\n` +
                    `Bạn có chắc muốn tạo item mới không?`
                    : ''
                }
                onConfirm={async () => {
                    await performAdd(form.getValues())
                }}
                confirmText="Tạo mới"
                cancelText="Hủy"
                variant="default"
            />
        </>
    )
}
