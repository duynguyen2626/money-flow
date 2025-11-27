'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Loader2 } from 'lucide-react'
import { format, addMonths, parse } from 'date-fns'
import { cloneBatchAction } from '@/actions/batch.actions'
import { useRouter } from 'next/navigation'

interface CloneBatchDialogProps {
    batchId: string
    batchName: string
}

export function CloneBatchDialog({ batchId, batchName }: CloneBatchDialogProps) {
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<'current' | 'last'>('current')
    const [previewName, setPreviewName] = useState('')
    const [cloning, setCloning] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (open) {
            calculatePreview()
        }
    }, [open, mode])

    function calculatePreview() {
        // Try to find a date tag in the name (e.g., NOV25)
        const nameParts = batchName.split(' ')
        const potentialTag = nameParts[nameParts.length - 1]

        try {
            // If we can parse the tag, we can calculate the new tag
            // But wait, the logic is: 
            // If mode is 'current', we assume we are cloning TO current month
            // If mode is 'last', we assume we are cloning TO last month (maybe for backfilling)

            // Actually, the requirement says:
            // "Clone Batch" dialog to select Target Month (Current/Last).
            // It implies we want to generate a batch for THIS month or LAST month.

            const targetDate = mode === 'current' ? new Date() : addMonths(new Date(), -1)
            const newTag = format(targetDate, 'MMMyy').toUpperCase()

            // If the old name has a tag, replace it. Otherwise append.
            const parsedDate = parse(potentialTag, 'MMMyy', new Date())
            if (!isNaN(parsedDate.getTime())) {
                nameParts[nameParts.length - 1] = newTag
                setPreviewName(nameParts.join(' '))
            } else {
                setPreviewName(`${batchName} ${newTag}`)
            }
        } catch (e) {
            setPreviewName(`${batchName} (Copy)`)
        }
    }

    async function handleClone() {
        setCloning(true)
        try {
            // We need to pass the target mode or the calculated new tag to the backend
            // For now, let's update the cloneBatchAction to accept a targetDate or similar
            // OR we can just pass the mode and let the backend handle it if we move logic there.
            // However, the current cloneBatch service just increments by 1 month.
            // We should probably update the service to accept a specific target date/tag.

            // Let's stick to the requested UI flow first.
            // The user wants to select "Target Month".

            const targetDate = mode === 'current' ? new Date() : addMonths(new Date(), -1)
            const newTag = format(targetDate, 'MMMyy').toUpperCase()

            const newBatch = await cloneBatchAction(batchId, newTag)
            setOpen(false)
            router.push(`/batch/${newBatch.id}`)
        } catch (error) {
            console.error(error)
            alert('Failed to clone batch')
        } finally {
            setCloning(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Clone Batch">
                    <Copy className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Clone Batch</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Target Month</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-md hover:bg-slate-50 w-full">
                                <input
                                    type="radio"
                                    name="cloneMode"
                                    checked={mode === 'current'}
                                    onChange={() => setMode('current')}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <div className="flex flex-col">
                                    <span className="font-medium">Tháng này (Current)</span>
                                    <span className="text-xs text-muted-foreground">{format(new Date(), 'MMMM yyyy')}</span>
                                </div>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-md hover:bg-slate-50 w-full">
                                <input
                                    type="radio"
                                    name="cloneMode"
                                    checked={mode === 'last'}
                                    onChange={() => setMode('last')}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <div className="flex flex-col">
                                    <span className="font-medium">Tháng trước (Last)</span>
                                    <span className="text-xs text-muted-foreground">{format(addMonths(new Date(), -1), 'MMMM yyyy')}</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Preview Name</label>
                        <div className="p-3 bg-slate-100 rounded-md text-sm font-mono">
                            {previewName}
                        </div>
                    </div>

                    <Button onClick={handleClone} disabled={cloning} className="w-full">
                        {cloning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Clone Batch
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
