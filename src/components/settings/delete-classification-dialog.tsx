"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { AlertTriangle, Loader2, ArrowRight, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import { Category, Shop } from "@/types/moneyflow.types"
import { toast } from "sonner"

interface DeleteClassificationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entity: Category | Shop | null
    ids?: string[]
    entityType: 'category' | 'shop'
    candidates: (Category | Shop)[]
    mode?: 'delete' | 'archive'
    onConfirm: (id: string | string[], targetId?: string) => Promise<{ success: boolean, hasTransactions?: boolean, hasTransactionsIds?: string[], error?: string }>
    onSuccess: () => void
}

export function DeleteClassificationDialog({
    open,
    onOpenChange,
    entity,
    ids,
    entityType,
    candidates,
    mode = 'delete',
    onConfirm,
    onSuccess
}: DeleteClassificationDialogProps) {
    const [step, setStep] = useState<'confirm' | 'handover'>('confirm')
    const [targetId, setTargetId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleConfirm = async () => {
        if (!entity && (!ids || ids.length === 0)) return

        setIsLoading(true)
        setError(null)

        try {
            const currentId = ids || entity?.id
            if (!currentId) return

            // First attempt without target
            const result = await onConfirm(currentId as any)

            if (result.success) {
                toast.success(`${ids ? `${ids.length} items` : (entityType === 'category' ? (mode === 'archive' ? 'Category archived' : 'Category') : (mode === 'archive' ? 'Shop archived' : 'Shop'))} ${mode === 'archive' ? '' : 'deleted'} successfully`)
                onOpenChange(false)
                onSuccess()
            } else if (result.hasTransactions || (result.hasTransactionsIds && result.hasTransactionsIds.length > 0)) {
                // If transactions exist, move to handover step
                setStep('handover')
            } else {
                setError(result.error || `Failed to ${mode}`)
                toast.error(result.error || `Failed to ${mode}`)
            }
        } catch (err) {
            console.error(err)
            setError("An unexpected error occurred")
            toast.error("An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    const handleHandoverAndDelete = async () => {
        const deleteId = ids || entity?.id
        if (!deleteId || !targetId) return

        setIsLoading(true)
        setError(null)

        try {
            const result = await onConfirm(currentId as any, targetId)

            if (result.success) {
                toast.success(`Transactions moved and ${ids ? `${ids.length} items` : (entityType === 'category' ? 'category' : 'shop')} ${mode === 'archive' ? 'archived' : 'deleted'} successfully`)
                onOpenChange(false)
                onSuccess()
            } else {
                setError(result.error || `Failed to ${mode}`)
                toast.error(result.error || `Failed to ${mode}`)
            }
        } catch (err) {
            console.error(err)
            setError("An unexpected error occurred")
            toast.error("An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    const reset = () => {
        setStep('confirm')
        setTargetId("")
        setError(null)
    }

    // Filter out the current entity/entities from candidates
    const validCandidates = candidates.filter(c => ids ? !ids.includes(c.id) : c.id !== entity?.id)

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val)
            if (!val) setTimeout(reset, 300)
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className={cn("flex items-center gap-2", mode === 'delete' ? "text-rose-600" : "text-orange-600")}>
                        {mode === 'delete' ? <AlertTriangle className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
                        {mode === 'delete' ? 'Delete' : 'Archive'} {ids ? `${ids.length} ${entityType === 'category' ? 'Categories' : 'Shops'}` : (entityType === 'category' ? 'Category' : 'Shop')}
                    </DialogTitle>
                    <DialogDescription>
                        {ids ? (
                            <>Are you sure you want to {mode === 'delete' ? 'delete' : 'archive'} <span className="font-bold text-slate-900">{ids.length} items</span>?</>
                        ) : (
                            <>Are you sure you want to {mode === 'delete' ? 'delete' : 'archive'} <span className="font-bold text-slate-900">{entity?.name}</span>?</>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {step === 'confirm' ? (
                    <div className="py-2 text-sm text-slate-600">
                        {mode === 'delete'
                            ? "This action cannot be undone. Checks will be performed to ensure no transactions are lost."
                            : "Archived items will be hidden from main lists but their history will be preserved."}
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                            <strong>Handover Required!</strong> {ids ? 'Some of these items have' : `This ${entityType} has`} linked transactions. Before {mode === 'delete' ? 'deleting' : 'archiving'}, you must select where to move them.
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                                Select Target {entityType === 'category' ? 'Category' : 'Shop'}
                            </label>
                            <Combobox
                                items={validCandidates.map(c => ({
                                    value: c.id,
                                    label: c.name,
                                    icon: (
                                        <div className="w-6 h-6 rounded-none bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {c.image_url ? (
                                                <img
                                                    src={c.image_url}
                                                    alt=""
                                                    className="w-full h-full object-contain p-0.5"
                                                />
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase">
                                                    {c.name[0]}
                                                </span>
                                            )}
                                        </div>
                                    )
                                }))}
                                value={targetId}
                                onValueChange={(v) => setTargetId(v || "")}
                                placeholder={`Select new ${entityType}...`}
                                inputPlaceholder={`Search ${entityType}s...`}
                                className="h-10 bg-slate-50 border-slate-200"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-xs text-rose-500 font-medium bg-rose-50 p-2 rounded">
                        {error}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    {step === 'confirm' ? (
                        <Button
                            variant={mode === 'delete' ? "destructive" : "default"}
                            className={cn(mode === 'archive' && "bg-orange-600 hover:bg-orange-700")}
                            onClick={handleConfirm}
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'delete' ? 'Delete' : 'Archive'}
                        </Button>
                    ) : (
                        <Button
                            className={cn(mode === 'delete' ? "bg-rose-600 hover:bg-rose-700" : "bg-orange-600 hover:bg-orange-700", "text-white")}
                            onClick={handleHandoverAndDelete}
                            disabled={isLoading || !targetId}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Move & {mode === 'delete' ? 'Delete' : 'Archive'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
