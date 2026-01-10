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
import { toYYYYMMFromDate } from '@/lib/month-tag'
import { Select } from "@/components/ui/select"

interface RolloverDebtDialogProps {
    personId: string
    currentCycle: string
    remains: number
    trigger?: React.ReactNode
}

const initialState: RolloverDebtState = {
    success: false,
    message: '',
}

export function RolloverDebtDialog({ personId, currentCycle, remains, trigger }: RolloverDebtDialogProps) {
    const [open, setOpen] = useState(false)
    const [state, formAction, isPending] = useActionState(rolloverDebtAction, initialState)

    // Helper to get next month tag
    const getNextMonth = (cycle: string) => {
        if (!cycle) return ''
        const [year, month] = cycle.split('-').map(Number)
        const date = new Date(year, month, 1) // Month is 0-indexed in Date, so month (1-12) used as index is actually next month.
        return toYYYYMMFromDate(date)
    }

    const [toCycle, setToCycle] = useState(getNextMonth(currentCycle))
    const [amount, setAmount] = useState(remains > 0 ? remains : 0)

    // Generate upcoming cycle options (next 12 months)
    const cycleSelectItems = []
    let baseCycle = currentCycle
    for (let i = 0; i < 12; i++) {
        const next = getNextMonth(baseCycle)
        cycleSelectItems.push({ value: next, label: next })
        baseCycle = next
    }

    useEffect(() => {
        if (state.success) {
            toast.success(state.message)
            setOpen(false)
        } else if (state.error) {
            toast.error(state.error)
        }
    }, [state])

    useEffect(() => {
        if (open) {
            setAmount(remains > 0 ? remains : 0)
            setToCycle(getNextMonth(currentCycle))
        }
    }, [open, currentCycle, remains])


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
                <form action={formAction} className="grid gap-4 py-4">
                    <input type="hidden" name="personId" value={personId} />
                    <input type="hidden" name="fromCycle" value={currentCycle} />
                    <input type="hidden" name="toCycle" value={toCycle} />

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
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="toCycleSelect" className="text-right">
                            To Cycle
                        </Label>
                        <div className="col-span-3">
                            <Select
                                items={cycleSelectItems}
                                value={toCycle}
                                onValueChange={(val) => val && setToCycle(val)}
                                placeholder="Select cycle"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Rollover
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
