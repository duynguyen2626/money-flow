'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, Calendar as CalendarIcon } from 'lucide-react'
import { runAllServiceDistributionsAction } from '@/actions/service-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DistributeAllButton() {
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]) // Default to today YYYY-MM-DD
    const router = useRouter()

    const handleRunAll = async () => {
        try {
            setIsLoading(true)
            const result = await runAllServiceDistributionsAction(date)

            if (result.failed > 0) {
                toast.warning(`Completed with issues. Success: ${result.success}, Failed: ${result.failed}`)
            } else {
                toast.success(`Successfully distributed ${result.success} services for date ${date}`)
            }

            setIsOpen(false)
            router.refresh()
        } catch (error) {
            console.error('Error running distribution:', error)
            toast.error('Failed to run distribution')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    <Zap className="mr-2 h-4 w-4" />
                    Distribute All
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Run Auto-Distribution</DialogTitle>
                    <DialogDescription>
                        Distribute all active services. You can select a past date to recover a missed cycle.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Date
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full"
                            />
                            <p className="text-[0.8rem] text-muted-foreground mt-2">
                                Transactions will be created with the month tag of this date (e.g., {new Date(date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}{new Date(date).getFullYear().toString().slice(-2)}).
                            </p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleRunAll} disabled={isLoading}>
                        {isLoading ? 'Running...' : 'Run Distribution'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
