'use client'

import { useState, useActionState, useEffect } from 'react'
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
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { rolloverDebtAction, RolloverDebtState } from '@/actions/people-actions'
import { toast } from 'sonner'
import { toYYYYMMFromDate, isYYYYMM } from '@/lib/month-tag'
import { Select } from "@/components/ui/select"

interface RolloverDebtDialogProps {
    personId: string
    currentCycle: string
    allCycles?: { tag: string }[]
    remains: number
    trigger?: React.ReactNode
    setIsGlobalLoading?: (loading: boolean) => void
    setLoadingMessage?: (msg: string | null) => void
}

const initialState: RolloverDebtState = {
    success: false,
    message: '',
}

// Helper to get next month tag
const getNextMonth = (cycle: string) => {
    if (!isYYYYMM(cycle)) return ''
    const [year, month] = cycle.split('-').map(Number)
    const date = new Date(year, month, 1) // Month is 0-indexed in Date, so month (1-12) used as index is actually next month.
    return toYYYYMMFromDate(date)
}

export function RolloverDebtDialog({
    personId,
    currentCycle,
    allCycles = [],
    remains,
    trigger,
    setIsGlobalLoading,
    setLoadingMessage
}: RolloverDebtDialogProps) {
    const [open, setOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    // Internal state for form since we'll handle submission manually for immediate closure
    const [fromCycle, setFromCycle] = useState(currentCycle)
    const [toCycle, setToCycle] = useState(isYYYYMM(currentCycle) ? getNextMonth(currentCycle) : '')
    const [amount, setAmount] = useState(remains > 0 ? Math.round(remains) : 0)
    const [occurredAt, setOccurredAt] = useState(new Intl.DateTimeFormat('en-CA').format(new Date()))

    // Generate from cycle options
    const fromCycleItems = (allCycles.length > 0
        ? Array.from(new Set([currentCycle, ...allCycles.map(c => c.tag)]))
        : [currentCycle]
    ).filter(isYYYYMM).sort().reverse().map(tag => ({ value: tag, label: tag }))

    // Generate upcoming cycle options (next 12 months)
    const toCycleItems = [];
    if (isYYYYMM(fromCycle)) {
        let baseCycle = fromCycle
        for (let i = 0; i < 12; i++) {
            const next = getNextMonth(baseCycle)
            toCycleItems.push({ value: next, label: next })
            baseCycle = next
        }
    }

    useEffect(() => {
        if (open && isYYYYMM(currentCycle)) {
            setFromCycle(currentCycle)
            setAmount(remains > 0 ? Math.round(remains) : 0)
            setToCycle(getNextMonth(currentCycle))
            setOccurredAt(new Intl.DateTimeFormat('en-CA').format(new Date()))
        }
    }, [open, currentCycle, remains])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        // 1. Close modal immediately
        setOpen(false)

        // 2. Start global loading
        if (setIsGlobalLoading) setIsGlobalLoading(true)
        if (setLoadingMessage) setLoadingMessage('Creating rollover transactions...')
        setIsProcessing(true)

        try {
            const result = await rolloverDebtAction(initialState, formData)
            if (result.success) {
                toast.success(result.message || 'Debt rolled over successfully')
            } else {
                toast.error(result.error || 'Failed to rollover debt')
                // Re-open if failed? Maybe not, keep it simple.
            }
        } catch (err) {
            toast.error('An unexpected error occurred')
            console.error(err)
        } finally {
            setIsProcessing(false)
            if (setIsGlobalLoading) setIsGlobalLoading(false)
            if (setLoadingMessage) setLoadingMessage(null)
        }
    }

    if (!isYYYYMM(currentCycle)) {
        return null
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                        <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                        <span className="sr-only sm:not-sr-only text-xs">Rollover</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Rollover Debt</DialogTitle>
                    <DialogDescription>
                        Move remaining debt from <strong>{currentCycle}</strong> to a future cycle.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <input type="hidden" name="personId" value={personId} />
                    <input type="hidden" name="fromCycle" value={fromCycle} />
                    <input type="hidden" name="toCycle" value={toCycle} />

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="occurredAt" className="text-right">
                            Date
                        </Label>
                        <Input
                            id="occurredAt"
                            name="occurredAt"
                            type="date"
                            value={occurredAt}
                            onChange={(e) => setOccurredAt(e.target.value)}
                            className="col-span-3 text-xs"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fromCycleSelect" className="text-right">
                            From Cycle
                        </Label>
                        <div className="col-span-3">
                            <Select
                                items={fromCycleItems}
                                value={fromCycle}
                                onValueChange={(val) => val && setFromCycle(val)}
                                placeholder="Select source cycle"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="toCycleSelect" className="text-right">
                            To Cycle
                        </Label>
                        <div className="col-span-3">
                            <Select
                                items={toCycleItems}
                                value={toCycle}
                                onValueChange={(val) => val && setToCycle(val)}
                                placeholder="Select target cycle"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount
                        </Label>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="col-span-3 font-semibold"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Rollover
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
