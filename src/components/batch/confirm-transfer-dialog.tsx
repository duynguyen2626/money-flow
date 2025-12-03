'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface ConfirmTransferDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: any
    onConfirm: (targetAccountId: string) => Promise<void>
}

export function ConfirmTransferDialog({ open, onOpenChange, item, onConfirm }: ConfirmTransferDialogProps) {
    const [accounts, setAccounts] = useState<any[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [fetchingAccounts, setFetchingAccounts] = useState(false)

    useEffect(() => {
        if (open) {
            fetchAccounts()
            // Pre-select if item has target_account_id
            if (item?.target_account_id) {
                setSelectedAccountId(item.target_account_id)
            } else {
                setSelectedAccountId('')
            }
        }
    }, [open, item])

    async function fetchAccounts() {
        setFetchingAccounts(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('accounts')
            .select('id, name, type, bank_name, account_number')
            .eq('is_active', true)
            .order('name')

        if (data) {
            setAccounts(data)
        }
        setFetchingAccounts(false)
    }

    async function handleConfirm() {
        if (!selectedAccountId) return
        setLoading(true)
        try {
            await onConfirm(selectedAccountId)
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to confirm:', error)
        } finally {
            setLoading(false)
        }
    }

    const selectItems = accounts.map((acc) => ({
        value: acc.id,
        label: `${acc.name} ${acc.bank_name ? `(${acc.bank_name})` : ''}`
    }))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirm Transfer</DialogTitle>
                    <DialogDescription>
                        Select the real account where this money will be transferred to.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="account">Target Account</Label>
                        <Select
                            items={selectItems}
                            value={selectedAccountId}
                            onValueChange={(val) => setSelectedAccountId(val || '')}
                            placeholder="Select an account"
                            disabled={loading || fetchingAccounts}
                        />
                    </div>
                    {item && (
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                            <p><strong>Receiver:</strong> {item.receiver_name}</p>
                            <p><strong>Amount:</strong> {new Intl.NumberFormat('en-US').format(item.amount)} VND</p>
                            <p><strong>Note:</strong> {item.note}</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedAccountId || loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Transfer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
