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
import { Select } from '@/components/ui/select' // Keep Select if used elsewhere, or remove if not
import { Combobox } from '@/components/ui/combobox'
import { addBatchItemAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'


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


export function AddItemDialog({ batchId, batchName, accounts }: { batchId: string, batchName: string, accounts: any[] }) {
    const [open, setOpen] = useState(false)
    const [bankMappings, setBankMappings] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
    const [duplicateInfo, setDuplicateInfo] = useState<any>(null)
    const [recentBanks, setRecentBanks] = useState<string[]>([])

    useEffect(() => {
        const stored = localStorage.getItem('recent_bank_codes')
        if (stored) {
            try {
                setRecentBanks(JSON.parse(stored))
            } catch (e) {
                console.error('Failed to parse recent banks', e)
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
            receiver_name: 'NGUYEN THANH NAM',
            target_account_id: '',
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

    // Auto-fill card name from target account (take everything after the first token)
    useEffect(() => {
        if (!targetAccountId || targetAccountId === 'none') return
        const target = accounts.find(a => a.id === targetAccountId)
        if (!target?.name) return

        const parts = target.name.split(/[\s-]+/).filter(Boolean)
        if (parts.length < 2) return

        const inferredCardName = parts.slice(1).join(' ').trim()
        const currentCardName = form.getValues('card_name')?.trim()
        if (!currentCardName || currentCardName === '' || currentCardName === inferredCardName) {
            form.setValue('card_name', inferredCardName)
        }
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

    // Smart Note Logic
    useEffect(() => {
        if (bankName) {
            const parts = bankName.split('-')
            // Take the part BEFORE the dash (e.g., "VCB" from "VCB - Ngoại Thương")
            const shortBank = parts[0].trim()

            // Extract Tag from Batch Name (assuming format "CKL TAG")
            const batchParts = batchName.split(' ')
            const tag = batchParts.length > 1 ? batchParts[batchParts.length - 1] : ''

            // Construct note: BankName [CardName] MMMYY
            let noteValue = shortBank
            if (cardName && cardName.trim()) {
                noteValue += ` ${cardName.trim()}`
            }
            if (tag) {
                noteValue += ` ${tag}`
            }

            if (noteValue.trim()) {
                form.setValue('note', noteValue)
            }
        }
    }, [bankName, cardName, batchName, form])

    // Note: Receiver name is kept as default "NGUYEN THANH NAM" and not auto-filled from account

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
            receiver_name: 'NGUYEN THANH NAM',
            target_account_id: '',
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
                        <DialogTitle>Add Batch Item</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="bank_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bank Code</FormLabel>
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
                                            <FormLabel>Bank Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., VCB"
                                                    {...field}
                                                    disabled={!!bankCode}
                                                    className={bankCode ? 'bg-gray-100' : ''}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="bank_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bank Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 123456" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="target_account_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Account (Optional)</FormLabel>
                                        <FormControl>
                                            <Select
                                                items={[
                                                    { value: 'none', label: 'None' },
                                                    ...accounts.map(a => ({ value: a.id, label: a.name }))
                                                ]}
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
                                name="receiver_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Receiver Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="card_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Card Name (Optional)</FormLabel>
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
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="0"
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
                            <FormField
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Note</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Note" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit">Add</Button>
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
