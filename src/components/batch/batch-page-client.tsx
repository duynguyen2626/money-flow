'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BatchList } from '@/components/batch/batch-list'
import { CreateBatchDialog } from '@/components/batch/create-batch-dialog'
import { BankMappingImportDialog } from '@/components/batch/bank-mapping-import-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Plus } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { deleteBankMappingsAction } from '@/actions/bank.actions'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { SheetWebhookLinkManager } from './sheet-webhook-link-manager'
import { Batch } from '@/services/batch.service'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type ManagedAccount = {
    id: string
    name: string
    receiverName: string
    bankNumber: string
}

export function BatchPageClient({ batches, accounts, bankMappings, webhookLinks }: { batches: Batch[], accounts: any[], bankMappings: any[], webhookLinks: any[] }) {
    const router = useRouter()
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    const [selectedMappingIds, setSelectedMappingIds] = useState<string[]>([])
    const [deletingMappings, setDeletingMappings] = useState(false)
    const [webhookLinkItems, setWebhookLinkItems] = useState(webhookLinks)
    const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([])
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [draftManaged, setDraftManaged] = useState<ManagedAccount>({ id: '', name: '', receiverName: '', bankNumber: '' })

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const stored = localStorage.getItem('batch_managed_accounts')
            if (stored) {
                setManagedAccounts(JSON.parse(stored))
            }
        } catch (error) {
            console.error('Failed to load managed accounts', error)
        }
    }, [])

    const saveManagedAccounts = (next: ManagedAccount[]) => {
        setManagedAccounts(next)
        if (typeof window !== 'undefined') {
            localStorage.setItem('batch_managed_accounts', JSON.stringify(next))
        }
    }

    const handleAddManagedAccount = () => {
        if (!draftManaged.name.trim()) {
            toast.error('Account name is required')
            return
        }
        const entry: ManagedAccount = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            name: draftManaged.name.trim(),
            receiverName: draftManaged.receiverName.trim() || draftManaged.name.trim(),
            bankNumber: draftManaged.bankNumber.trim(),
        }
        const next = [entry, ...managedAccounts]
        saveManagedAccounts(next)
        setDraftManaged({ id: '', name: '', receiverName: '', bankNumber: '' })
        setAddModalOpen(false)
    }

    const processingBatches = batches.filter(b => !b.is_template && b.status !== 'funded' && b.status !== 'completed')
    const doneBatches = batches.filter(b => !b.is_template && (b.status === 'funded' || b.status === 'completed'))
    const templateBatches = batches.filter(b => b.is_template)

    async function handleDeleteMappings() {
        if (selectedMappingIds.length === 0) return
        if (!confirm(`Delete ${selectedMappingIds.length} mappings?`)) return
        setDeletingMappings(true)
        try {
            await deleteBankMappingsAction(selectedMappingIds)
            setSelectedMappingIds([])
            toast.success('Mappings deleted')
        } catch (e) {
            console.error(e)
            toast.error('Failed to delete mappings')
        } finally {
            setDeletingMappings(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedMappingIds.length === bankMappings.length) {
            setSelectedMappingIds([])
        } else {
            setSelectedMappingIds(bankMappings.map((m: any) => m.id))
        }
    }

    const toggleSelect = (id: string) => {
        if (selectedMappingIds.includes(id)) {
            setSelectedMappingIds(selectedMappingIds.filter(i => i !== id))
        } else {
            setSelectedMappingIds([...selectedMappingIds, id])
        }
    }

    return (
        <div className="h-full overflow-auto">
            <div className="container mx-auto py-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Batch Transfers</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Import Bank Mappings
                        </Button>
                        <CreateBatchDialog accounts={accounts} webhookLinks={webhookLinkItems} />
                    </div>
                </div>

                <Tabs defaultValue="processing" className="w-full">
                    <TabsList>
                        <TabsTrigger value="processing">
                            Processing ({processingBatches.length})
                        </TabsTrigger>
                        <TabsTrigger value="done">
                            Done ({doneBatches.length})
                        </TabsTrigger>
                        <TabsTrigger value="mappings">
                            Mapping Management ({bankMappings.length})
                        </TabsTrigger>
                        <TabsTrigger value="templates">
                            Monthly Clone ({templateBatches.length})
                        </TabsTrigger>
                        <TabsTrigger value="webhooks">
                            Webhook & Accounts Manage
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="processing" className="mt-6">
                        <BatchList batches={processingBatches} mode="processing" />
                    </TabsContent>

                    <TabsContent value="done" className="mt-6">
                        <BatchList batches={doneBatches} mode="done" />
                    </TabsContent>

                    <TabsContent value="mappings" className="mt-6">
                        <div className="flex justify-end mb-4">
                            {selectedMappingIds.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDeleteMappings}
                                    disabled={deletingMappings}
                                >
                                    {deletingMappings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete Selected ({selectedMappingIds.length})
                                </Button>
                            )}
                        </div>
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b">
                                        <th className="h-12 px-4 w-[50px]">
                                            <Checkbox
                                                checked={bankMappings.length > 0 && selectedMappingIds.length === bankMappings.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="h-12 px-4 text-left align-middle font-medium">Bank Code</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium">Short Name</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium">Full Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bankMappings.map((mapping: any) => (
                                        <tr key={mapping.id} className="border-b hover:bg-muted/50">
                                            <td className="p-4">
                                                <Checkbox
                                                    checked={selectedMappingIds.includes(mapping.id)}
                                                    onCheckedChange={() => toggleSelect(mapping.id)}
                                                />
                                            </td>
                                            <td className="p-4">{mapping.bank_code}</td>
                                            <td className="p-4">{mapping.short_name}</td>
                                            <td className="p-4">{mapping.bank_name}</td>
                                        </tr>
                                    ))}
                                    {bankMappings.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                No bank mappings found. Click "Import Bank Mappings" to add data.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>

                    <TabsContent value="templates" className="mt-6">
                        <BatchList batches={templateBatches} />
                    </TabsContent>

                    <TabsContent value="webhooks" className="mt-6">
                        <Tabs defaultValue="links" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="links">Webhook Links ({webhookLinkItems.length})</TabsTrigger>
                                <TabsTrigger value="accounts">Accounts Manage ({managedAccounts.length})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="links" className="mt-4">
                                <SheetWebhookLinkManager
                                    initialLinks={webhookLinkItems}
                                    onChange={(next) => setWebhookLinkItems(next)}
                                />
                            </TabsContent>
                            <TabsContent value="accounts" className="mt-4">
                                <div className="flex items-center justify-end mb-3">
                                    <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add Managed Account
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-lg">
                                            <DialogHeader>
                                                <DialogTitle>Add Managed Account</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-sm font-semibold text-slate-700">Account Name</label>
                                                    <Input
                                                        value={draftManaged.name}
                                                        onChange={e => setDraftManaged(prev => ({ ...prev, name: e.target.value }))}
                                                        placeholder="e.g., Acb Platinum"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-sm font-semibold text-slate-700">Receiver Name</label>
                                                    <Input
                                                        value={draftManaged.receiverName}
                                                        onChange={e => setDraftManaged(prev => ({ ...prev, receiverName: e.target.value }))}
                                                        placeholder="Receiver name"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-sm font-semibold text-slate-700">Bank Number</label>
                                                    <Input
                                                        value={draftManaged.bankNumber}
                                                        onChange={e => setDraftManaged(prev => ({ ...prev, bankNumber: e.target.value }))}
                                                        placeholder="Bank number"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
                                                <Button onClick={handleAddManagedAccount}>Save</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="border-b">
                                                <th className="h-12 px-4 text-left align-middle font-medium">Account</th>
                                                <th className="h-12 px-4 text-left align-middle font-medium">Receiver Name</th>
                                                <th className="h-12 px-4 text-left align-middle font-medium">Bank Number</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {managedAccounts.map((account: ManagedAccount) => (
                                                <tr key={account.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-4 font-semibold text-slate-800">{account.name}</td>
                                                    <td className="p-4">{account.receiverName || account.name}</td>
                                                    <td className="p-4">{account.bankNumber || '—'}</td>
                                                </tr>
                                            ))}
                                            {managedAccounts.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                                        No managed accounts. Add one to get started.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                </Tabs>

                <BankMappingImportDialog
                    open={importDialogOpen}
                    onOpenChange={setImportDialogOpen}
                    onSuccess={() => router.refresh()}
                />
            </div>
        </div>
    )
}
