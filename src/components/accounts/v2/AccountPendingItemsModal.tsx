'use client'

import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatMoneyVND, cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2, CheckCircle2, History, AlertCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PendingBatchItem {
    id: string
    amount: number
    batch_id: string
}

interface AccountPendingItemsModalProps {
    accountId: string
    pendingItems: PendingBatchItem[]
    pendingRefundCount: number
    pendingRefundAmount: number
    onSuccess?: () => void
}

export function AccountPendingItemsModal({
    accountId,
    pendingItems: initialPendingItems,
    pendingRefundCount,
    pendingRefundAmount,
    onSuccess
}: AccountPendingItemsModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isConfirming, setIsConfirming] = useState(false)
    const [submittingId, setSubmittingId] = useState<string | null>(null)
    const [voidingId, setVoidingId] = useState<string | null>(null)
    const [localPendingItems, setLocalPendingItems] = useState<PendingBatchItem[]>(initialPendingItems)
    const router = useRouter()

    useEffect(() => {
        const handleOpen = (e: any) => {
            if (e.detail?.accountId === accountId) {
                setIsOpen(true)
                // Select all by default
                setSelectedIds(new Set(initialPendingItems.map(item => item.id)))
            }
        }
        window.addEventListener('open-pending-items-modal', handleOpen)
        return () => window.removeEventListener('open-pending-items-modal', handleOpen)
    }, [accountId, initialPendingItems])

    // Sync local state when props change (fix for stale data)
    useEffect(() => {
        setLocalPendingItems(initialPendingItems);
    }, [initialPendingItems]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(localPendingItems.map(item => item.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds)
        if (checked) newSet.add(id)
        else newSet.delete(id)
        setSelectedIds(newSet)
    }

    const handleConfirmBatchItems = async () => {
        if (selectedIds.size === 0) return

        setIsConfirming(true)
        const toastId = toast.loading(`Creating ${selectedIds.size} Confirm TXNs...`)

        try {
            let successCount = 0
            const idsToConfirm = Array.from(selectedIds)

            for (const id of idsToConfirm) {
                const item = localPendingItems.find(i => i.id === id)
                if (!item) continue

                const response = await fetch('/api/batch/confirm-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: item.id, batchId: item.batch_id }),
                })
                if (response.ok) successCount += 1
            }

            if (successCount > 0) {
                toast.success(`Successfully confirmed ${successCount} transactions`, { id: toastId })

                // Update local state by filtering out confirmed IDs
                const remaining = localPendingItems.filter(item => !selectedIds.has(item.id))
                setLocalPendingItems(remaining)
                setSelectedIds(new Set())

                if (remaining.length === 0) {
                    setIsOpen(false)
                }

                if (onSuccess) await onSuccess()
                window.dispatchEvent(new CustomEvent('refresh-account-data'))
                router.refresh()
            } else {
                toast.error('Failed to confirm selected items', { id: toastId })
            }
        } catch (error) {
            console.error('Error confirming items:', error)
            toast.error('An error occurred while confirming items', { id: toastId })
        } finally {
            setIsConfirming(false)
        }
    }

    const handleConfirmSingleItem = async (itemId: string, batchId: string) => {
        setIsConfirming(true)
        setSubmittingId(itemId)
        const toastId = toast.loading('Creating Confirm TXN...')

        try {
            const response = await fetch('/api/batch/confirm-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, batchId }),
            })

            if (response.ok) {
                toast.success('Successfully created confirmation transaction', { id: toastId })

                // Update local state
                const remaining = localPendingItems.filter(item => item.id !== itemId)
                setLocalPendingItems(remaining)
                const newSelected = new Set(selectedIds)
                newSelected.delete(itemId)
                setSelectedIds(newSelected)

                if (remaining.length === 0) {
                    setIsOpen(false)
                }

                if (onSuccess) await onSuccess()
                window.dispatchEvent(new CustomEvent('refresh-account-data'))
                router.refresh()
            } else {
                toast.error('Failed to create confirmation transaction', { id: toastId })
            }
        } catch (error) {
            console.error('Error confirming item:', error)
            toast.error('An error occurred', { id: toastId })
        } finally {
            setIsConfirming(false)
            setSubmittingId(null)
        }
    }

    const handleVoidItem = async (itemId: string) => {
        if (isConfirming || voidingId) return
        setVoidingId(itemId)
        const toastId = toast.loading('Voiding item...')

        try {
            const response = await fetch('/api/batch/void-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId }),
            })

            if (response.ok) {
                toast.success('Item voided & reversed successfully', { id: toastId })

                // Update local state
                const remaining = localPendingItems.filter(item => item.id !== itemId)
                setLocalPendingItems(remaining)
                const newSelected = new Set(selectedIds)
                newSelected.delete(itemId)
                setSelectedIds(newSelected)

                if (remaining.length === 0) {
                    setIsOpen(false)
                }

                if (onSuccess) await onSuccess()
                window.dispatchEvent(new CustomEvent('refresh-account-data'))
                router.refresh()
            } else {
                toast.error('Failed to void item', { id: toastId })
            }
        } catch (error) {
            console.error('Error voiding item:', error)
            toast.error('An error occurred', { id: toastId })
        } finally {
            setSubmittingId(null) // Clear any submitting state just in case
            setVoidingId(null)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px] p-0 border-none shadow-2xl">
                {/* Global Loading Overlay for Modal */}
                {(isConfirming || !!voidingId) && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex items-center justify-center transition-all duration-300 animate-in fade-in">
                        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white shadow-xl border border-slate-100 scale-in-95 animate-in">
                            <div className="relative">
                                <div className="h-12 w-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                                <Loader2 className="absolute inset-0 m-auto h-5 w-5 text-indigo-600 animate-pulse" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                    {voidingId ? 'Voiding Item...' : 'Confirming Selection...'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Updating Ledger</span>
                            </div>
                        </div>
                    </div>
                )}

                <DialogHeader className="p-6 bg-slate-900 text-white">
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <History className="h-5 w-5 text-indigo-400" />
                        Pending Items
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 font-medium">
                        Confirm transactions for this account to update balance.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    {/* Batch Items Section */}
                    {localPendingItems.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Import Batch Items</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">
                                        {selectedIds.size}/{localPendingItems.length} selected
                                    </span>
                                    <Checkbox
                                        checked={selectedIds.size === localPendingItems.length && localPendingItems.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    />
                                </div>
                            </div>

                            <div className="h-[250px] overflow-y-auto border rounded-lg bg-slate-50/50">
                                <div className="divide-y divide-slate-100">
                                    {localPendingItems.map((item) => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-white transition-colors">
                                            <Checkbox
                                                checked={selectedIds.has(item.id)}
                                                onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link
                                                                href={`/batch/detail/${item.batch_id}`}
                                                                target="_blank"
                                                                className="text-xs font-black text-indigo-600 hover:text-indigo-800 underline underline-offset-2 truncate block"
                                                            >
                                                                Batch: {item.batch_id.slice(0, 8)}...
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Open batch in new tab</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <div className="text-[10px] font-bold text-slate-400">
                                                    ID: {item.id.slice(0, 8)}...
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="text-sm font-black text-rose-600 tabular-nums">
                                                    {formatMoneyVND(item.amount)}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md border border-transparent hover:border-emerald-100"
                                                    onClick={() => handleConfirmSingleItem(item.id, item.batch_id)}
                                                    disabled={isConfirming}
                                                    title="Confirm this item only"
                                                >
                                                    {submittingId === item.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-transparent hover:border-rose-100"
                                                    onClick={() => handleVoidItem(item.id)}
                                                    disabled={isConfirming || !!voidingId || !!submittingId}
                                                    title="Void (Delete) this item"
                                                >
                                                    {voidingId === item.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                                                    ) : (
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-emerald-600 gap-2 border-2 border-dashed border-emerald-100 rounded-xl bg-emerald-50/50">
                            <CheckCircle2 className="h-8 w-8 opacity-80" />
                            <span className="text-xs font-black uppercase tracking-widest">No pending batch items</span>
                        </div>
                    )}

                    {/* Pending Refunds Section */}
                    {pendingRefundCount > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="text-xs font-bold text-amber-900 leading-none mb-1">
                                    {pendingRefundCount} Pending Refunds
                                </div>
                                <div className="text-[11px] text-amber-700 font-medium">
                                    You have items marked as &quot;Waiting Refund&quot; totaling <strong className="font-black">{formatMoneyVND(pendingRefundAmount)}</strong>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] font-black uppercase bg-white border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                                onClick={() => router.push('/transactions?status=pending')}
                            >
                                View All
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-xs font-bold uppercase text-slate-500">
                        Cancel
                    </Button>
                    <Button
                        disabled={selectedIds.size === 0 || isConfirming}
                        onClick={handleConfirmBatchItems}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider gap-2 px-6"
                    >
                        {isConfirming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        Confirm {selectedIds.size} Items
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
