'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Loader2, Plus, Check, ChevronsUpDown } from 'lucide-react'

interface BankItem {
    id: string
    bank_name: string
    bank_code: string
    amount: number
    details?: string
}

interface QuickEntryModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sourceBatchId: string
    newMonthName: string
    bankType: 'MBB' | 'VIB'
    bankMappings?: any[]
    onSubmit?: (amounts: Record<string, { amount: number; skip: boolean }>) => void
}

export function QuickEntryModal({
    open,
    onOpenChange,
    sourceBatchId,
    newMonthName,
    bankType,
    bankMappings = [],
    onSubmit
}: QuickEntryModalProps) {
    const [loading, setLoading] = useState(true)
    const [sourceItems, setSourceItems] = useState<BankItem[]>([])
    const [amounts, setAmounts] = useState<Record<string, number>>({})
    const [skipped, setSkipped] = useState<Record<string, boolean>>({})

    // Fetch source batch items
    useEffect(() => {
        if (open && sourceBatchId) {
            loadSourceItems()
        }
    }, [open, sourceBatchId])

    const loadSourceItems = async () => {
        setLoading(true)
        try {
            const { getBatchItemsAction } = await import('@/actions/batch-create.actions')
            const response = await getBatchItemsAction(sourceBatchId)

            if (response.success && response.data) {
                setSourceItems(response.data as BankItem[])

                // Pre-fill amounts from source
                const initialAmounts: Record<string, number> = {}
                    ; (response.data as BankItem[]).forEach((item: BankItem) => {
                        initialAmounts[item.bank_code] = item.amount
                    })
                setAmounts(initialAmounts)
            } else {
                console.error('Failed to load items:', response.error)
            }
        } catch (error) {
            console.error('Failed to load source items:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value)
    }

    const handleAmountChange = (bankCode: string, value: string) => {
        const numValue = parseInt(value.replace(/\D/g, ''), 10) || 0
        setAmounts(prev => ({ ...prev, [bankCode]: numValue }))
    }

    const handleSkipToggle = (bankCode: string, checked: boolean) => {
        setSkipped(prev => ({ ...prev, [bankCode]: checked }))
    }

    const handleAddBank = (bankCode: string) => {
        const bankMapping = bankMappings.find(b => b.bank_code === bankCode)
        if (!bankMapping) return

        // Check if already exists
        if (sourceItems.some(item => item.bank_code === bankCode)) {
            return
        }

        const newItem: BankItem = {
            id: `new-${Date.now()}`,
            bank_name: bankMapping.short_name || bankMapping.name,
            bank_code: bankMapping.bank_code,
            amount: 0
        }

        setSourceItems(prev => [...prev, newItem])
        setAmounts(prev => ({ ...prev, [bankCode]: 0 }))
    }

    const handleSubmit = () => {
        const result: Record<string, { amount: number; skip: boolean }> = {}
        sourceItems.forEach(item => {
            result[item.bank_code] = {
                amount: amounts[item.bank_code] || 0,
                skip: skipped[item.bank_code] || false
            }
        })
        onSubmit?.(result)
        onOpenChange(false)
    }

    const totalAmount = Object.entries(amounts)
        .filter(([code]) => !skipped[code])
        .reduce((sum, [_, amount]) => sum + amount, 0)


    // Filter available banks to add (not already in list) AND deduplicate
    const availableBanks = bankMappings
        .filter(mapping => !sourceItems.some(item => item.bank_code === mapping.bank_code))
        .filter((bank, index, self) =>
            index === self.findIndex((b) => b.bank_code === bank.bank_code)
        )
        .sort((a, b) => (a.short_name || a.name).localeCompare(b.short_name || b.name))

    const popularCodes = ['VCB', 'TCB', 'MB', 'ACB', 'BIDV', 'ICB', 'VPB', 'TPB', 'STB', 'HDB']
    const popularBanks = availableBanks.filter(b => popularCodes.includes(b.bank_code))
    const otherBanks = availableBanks.filter(b => !popularCodes.includes(b.bank_code))
    const [openCombobox, setOpenCombobox] = useState(false)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quick Entry - {newMonthName} ({bankType})</DialogTitle>
                    <DialogDescription>
                        Enter amounts for each bank. Values are pre-filled from the previous month.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        {sourceItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                <div className="flex-1">
                                    <Label htmlFor={`amount-${item.bank_code}`} className="font-semibold text-slate-900">
                                        {item.bank_name}
                                        <span className="text-slate-500 font-normal ml-2">({item.bank_code})</span>
                                    </Label>
                                    <Input
                                        id={`amount-${item.bank_code}`}
                                        type="text"
                                        value={formatCurrency(amounts[item.bank_code] || 0)}
                                        onChange={(e) => handleAmountChange(item.bank_code, e.target.value)}
                                        disabled={skipped[item.bank_code]}
                                        placeholder="0"
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                    <Checkbox
                                        id={`skip-${item.bank_code}`}
                                        checked={skipped[item.bank_code] || false}
                                        onCheckedChange={(checked) => handleSkipToggle(item.bank_code, checked as boolean)}
                                    />
                                    <Label
                                        htmlFor={`skip-${item.bank_code}`}
                                        className="text-sm text-slate-600 cursor-pointer"
                                    >
                                        Skip
                                    </Label>
                                </div>
                            </div>
                        ))}

                        {/* Add Bank Dropdown (Searchable) */}
                        {availableBanks.length > 0 && (
                            <div className="pt-2">
                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox}
                                            className="w-full justify-between border-dashed border-2 bg-slate-50 hover:bg-slate-100 text-slate-600"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Plus className="h-4 w-4" />
                                                Add another bank...
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search bank..." />
                                            <CommandList>
                                                <CommandEmpty>No bank found.</CommandEmpty>
                                                {popularBanks.length > 0 && (
                                                    <CommandGroup heading="Popular / Recent">
                                                        {popularBanks.map((bank) => (
                                                            <CommandItem
                                                                key={bank.bank_code}
                                                                value={`${bank.short_name || bank.name} ${bank.bank_code}`}
                                                                onSelect={() => {
                                                                    handleAddBank(bank.bank_code)
                                                                    setOpenCombobox(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        sourceItems.some(i => i.bank_code === bank.bank_code)
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                {bank.short_name || bank.name} ({bank.bank_code})
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                )}
                                                <CommandGroup heading="All Banks">
                                                    {otherBanks.map((bank) => (
                                                        <CommandItem
                                                            key={bank.bank_code}
                                                            value={`${bank.short_name || bank.name} ${bank.bank_code}`}
                                                            onSelect={() => {
                                                                handleAddBank(bank.bank_code)
                                                                setOpenCombobox(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    sourceItems.some(i => i.bank_code === bank.bank_code)
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {bank.short_name || bank.name} ({bank.bank_code})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        {/* Total */}
                        <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between items-center text-lg font-semibold">
                                <span>Total Amount:</span>
                                <span className="text-indigo-600">{formatCurrency(totalAmount)} ₫</span>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        Create Batch
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
