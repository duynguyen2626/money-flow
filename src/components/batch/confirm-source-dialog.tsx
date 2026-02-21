'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { confirmBatchSourceAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Combobox, ComboboxGroup } from '@/components/ui/combobox'

export function ConfirmSourceDialog({ batchId, accounts, disabled = false }: { batchId: string, accounts: any[], disabled?: boolean }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [accountId, setAccountId] = useState<string | undefined>('')
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

    const validAccounts = accounts.filter(a => a.type === 'bank' || a.type === 'cash' || a.type === 'ewallet' || a.type === 'credit_card')

    const accountGroups: ComboboxGroup[] = [
        {
            label: "Credit Cards",
            items: validAccounts.filter(a => a.type === 'credit_card').map(a => ({
                value: a.id,
                label: a.name,
                description: a.account_number || 'No account number',
                icon: a.image_url ? <img src={a.image_url} alt="" className="w-4 h-4 object-contain rounded-none" /> : undefined
            }))
        },
        {
            label: "Cash / Bank / E-Wallet",
            items: validAccounts.filter(a => a.type !== 'credit_card').map(a => ({
                value: a.id,
                label: a.name,
                description: a.account_number || 'No account number',
                icon: a.image_url ? <img src={a.image_url} alt="" className="w-4 h-4 object-contain rounded-none" /> : undefined
            }))
        }
    ].filter(g => g.items.length > 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="secondary"
                    className={cn(
                        "gap-2 border-green-200 text-green-700 hover:bg-green-50",
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                    )}
                    disabled={disabled}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span className="font-semibold">Step 2: Match Source</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Step 2: Match Real Money Source</DialogTitle>
                </DialogHeader>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        This batch was originally funded using <strong>Draft Fund</strong> (virtual money).
                        Please select the real bank account you used to pay for this batch to reconcile the balances.
                    </p>
                </div>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Source Account</label>
                        <Combobox
                            groups={accountGroups}
                            value={accountId}
                            onValueChange={setAccountId}
                            placeholder="Select account"
                            className="h-11 shadow-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" className="rounded-xl font-bold" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button className="rounded-xl font-bold px-8 bg-slate-900 hover:bg-slate-800" onClick={handleConfirm} disabled={!accountId || loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
