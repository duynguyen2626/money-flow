'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BatchList } from '@/components/batch/batch-list'
import { CreateBatchDialog } from '@/components/batch/create-batch-dialog'
import { BankMappingImportDialog } from '@/components/batch/bank-mapping-import-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { deleteBankMappingsAction } from '@/actions/bank.actions'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'

export function BatchPageClient({ batches, accounts, bankMappings }: { batches: any[], accounts: any[], bankMappings: any[] }) {
    const router = useRouter()
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    const [selectedMappingIds, setSelectedMappingIds] = useState<string[]>([])
    const [deletingMappings, setDeletingMappings] = useState(false)

    const processingBatches = batches.filter(b => (b.status === 'draft' || !b.status) && !b.is_template)
    const doneBatches = batches.filter(b => b.status === 'funded' && !b.is_template)
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
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Batch Transfers</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Bank Mappings
                    </Button>
                    <CreateBatchDialog accounts={accounts} />
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
                </TabsList>

                <TabsContent value="processing" className="mt-6">
                    <BatchList batches={processingBatches} />
                </TabsContent>

                <TabsContent value="done" className="mt-6">
                    <BatchList batches={doneBatches} />
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
            </Tabs>

            <BankMappingImportDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                onSuccess={() => router.refresh()}
            />
        </div>
    )
}
