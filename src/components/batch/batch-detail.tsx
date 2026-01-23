'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddItemDialog } from './add-item-dialog'
import { ItemsTable } from './items-table'
import { Loader2, CheckCircle2, DollarSign, Trash2, Send, ExternalLink, Settings, ChevronLeft, ChevronRight, Sparkles, Archive, ArchiveRestore, HandCoins, WalletCards } from 'lucide-react'
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
import { BatchAIImportDialog } from './batch-ai-import-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteBatchItemsBulkAction } from '@/actions/batch.actions'


export function BatchDetail({
    batch,
    accounts,
    bankMappings,
    webhookLinks = [],
    activeInstallmentAccounts = [],
}: {
    batch: any,
    accounts: any[],
    bankMappings?: any[],
    webhookLinks?: any[],
    activeInstallmentAccounts?: string[]
}) {
    const [sending, setSending] = useState(false)
    const [funding, setFunding] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [updatingCycle, setUpdatingCycle] = useState(false)
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [linkDialogOpen, setLinkDialogOpen] = useState(false)
    const [aiImportOpen, setAiImportOpen] = useState(false)
    const [bulkAction, setBulkAction] = useState<'confirm' | 'delete' | null>(null)

    const router = useRouter()

    const sourceAccount = accounts.find(a => a.id === batch.source_account_id)

    // Memoize items to prevent unstable prop changes to ItemsTable
    const pendingItems = useMemo(() =>
        batch.batch_items?.filter((item: any) => item.status === 'pending' || !item.is_confirmed) || [],
        [batch.batch_items]
    )

    const confirmedItems = useMemo(() =>
        batch.batch_items?.filter((item: any) => item.status === 'confirmed' || item.is_confirmed) || [],
        [batch.batch_items]
    )

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
        setBulkAction('confirm')
        setShowConfirmDialog(true)
    }

    async function handleBulkDelete() {
        if (selectedItemIds.length === 0) return
        setBulkAction('delete')
        setShowConfirmDialog(true)
    }

    async function performBulkAction() {
        if (bulkAction === 'confirm') {
            await performBulkConfirm()
        } else if (bulkAction === 'delete') {
            await performBulkDelete()
        }
    }

    async function performBulkDelete() {
        setDeleting(true)
        try {
            await deleteBatchItemsBulkAction(selectedItemIds, batch.id)
            router.refresh()
            setSelectedItemIds([])
            toast.success('Items deleted')
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete items')
        } finally {
            setDeleting(false)
            setShowConfirmDialog(false)
            setBulkAction(null)
        }
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
            setBulkAction(null)
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
            {/* Context Navigation - Tabs removed (moved to parent) */}

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
                                    {batch.display_name || "Sheet Link"}
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
                            <Link href={`/accounts/v2/${sourceAccount.id}`} className="text-blue-600 hover:underline">
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
                    <CloneBatchDialog batch={batch} accounts={accounts} webhookLinks={webhookLinks} />


                    <Button onClick={handleDelete} disabled={deleting} variant="outline" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete Batch">
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>

                    <div className="w-px h-8 bg-slate-200 mx-2" />

                    {/* Archive/Restore Button */}
                    {batch.is_archived ? (
                        <Button
                            variant="outline"
                            onClick={async () => {
                                if (confirm('Restore this batch?')) {
                                    const { restoreBatchAction } = await import('@/actions/batch.actions')
                                    await restoreBatchAction(batch.id)
                                    toast.success('Batch restored')
                                    router.push('/batch')
                                }
                            }}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Restore
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={async () => {
                                if (confirm('Archive this batch? It will be hidden from the main list.')) {
                                    const { archiveBatchAction } = await import('@/actions/batch.actions')
                                    await archiveBatchAction(batch.id)
                                    toast.success('Batch archived')
                                    router.push('/batch')
                                }
                            }}
                            className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                            title="Archive"
                        >
                            <Archive className="h-4 w-4" />
                        </Button>
                    )}

                    <div className="w-px h-8 bg-slate-200 mx-2" />

                    {batch.source_account_id === SYSTEM_ACCOUNTS.DRAFT_FUND && batch.status === 'funded' && (
                        <div className="flex items-center gap-1 group">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded border border-green-200">
                                <span className="text-[10px] font-bold text-green-700">2</span>
                            </div>
                            <ConfirmSourceDialog batchId={batch.id} accounts={accounts} />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-slate-400 cursor-help hover:text-green-500 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[250px]">
                                        <p><strong>Step 2 - Match Real Source:</strong> After funding all items, reconcile which real account you used to reimburse the Draft Fund.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

                    <div className="flex items-center gap-1 group">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200">
                            <span className="text-[10px] font-bold text-amber-700">1</span>
                        </div>
                        <Button
                            onClick={() => {
                                if (batch.status === 'funded') {
                                    if (confirm('Fund more money for this batch? This will create a new transaction from the source account to the clearing pool.')) {
                                        handleFund()
                                    }
                                } else {
                                    handleFund()
                                }
                            }}
                            disabled={funding || batch.batch_items.length === 0}
                            variant="secondary"
                            className={cn(
                                "border-amber-200 text-amber-700 hover:bg-amber-50",
                                batch.batch_items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                            )}
                        >
                            {funding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <WalletCards className="mr-2 h-4 w-4" />
                            {batch.status === 'funded' ? 'Fund More' : 'Fund'}
                        </Button>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-slate-400 cursor-help hover:text-amber-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px]">
                                    <p><strong>Step 1 - Funding:</strong> Moves money from source to "Batch Clearing".</p>
                                    <p className="mt-1 text-[10px] opacity-80 italic">Example: If you already funded 10M but items now total 12M, "Fund More" adds the remaining 2M. Complete this before matching the real source.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <Button
                        onClick={handleSend}
                        disabled={sending || batch.batch_items.length === 0}
                        variant="outline"
                        className={cn(
                            "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                            batch.batch_items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        )}
                    >
                        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4" />
                        Send to Sheet
                    </Button>

                    <Button
                        onClick={() => setAiImportOpen(true)}
                        variant="ghost"
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        title="AI Import"
                    >
                        <Sparkles className="h-4 w-4" />
                    </Button>

                    <AddItemDialog
                        batchId={batch.id}
                        batchName={batch.name}
                        accounts={accounts}
                        bankType={batch.bank_type || 'VIB'}
                    />
                </div>
            </div>

            <BatchAIImportDialog
                open={aiImportOpen}
                onOpenChange={setAiImportOpen}
                batchId={batch.id}
                onSuccess={() => router.refresh()}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="pending" className="w-full">
                        <div className="flex items-center justify-between gap-4 py-2 px-1 bg-slate-50/50 rounded-lg mb-4">
                            <TabsList className="bg-transparent border-none">
                                <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Pending ({pendingItems.length})
                                </TabsTrigger>
                                <TabsTrigger value="confirmed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Confirmed ({confirmedItems.length})
                                </TabsTrigger>
                            </TabsList>

                            {selectedItemIds.length > 0 && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300 pr-2">
                                    <Button
                                        onClick={handleBulkDelete}
                                        disabled={deleting || confirming}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        {deleting && (bulkAction === 'delete') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete ({selectedItemIds.length})
                                    </Button>
                                    <Button
                                        onClick={handleBulkConfirm}
                                        disabled={confirming || deleting}
                                        size="sm"
                                        className="h-8 bg-green-600 hover:bg-green-700"
                                    >
                                        {confirming && (bulkAction === 'confirm') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Confirm ({selectedItemIds.length})
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-slate-500"
                                        onClick={() => setSelectedItemIds([])}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            )}
                        </div>
                        <TabsContent value="pending" className="mt-0">
                            <ItemsTable
                                items={pendingItems}
                                batchId={batch.id}
                                selectedIds={selectedItemIds}
                                onSelectionChange={setSelectedItemIds}
                                activeInstallmentAccounts={activeInstallmentAccounts}
                                bankType={batch.bank_type || 'VIB'}
                                accounts={accounts}
                                bankMappings={bankMappings}
                            />
                        </TabsContent>
                        <TabsContent value="confirmed" className="mt-4">
                            <ItemsTable
                                items={confirmedItems}
                                batchId={batch.id}
                                selectedIds={selectedItemIds}
                                onSelectionChange={setSelectedItemIds}
                                activeInstallmentAccounts={activeInstallmentAccounts}
                                bankType={batch.bank_type || 'VIB'}
                                accounts={accounts}
                                bankMappings={bankMappings}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                title={bulkAction === 'delete' ? 'Delete Selected Items' : 'Confirm Selected Items'}
                description={bulkAction === 'delete'
                    ? `Are you sure you want to delete ${selectedItemIds.length} items? This action cannot be undone.`
                    : `Are you sure you want to confirm ${selectedItemIds.length} items? This will create ${selectedItemIds.length} transactions and move money to the target accounts.`
                }
                onConfirm={performBulkAction}
                confirmText={bulkAction === 'delete' ? 'Delete' : 'Confirm'}
                cancelText="Cancel"
                variant={bulkAction === 'delete' ? 'destructive' : 'default'}
            />

            <LinkSheetDialog
                isOpen={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                batchId={batch.id}
                initialLink={batch.display_link}
                initialName={batch.display_name}
                onSuccess={() => router.refresh()}
            />
        </div>
    )
}
