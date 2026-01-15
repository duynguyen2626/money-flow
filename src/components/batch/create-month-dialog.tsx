'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreateMonthDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    bankType: 'MBB' | 'VIB'
    previousMonths?: string[] // Array of YYYY-MM strings
    onCreateFresh?: (monthYear: string, monthName: string) => void
    onCreateClone?: (monthYear: string, monthName: string, sourceMonth: string) => void
}

export function CreateMonthDialog({
    open,
    onOpenChange,
    bankType,
    previousMonths = [],
    onCreateFresh,
    onCreateClone
}: CreateMonthDialogProps) {
    // Get next month as default
    const getNextMonth = () => {
        const now = new Date()
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        return nextMonth.toISOString().slice(0, 7) // YYYY-MM
    }

    const formatMonthName = (monthYear: string) => {
        const [year, month] = monthYear.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthIndex = parseInt(month, 10) - 1
        return `${monthNames[monthIndex]} ${year}`
    }

    const [monthYear, setMonthYear] = useState(getNextMonth())
    const [monthName, setMonthName] = useState(formatMonthName(getNextMonth()))
    const [mode, setMode] = useState<'fresh' | 'clone'>('clone')
    const [sourceMonth, setSourceMonth] = useState(previousMonths[0] || '')

    // Update month name when month year changes
    const handleMonthYearChange = (value: string) => {
        setMonthYear(value)
        setMonthName(formatMonthName(value))
    }

    const handleCreate = () => {
        if (mode === 'fresh') {
            onCreateFresh?.(monthYear, monthName)
        } else {
            onCreateClone?.(monthYear, monthName, sourceMonth)
        }
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Month - {bankType}</DialogTitle>
                    <DialogDescription>
                        Create a new batch for a specific month
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Month Picker */}
                    <div className="space-y-2">
                        <Label htmlFor="month-year">Select Month</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                    id="month-year"
                                    type="month"
                                    value={monthYear}
                                    onChange={(e) => handleMonthYearChange(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Month Name (editable) */}
                    <div className="space-y-2">
                        <Label htmlFor="month-name">Batch Name</Label>
                        <Input
                            id="month-name"
                            value={monthName}
                            onChange={(e) => setMonthName(e.target.value)}
                            placeholder="e.g., Jan 2026"
                        />
                        <p className="text-xs text-slate-500">
                            💡 Auto-generated, but you can customize it
                        </p>
                    </div>

                    {/* Clone vs Fresh - Toggle Style */}
                    <div className="space-y-3">
                        <Label>Creation Mode</Label>

                        {/* Toggle Switch */}
                        <div className="inline-flex rounded-lg border-2 border-slate-200 p-1 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setMode('clone')}
                                className={cn(
                                    'px-4 py-2.5 rounded-md font-medium transition-all duration-200',
                                    mode === 'clone'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                Clone from previous
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('fresh')}
                                className={cn(
                                    'px-4 py-2.5 rounded-md font-medium transition-all duration-200',
                                    mode === 'fresh'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                Start fresh
                            </button>
                        </div>

                        {/* Description based on mode */}
                        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
                            {mode === 'clone' ? (
                                <>
                                    <span className="font-medium text-slate-900">Clone mode:</span> Copy bank names and amounts from{' '}
                                    {previousMonths.length > 0 ? formatMonthName(previousMonths[0]) : 'previous month'}
                                </>
                            ) : (
                                <>
                                    <span className="font-medium text-slate-900">Fresh mode:</span> Create an empty batch with no pre-filled data
                                </>
                            )}
                        </div>
                    </div>

                    {/* Source Month Selector (if clone mode) */}
                    {mode === 'clone' && previousMonths.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="source-month">Clone From</Label>
                            <select
                                id="source-month"
                                value={sourceMonth}
                                onChange={(e) => setSourceMonth(e.target.value)}
                                className="w-full border border-slate-300 rounded-md px-3 py-2"
                            >
                                {previousMonths.map((month) => (
                                    <option key={month} value={month}>
                                        {formatMonthName(month)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate}>
                        {mode === 'clone' ? 'Next: Quick Entry' : 'Create Batch'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
