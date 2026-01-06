'use client'

import { useState, useMemo } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { allocateDebtRepayment } from '@/lib/debt-allocation'
import { repayBatchDebt } from '@/actions/debt-actions'
import { Account, Person } from '@/types/moneyflow.types'
import { toast } from 'sonner'
import { Loader2, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RepayDebtDialogProps {
    person: Person
    accounts: Account[]
    trigger?: React.ReactNode
    onSuccess?: () => void
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function RepayDebtDialog({
    person,
    accounts,
    trigger,
    onSuccess,
    isOpen: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: RepayDebtDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen

    const [amountStr, setAmountStr] = useState('')
    const [selectedAccountId, setSelectedAccountId] = useState<string>('')
    const [note, setNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filter valid accounts (Bank/Cash/Wallet)
    const validAccounts = useMemo(() => {
        return accounts.filter(a => ['bank', 'cash', 'ewallet'].includes(a.type))
    }, [accounts])

    // Calculation Logic
    const totalAmount = parseFloat(amountStr) || 0
    const debts = person.monthly_debts || []

    // Sort debts for display (matches allocation logic sorting inside helper, but we sort here for UI)
    const displayDebts = useMemo(() => {
        return [...debts]
            .filter(d => d.amount > 0)
            .sort((a, b) => a.tagLabel.localeCompare(b.tagLabel))
    }, [debts])

    const allocationMap = useMemo(() => {
        return allocateDebtRepayment(totalAmount, debts)
    }, [totalAmount, debts])

    const totalAllocated = Array.from(allocationMap.values()).reduce((a, b) => a + b, 0)
    const remainingUnused = Math.max(0, totalAmount - totalAllocated)

    const handleSubmit = async () => {
        if (!selectedAccountId) {
            toast.error("Please select a payment account")
            return
        }
        if (totalAmount <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        setIsSubmitting(true)
        try {
            const allocationObj = Object.fromEntries(allocationMap)

            const result = await repayBatchDebt(
                person.id,
                totalAmount,
                selectedAccountId,
                allocationObj,
                note
            )

            if (result.success) {
                toast.success("Repayment processed successfully")
                if (setOpen) setOpen(false)
                setAmountStr('')
                setNote('')
                if (onSuccess) onSuccess()
            } else {
                toast.error(`Repayment failed: ${result.error}`)
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Auto-select first valid account
    useMemo(() => {
        if (!selectedAccountId && validAccounts.length > 0) {
            setSelectedAccountId(validAccounts[0].id)
        }
    }, [validAccounts, selectedAccountId])

    const accountOptions = useMemo(() => {
        return validAccounts.map(acc => ({
            value: acc.id,
            label: acc.name,
            description: `Balance: ${numberFormatter.format(acc.current_balance)}`,
            icon: acc.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={acc.image_url} alt="" className="w-4 h-4 rounded-full" />
            ) : undefined
        }))
    }, [validAccounts])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-500" />
                        Repay Debt: {person.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Input Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Repayment Amount</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={amountStr}
                                onChange={(e) => setAmountStr(e.target.value)}
                                className="text-lg font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Pay From (Account)</Label>
                            <Combobox
                                items={accountOptions}
                                value={selectedAccountId}
                                onValueChange={(val) => setSelectedAccountId(val || '')}
                                placeholder="Select Account"
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Note (Optional)</Label>
                        <Textarea
                            placeholder="e.g. Returned borrowed money"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Allocation Preview Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-slate-700">Allocation Preview</h3>
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded",
                                remainingUnused > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                                Allocated: {numberFormatter.format(totalAllocated)} / {numberFormatter.format(totalAmount)}
                            </span>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr className="text-left text-xs font-medium text-slate-500">
                                        <th className="px-4 py-2">Cycle</th>
                                        <th className="px-4 py-2 text-right">Owed</th>
                                        <th className="px-4 py-2 text-right">Allocated</th>
                                        <th className="px-4 py-2 text-right">New Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {displayDebts.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                No outstanding debts found.
                                            </td>
                                        </tr>
                                    ) : (
                                        displayDebts.map((debt) => {
                                            const allocated = allocationMap.get(debt.tagLabel) || 0
                                            const newBalance = debt.amount - allocated
                                            const isFullyPaid = newBalance <= 0

                                            // Highlight row if allocated
                                            const isActive = allocated > 0

                                            return (
                                                <tr key={debt.tagLabel} className={cn(
                                                    "transition-colors",
                                                    isActive ? "bg-emerald-50/50" : "bg-white"
                                                )}>
                                                    <td className="px-4 py-2 font-medium text-slate-700">{debt.tagLabel}</td>
                                                    <td className="px-4 py-2 text-right text-amber-700 font-mono">
                                                        {numberFormatter.format(debt.amount)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-bold text-emerald-600 font-mono">
                                                        {allocated > 0 ? `+${numberFormatter.format(allocated)}` : '-'}
                                                    </td>
                                                    <td className={cn(
                                                        "px-4 py-2 text-right font-mono",
                                                        isFullyPaid ? "text-slate-400 line-through" : "text-slate-900 font-semibold"
                                                    )}>
                                                        {numberFormatter.format(newBalance)}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {remainingUnused > 0 && (
                        <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-md flex items-start gap-2">
                            <Coins className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <strong>Excess Amount:</strong> {numberFormatter.format(remainingUnused)} will remain as unallocated credit (reducing total balance effectively, but not clearing specific cycles).
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setOpen && setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || totalAmount <= 0}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Repayment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
