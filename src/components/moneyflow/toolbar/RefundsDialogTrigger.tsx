'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RefundsTracker } from '@/components/moneyflow/refunds-tracker'
import { getPendingRefundsAction } from '@/actions/refund-actions'
import { PendingRefundItem } from '@/services/transaction.service'
import { Wrench, Loader2 } from 'lucide-react'
// import { useAccountContext } from '@/components/moneyflow/account-context' 
// Actually refunds-tracker needs accounts. 
// We should fetch accounts or reuse context.
// Let's assume passed props or fetch accounts too.

import { Account } from '@/types/moneyflow.types'
import { getAccountsAction } from '@/actions/account-actions' // IF exists

interface RefundsDialogTriggerProps {
    accounts: Account[]
}

export function RefundsDialogTrigger({ accounts }: RefundsDialogTriggerProps) {
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<PendingRefundItem[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            setLoading(true)
            getPendingRefundsAction()
                .then(data => setItems(data))
                .finally(() => setLoading(false))
        }
    }, [open])

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                className="hidden sm:flex"
                onClick={() => setOpen(true)}
                title="Utilities / Refunds"
            >
                <Wrench className="h-4 w-4 text-slate-500" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Utilities & Refunds</DialogTitle>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <RefundsTracker pendingRefunds={items} accounts={accounts} />
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
