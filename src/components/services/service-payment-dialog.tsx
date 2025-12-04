'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getAccountsAction } from '@/actions/account-actions'
import { Loader2, CreditCard, Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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

interface ServicePaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    service: any
    onConfirm: (accountId: string, amount: number, date: string) => Promise<void>
}

export function ServicePaymentDialog({ open, onOpenChange, service, onConfirm }: ServicePaymentDialogProps) {
    const [accounts, setAccounts] = useState<any[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string>('')
    const [amount, setAmount] = useState<number>(service.price || 0)
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)
    const [fetchingAccounts, setFetchingAccounts] = useState(false)
    const [comboboxOpen, setComboboxOpen] = useState(false)

    useEffect(() => {
        if (open) {
            fetchAccounts()
            setAmount(service.price || 0)
            setDate(new Date().toISOString().split('T')[0])
        }
    }, [open, service])

    async function fetchAccounts() {
        setFetchingAccounts(true)
        try {
            const data = await getAccountsAction()
            console.log('ServicePaymentDialog: fetched accounts', data)
            if (data) {
                const validTypes = ['bank', 'credit_card', 'ewallet']
                const filtered = data.filter((acc: any) => validTypes.includes(acc.type))
                console.log('ServicePaymentDialog: filtered accounts', filtered)
                setAccounts(filtered)
            }
        } catch (error) {
            console.error('Failed to fetch accounts:', error)
            toast.error('Failed to load accounts')
        } finally {
            setFetchingAccounts(false)
        }
    }

    async function handleConfirm() {
        if (!selectedAccountId || !amount) return
        setLoading(true)
        try {
            await onConfirm(selectedAccountId, amount, date)
            onOpenChange(false)
            toast.success('Payment confirmed successfully!')
        } catch (error) {
            console.error('Failed to confirm:', error)
            toast.error('Failed to confirm payment')
        } finally {
            setLoading(false)
        }
    }

    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirm Service Payment</DialogTitle>
                    <DialogDescription>
                        Record the actual payment from your bank account to cover this service cost.
                        This will replenish the Draft Fund.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="account">Payment Source (Real Bank)</Label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    className="w-full justify-between"
                                    onClick={() => console.log('Dropdown clicked. Accounts:', accounts)}
                                // disabled={loading || fetchingAccounts || accounts.length === 0} // User requested to enable for debugging
                                >
                                    {selectedAccountId ? (
                                        <div className="flex items-center gap-2">
                                            {selectedAccount?.logo_url ? (
                                                <img
                                                    src={selectedAccount.logo_url}
                                                    alt={selectedAccount.name}
                                                    className="h-4 w-4 object-contain"
                                                />
                                            ) : (
                                                <CreditCard className="h-4 w-4" />
                                            )}
                                            <span>{selectedAccount?.name}</span>
                                            {selectedAccount?.bank_name && (
                                                <span className="text-muted-foreground text-xs ml-1">
                                                    ({selectedAccount.bank_name})
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        fetchingAccounts ? "Loading accounts..." : (accounts.length === 0 ? "No accounts found" : "Select an account")
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search account..." />
                                    <CommandList>
                                        <CommandEmpty>No account found.</CommandEmpty>
                                        <CommandGroup>
                                            {accounts.map((account) => (
                                                <CommandItem
                                                    key={account.id}
                                                    value={account.name} // Search by name
                                                    onSelect={() => {
                                                        setSelectedAccountId(account.id === selectedAccountId ? "" : account.id)
                                                        setComboboxOpen(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedAccountId === account.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        {account.logo_url ? (
                                                            <img
                                                                src={account.logo_url}
                                                                alt={account.name}
                                                                className="h-5 w-5 object-contain"
                                                            />
                                                        ) : (
                                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span>{account.name}</span>
                                                            {account.bank_name && (
                                                                <span className="text-xs text-muted-foreground">{account.bank_name}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            disabled={loading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedAccountId || !amount || loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CreditCard className="mr-2 h-4 w-4" />
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
