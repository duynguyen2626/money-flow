'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddItemDialog } from './add-item-dialog'
import { ItemsTable } from './items-table'
import { sendBatchToSheetAction, updateBatchAction, deleteBatchAction, updateBatchItemAction, confirmBatchItemAction } from '@/actions/batch.actions'
import { Loader2, CheckCircle2, DollarSign, Trash2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CloneBatchDialog } from './clone-batch-dialog'
import { BatchSettingsDialog } from './batch-settings-dialog'
import { toast } from 'sonner'

export function BatchDetail({ batch, accounts }: { batch: any, accounts: any[] }) {
    const [sending, setSending] = useState(false)
    const [funding, setFunding] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
    const router = useRouter()

    const sourceAccount = accounts.find(a => a.id === batch.source_account_id)

    async function handleSend() {
        if (!batch.sheet_link) {
            toast.error('Please configure a Sheet Link first.')
            return
        }
        setSending(true)
        try {
            await sendBatchToSheetAction(batch.id)
            toast.success('Sent to sheet successfully!')
        } catch (error) {
            console.error(error)
            toast.error('Failed to send to sheet')
        } finally {
            setSending(false)
        }
    }

    async function handleFund() {
        setFunding(true)
        try {
            await updateBatchAction(batch.id, { status: 'funded' })
            router.refresh()
            toast.success('Batch funded successfully')
        } catch (error) {
            console.error(error)
            toast.error('Failed to fund batch')
        } finally {
            setFunding(false)
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this batch? This action cannot be undone.')) return

        setDeleting(true)
        try {
            await deleteBatchAction(batch.id)
            router.push('/batch')
            toast.success('Batch deleted')
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete batch')
            setDeleting(false)
        }
    }

    async function handleBulkConfirm() {
        if (selectedItemIds.length === 0) return
        if (!confirm(`Confirm ${selectedItemIds.length} items?`)) return

        setConfirming(true)
        try {
            await Promise.all(selectedItemIds.map(id => confirmBatchItemAction(id, batch.id)))
            router.refresh()
            setSelectedItemIds([])
            toast.success('Items confirmed')
        } catch (error) {
            console.error(error)
            toast.error('Failed to confirm items')
        } finally {
            setConfirming(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{batch.name}</h1>
                    <div className="text-muted-foreground flex items-center gap-2">
                        Source:
                        {sourceAccount ? (
                            <Link href={`/accounts/${sourceAccount.id}`} className="text-blue-600 hover:underline">
                                {sourceAccount.name}
                            </Link>
                        ) : 'N/A'}
                        {batch.status === 'funded' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Funded
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <BatchSettingsDialog batch={batch} />
                    <CloneBatchDialog batchId={batch.id} batchName={batch.name} />

                    <Button onClick={handleDelete} disabled={deleting} variant="outline" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete Batch">
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>

                    <div className="w-px h-8 bg-slate-200 mx-2" />

                    {batch.status !== 'funded' && (
                        <Button onClick={handleFund} disabled={funding || batch.batch_items.length === 0} variant="secondary">
                            {funding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <DollarSign className="mr-2 h-4 w-4" />
                            Fund
                        </Button>
                    )}

                    <Button onClick={handleSend} disabled={sending || batch.batch_items.length === 0} variant="outline">
                        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4" />
                        Send to Sheet
                    </Button>

                    <AddItemDialog batchId={batch.id} batchName={batch.name} accounts={accounts} />
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Items</CardTitle>
                    {selectedItemIds.length > 0 && (
                        <Button onClick={handleBulkConfirm} disabled={confirming} size="sm" className="bg-green-600 hover:bg-green-700">
                            {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirm ({selectedItemIds.length})
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <ItemsTable
                        items={batch.batch_items}
                        batchId={batch.id}
                        onSelectionChange={setSelectedItemIds}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
