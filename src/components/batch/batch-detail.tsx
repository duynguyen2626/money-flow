'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BatchItemSlide } from './batch-item-slide'
import { ItemsTable } from './items-table'
import { Loader2, CheckCircle2, DollarSign, Trash2, Send, ExternalLink, Settings, ChevronLeft, ChevronRight, Sparkles, Archive, ArchiveRestore, HandCoins, WalletCards, Plus, Copy, MoreVertical, Wallet, Info } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { sendBatchToSheetAction, fundBatchAction, deleteBatchAction, confirmBatchItemAction, updateBatchCycleAction } from '@/actions/batch.actions'
import { useRouter } from 'next/navigation'
import { CloneBatchDialog } from './clone-batch-dialog'
import { BatchSettingsDialog } from './batch-settings-dialog'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { formatCurrency } from '@/lib/account-utils'
import { formatShortVietnameseCurrency } from '@/lib/number-to-text'
import { ConfirmSourceDialog } from './confirm-source-dialog'
import { SYSTEM_ACCOUNTS } from '@/lib/constants'
import { LinkSheetDialog } from './link-sheet-dialog'
import { BatchAIImportDialog } from './batch-ai-import-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
    const [itemSlideOpen, setItemSlideOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)

    const router = useRouter()

    const sourceAccount = accounts.find(a => a.id === batch.source_account_id)
    const totalAmount = batch.batch_items.reduce((sum: number, item: any) => sum + Math.abs(item.amount ?? 0), 0)
    const filteredBankMappings = useMemo(
        () => (bankMappings || []).filter((b: any) => !b.bank_type || b.bank_type === (batch.bank_type || 'VIB')),
        [bankMappings, batch.bank_type]
    )

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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    {/* Cycle Navigation */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <Button variant="ghost" size="icon" onClick={() => handleCycleUpdate('prev')} disabled={updatingCycle} className="h-8 w-8 hover:bg-white hover:shadow-sm transition-all">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="h-8 w-px bg-slate-200 mx-1" />
                        <Button variant="ghost" size="icon" onClick={() => handleCycleUpdate('next')} disabled={updatingCycle} className="h-8 w-8 hover:bg-white hover:shadow-sm transition-all">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div>
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">{batch.name}</h1>
                            <div className="flex flex-col">
                                <span className="text-xl font-medium text-rose-600 tabular-nums">
                                    {new Intl.NumberFormat('en-US').format(totalAmount)}
                                </span>
                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">
                                    {formatShortVietnameseCurrency(totalAmount)}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 p-1 px-2 bg-slate-50 border border-slate-100 rounded-md">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Source:</span>
                                {sourceAccount ? (
                                    <Link href={`/accounts/${sourceAccount.id}`} className="flex items-center gap-1.5">
                                        {sourceAccount.image_url ? (
                                            <img src={sourceAccount.image_url} alt="" className="w-4 h-4 rounded-none object-contain" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-none bg-slate-900 flex items-center justify-center text-[8px] font-black text-white shrink-0 uppercase">
                                                {sourceAccount.name?.[0]}
                                            </div>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-700 hover:text-blue-600 transition-colors">
                                            {sourceAccount.name}
                                        </span>
                                    </Link>
                                ) : <span className="text-[11px] font-bold text-slate-400">N/A</span>}

                                {batch.status === 'funded' && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-1" />
                                )}
                            </div>

                            {/* Sheet Link & Settings */}
                            <div className="flex items-center gap-1">
                                {batch.display_link ? (
                                    <a
                                        href={batch.display_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all text-blue-600"
                                        title={batch.display_name || "Open Sheet"}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400"
                                        onClick={() => setLinkDialogOpen(true)}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                <BatchSettingsDialog batch={batch} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1.5 items-center">
                    {/* Step 2: Match Real Source Button with Icon + Text */}
                    {batch.source_account_id === SYSTEM_ACCOUNTS.DRAFT_FUND && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(
                                        "flex items-center",
                                        batch.status === 'funded' ? '' : 'opacity-50'
                                    )}>
                                        <ConfirmSourceDialog
                                            batchId={batch.id}
                                            accounts={accounts}
                                            disabled={batch.status !== 'funded'}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px]">
                                    <div>
                                        <p className="font-bold">Step 2: Match Real Source</p>
                                        <p className="text-xs mt-1">After funding all items, reconcile which real account you used to reimburse the Draft Fund.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    <div className="w-px h-6 bg-slate-300 mx-1" />

                    {/* Action Icons: Send to Sheet, AI Import, Add Item */}
                    {batch.sheet_link && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleSend}
                                        disabled={sending || batch.batch_items?.length === 0}
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-slate-600 hover:bg-slate-100"
                                    >
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send to Sheet</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {batch.sheet_link && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => setAiImportOpen(true)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-slate-600 hover:bg-slate-100"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>AI Import</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {/* Add Item Button - always visible */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => {
                                        setEditingItem(null)
                                        setItemSlideOpen(true)
                                    }}
                                    variant="default"
                                    size="icon"
                                    className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add Item</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Batch Actions Dropdown - moved after Add Item */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                onClick={() => {
                                    const cloneBtn = document.querySelector('[data-clone-batch-trigger]') as HTMLButtonElement
                                    cloneBtn?.click()
                                }}
                                className="cursor-pointer"
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                Clone
                            </DropdownMenuItem>
                            {batch.is_archived ? (
                                <DropdownMenuItem
                                    onClick={async () => {
                                        if (confirm('Restore this batch?')) {
                                            const { restoreBatchAction } = await import('@/actions/batch.actions')
                                            await restoreBatchAction(batch.id)
                                            toast.success('Batch restored')
                                            router.push('/batch')
                                        }
                                    }}
                                    className="cursor-pointer text-orange-600"
                                >
                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                    Restore
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    onClick={async () => {
                                        if (confirm('Archive this batch? It will be hidden from the main list.')) {
                                            const { archiveBatchAction } = await import('@/actions/batch.actions')
                                            await archiveBatchAction(batch.id)
                                            toast.success('Batch archived')
                                            router.push('/batch')
                                        }
                                    }}
                                    className="cursor-pointer text-slate-600"
                                >
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={deleting}
                                className="cursor-pointer text-red-600"
                            >
                                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Hidden CloneBatchDialog trigger */}
                    <div className="hidden">
                        <CloneBatchDialog batch={batch} accounts={accounts} webhookLinks={webhookLinks} />
                    </div>
                </div>
            </div>

            <BatchAIImportDialog
                open={aiImportOpen}
                onOpenChange={setAiImportOpen}
                batchId={batch.id}
                onSuccess={() => router.refresh()}
            />

            <BatchItemSlide
                isOpen={itemSlideOpen}
                onOpenChange={setItemSlideOpen}
                batchId={batch.id}
                item={editingItem}
                bankType={batch.bank_type || 'VIB'}
                accounts={accounts}
                bankMappings={filteredBankMappings}
                onSuccess={() => {
                    router.refresh()
                    setEditingItem(null)
                }}
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
                                bankMappings={filteredBankMappings}
                                onEditItem={(item) => {
                                    setEditingItem(item)
                                    setItemSlideOpen(true)
                                }}
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
                                bankMappings={filteredBankMappings}
                                onEditItem={(item) => {
                                    setEditingItem(item)
                                    setItemSlideOpen(true)
                                }}
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
