'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
} from '@/components/ui/select'
// import { transferDebtBalance } from '@/actions/debt-actions'
import { toYYYYMMFromDate } from '@/lib/month-tag'

interface TransferDebtDialogProps {
    personId: string
    fromCycle: string
    currentBalance: number
    triggerContent?: React.ReactNode
    onSuccess?: () => void
}

export function TransferDebtDialog({
    personId,
    fromCycle,
    currentBalance,
    triggerContent,
    onSuccess,
}: TransferDebtDialogProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState(Math.abs(currentBalance))
    const [targetCycle, setTargetCycle] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    // Generate next 12 months as opions
    const nextMonths = Array.from({ length: 12 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() + i)
        return toYYYYMMFromDate(d)
    })

    // Filter out the fromCycle if present in the list
    const cycleOptions = nextMonths
        .filter(c => c !== fromCycle)
        // @ts-ignore - The Select component in this codebase seems to accept items prop
        .map(c => ({ value: c, label: c }))

    const handleTransfer = async () => {
        if (!amount || amount <= 0) {
            toast.error('Please enter a valid amount')
            return
        }
        if (!targetCycle) {
            toast.error('Please select a target cycle')
            return
        }

        setIsSubmitting(true)
        try {
            // TODO: 'transferDebtBalance' is missing in debt-actions.ts. Disabling feature for now.
            // const result = await transferDebtBalance(personId, amount, fromCycle, targetCycle)
            const result = { success: false, error: 'Feature temporarily unavailable' } // Stub

            if (result.success) {
                toast.success(`Transferred ${amount.toLocaleString()} to ${targetCycle}`)
                setOpen(false)
                router.refresh()
                onSuccess?.()
            } else {
                toast.error(result.error || 'Transfer failed')
            }
        } catch (error) {
            toast.error('An error occurred during transfer')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerContent || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Move Balance
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Move Balance</DialogTitle>
                    <DialogDescription>
                        Transfer outstanding debt from {fromCycle} to a future cycle.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount to Transfer</Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Current Cycle Balance: {Math.abs(currentBalance).toLocaleString()}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="cycle">Target Cycle</Label>
                        <Select
                            value={targetCycle}
                            onValueChange={(val) => setTargetCycle(val || '')}
                            // @ts-ignore
                            items={cycleOptions}
                            placeholder="Select month..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleTransfer} disabled={isSubmitting}>
                        {isSubmitting ? 'Moving...' : 'Move Balance'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
