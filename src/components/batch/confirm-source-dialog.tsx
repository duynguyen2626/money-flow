'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { confirmBatchSourceAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ConfirmSourceDialog({ batchId, accounts }: { batchId: string, accounts: any[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [accountId, setAccountId] = useState('')
    const router = useRouter()

    const handleConfirm = async () => {
        if (!accountId) return
        setLoading(true)
        try {
            await confirmBatchSourceAction(batchId, accountId)
            toast.success('Batch source confirmed')
            setOpen(false)
            router.refresh()
        } catch (error) {
            toast.error('Failed to confirm source')
        } finally {
            setLoading(false)
        }
    }

    const validAccounts = accounts.filter(a => a.type === 'bank' || a.type === 'cash' || a.type === 'ewallet')

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Match Real Source
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Real Money Source</DialogTitle>
                </DialogHeader>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                    <p className="text-xs text-blue-700 leading-relaxed">
                        This batch was originally funded using <strong>Draft Fund</strong> (virtual money).
                        Please select the real bank account you used to pay for this batch to reconcile the balances.
                    </p>
                </div>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Source Account</label>
                        <Select
                            items={validAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
                            value={accountId}
                            onValueChange={(val) => setAccountId(val || '')}
                            placeholder="Select account"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirm} disabled={!accountId || loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
