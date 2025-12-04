'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddItemDialog } from './add-item-dialog'
import { ItemsTable } from './items-table'
import { Loader2, CheckCircle2, DollarSign, Trash2, Send, ExternalLink, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { sendBatchToSheetAction, fundBatchAction, deleteBatchAction, confirmBatchItemAction, updateBatchCycleAction } from '@/actions/batch.actions'
import { useRouter } from 'next/navigation'
import { CloneBatchDialog } from './clone-batch-dialog'
import { BatchSettingsDialog } from './batch-settings-dialog'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { formatCurrency } from '@/lib/account-utils'
import { ConfirmSourceDialog } from './confirm-source-dialog'
import { SYSTEM_ACCOUNTS } from '@/lib/constants'
import { LinkSheetDialog } from './link-sheet-dialog'

export function BatchDetail({ batch, accounts, bankMappings }: { batch: any, accounts: any[], bankMappings?: any[] }) {
    const [sending, setSending] = useState(false)
    const [funding, setFunding] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [updatingCycle, setUpdatingCycle] = useState(false)
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [linkDialogOpen, setLinkDialogOpen] = useState(false)
    const router = useRouter()

    const sourceAccount = accounts.find(a => a.id === batch.source_account_id)

    // Filter items by status
    const pendingItems = batch.batch_items?.filter((item: any) => item.status === 'pending' || !item.is_confirmed) || []
    const confirmedItems = batch.batch_items?.filter((item: any) => item.status === 'confirmed' || item.is_confirmed) || []

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
            const result = await fundBatchAction(batch.id)
            const fundedAmount = Math.abs(result?.fundedAmount ?? 0)

            router.refresh()

            if (result?.createdTransaction && fundedAmount > 0) {
                toast.success(`Funding Transaction Created (-${formatCurrency(fundedAmount)})`)
            } else {
                toast.success('Batch already fully funded')
            }
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
        setShowConfirmDialog(true)
    }

    async function performBulkConfirm() {
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
            setShowConfirmDialog(false)
        }
    }

    async function handleCycleUpdate(action: 'prev' | 'next') {
        setUpdatingCycle(true)
        try {
            await updateBatchCycleAction(batch.id, action)
            toast.success('Batch cycle updated')
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update batch cycle')
        } finally {
            setUpdatingCycle(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleCycleUpdate('prev')} disabled={updatingCycle} className="h-8 w-8">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <h1 className="text-3xl font-bold">{batch.name}</h1>
                            <Button variant="ghost" size="icon" onClick={() => handleCycleUpdate('next')} disabled={updatingCycle} className="h-8 w-8">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-rose-100 px-3 py-1 text-xl font-bold text-rose-700 border border-rose-200">
                            Total: {new Intl.NumberFormat('en-US').format(batch.batch_items.reduce((sum: number, item: any) => sum + Math.abs(item.amount ?? 0), 0))}
                        </span>
                        {batch.display_link && (
                            <div className="flex items-center gap-2">
                                <a
                                    href={batch.display_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                    title={batch.display_link}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    {batch.sheet_name || "Sheet Link"}
                                </a>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-blue-600"
                                    onClick={() => setLinkDialogOpen(true)}
                                >
                                    <Settings className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        {!batch.display_link && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-blue-600 h-6"
                                onClick={() => setLinkDialogOpen(true)}
                            >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Link Sheet
                            </Button>
                        )}
                    </div>
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

                    {batch.source_account_id === SYSTEM_ACCOUNTS.DRAFT_FUND && batch.status === 'funded' && (
                        <ConfirmSourceDialog batchId={batch.id} accounts={accounts} />
                    )}

                    <Button
                        onClick={handleFund}
                        disabled={funding || batch.batch_items.length === 0}
                        variant="secondary"
                        className={batch.batch_items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                        {funding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <DollarSign className="mr-2 h-4 w-4" />
                        {batch.status === 'funded' ? 'Fund More' : 'Fund'}
                    </Button>

                    <Button
                        onClick={handleSend}
                        disabled={sending || batch.batch_items.length === 0}
                        variant="outline"
                        className={batch.batch_items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                    >
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
                    <Tabs defaultValue="pending" className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList>
                                <TabsTrigger value="pending">
                                    Pending ({pendingItems.length})
                                </TabsTrigger>
                                <TabsTrigger value="confirmed">
                                    Confirmed ({confirmedItems.length})
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="pending" className="mt-0">
                            <ItemsTable
                                items={pendingItems}
                                batchId={batch.id}
                                onSelectionChange={setSelectedItemIds}
                            />
                        </TabsContent>
                        <TabsContent value="confirmed" className="mt-4">
                            <ItemsTable
                                items={confirmedItems}
                                batchId={batch.id}
                                onSelectionChange={setSelectedItemIds}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                title="Confirm Items"
                description={`Are you sure you want to confirm ${selectedItemIds.length} items?`}
                onConfirm={performBulkConfirm}
                confirmText="Confirm"
                cancelText="Cancel"
                variant="default"
            />

            <LinkSheetDialog
                isOpen={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                batchId={batch.id}
                initialLink={batch.display_link}
                initialName={batch.sheet_name}
                onSuccess={() => router.refresh()}
            />
        </div>
    )
}
