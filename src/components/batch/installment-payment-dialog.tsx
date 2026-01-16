'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { updateBatchItemAction } from '@/actions/batch.actions'

interface PendingInstallment {
    id: string
    name: string
    monthly_amount: number
    remaining_amount: number
    term_months: number
    next_due_date: string | null
    // Calculate which period this is
    period_number: number
}

interface InstallmentPaymentDialogProps {
    batchItemId: string
    batchItemAmount: number
    targetAccountId: string
    onSuccess?: () => void
}

export function InstallmentPaymentDialog({
    batchItemId,
    batchItemAmount,
    targetAccountId,
    onSuccess
}: InstallmentPaymentDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [pendingInstallments, setPendingInstallments] = useState<PendingInstallment[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [fetching, setFetching] = useState(false)

    useEffect(() => {
        if (open && targetAccountId) {
            fetchPendingInstallments()
        }
    }, [open, targetAccountId])

    async function fetchPendingInstallments() {
        setFetching(true)
        try {
            const response = await fetch(`/api/installments/pending?account_id=${targetAccountId}`)
            if (response.ok) {
                const data = await response.json()
                setPendingInstallments(data)
            }
        } catch (error) {
            console.error('Failed to fetch pending installments:', error)
            toast.error('Failed to load installments')
        } finally {
            setFetching(false)
        }
    }

    const selectedTotal = pendingInstallments
        .filter(inst => selectedIds.includes(inst.id))
        .reduce((sum, inst) => sum + inst.monthly_amount, 0)

    const hasWarning = selectedTotal > batchItemAmount

    async function handleConfirm() {
        if (selectedIds.length === 0) {
            toast.error('Please select at least one installment period')
            return
        }

        setLoading(true)
        try {
            await updateBatchItemAction(batchItemId, {
                is_installment_payment: true,
                metadata: { selected_installment_ids: selectedIds }
            })
            toast.success(`Marked as installment payment (${selectedIds.length} periods)`)
            setOpen(false)
            onSuccess?.()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update batch item')
        } finally {
            setLoading(false)
        }
    }

    function handleSelectAll() {
        if (selectedIds.length === pendingInstallments.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(pendingInstallments.map(inst => inst.id))
        }
    }

    function toggleSelection(id: string) {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    if (pendingInstallments.length === 0 && !open) {
        return null // Don't show button if no pending installments
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-7 text-xs"
                >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Installment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select Installment Periods to Pay</DialogTitle>
                </DialogHeader>

                {fetching ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : pendingInstallments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        No pending installments found for this account.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedIds.length === pendingInstallments.length}
                                    onCheckedChange={handleSelectAll}
                                />
                                <span className="text-sm font-medium">Select All ({pendingInstallments.length} periods)</span>
                            </div>
                            <div className="text-sm text-slate-600">
                                Batch Amount: <span className="font-bold">{new Intl.NumberFormat('en-US').format(batchItemAmount)}</span>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto space-y-2">
                            {pendingInstallments.map((inst) => (
                                <div
                                    key={inst.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedIds.includes(inst.id)
                                            ? 'bg-indigo-50 border-indigo-200'
                                            : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedIds.includes(inst.id)}
                                        onCheckedChange={() => toggleSelection(inst.id)}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{inst.name}</div>
                                        <div className="text-xs text-slate-500">
                                            Period {inst.period_number} of {inst.term_months}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm">
                                            {new Intl.NumberFormat('en-US').format(inst.monthly_amount)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Remaining: {new Intl.NumberFormat('en-US').format(inst.remaining_amount)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                            <div className="text-sm">
                                <span className="text-slate-600">Selected Total: </span>
                                <span className={`font-bold ${hasWarning ? 'text-red-600' : 'text-slate-900'}`}>
                                    {new Intl.NumberFormat('en-US').format(selectedTotal)}
                                </span>
                            </div>
                            {hasWarning && (
                                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Exceeds batch amount
                                </Badge>
                            )}
                        </div>

                        {hasWarning && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                <strong>Warning:</strong> The total of selected installments ({new Intl.NumberFormat('en-US').format(selectedTotal)})
                                exceeds the batch item amount ({new Intl.NumberFormat('en-US').format(batchItemAmount)}).
                                You may want to adjust your selection.
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button onClick={handleConfirm} disabled={loading || selectedIds.length === 0}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm ({selectedIds.length} periods)
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
