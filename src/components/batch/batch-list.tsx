'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Trash2, ExternalLink } from 'lucide-react'
import { deleteBatchAction } from '@/actions/batch.actions'
import { useRouter } from 'next/navigation'
import { CloneBatchDialog } from './clone-batch-dialog'

type BatchListProps = { batches: any[]; mode?: 'processing' | 'done'; accounts?: any[]; webhookLinks?: any[] }

export function BatchList({ batches, mode, accounts = [], webhookLinks = [] }: BatchListProps) {
    const router = useRouter()

    if (!batches || batches.length === 0) {
        return <div>No batches found. Create one to get started.</div>
    }

    const processingBatches = batches.filter(b => b.status !== 'funded' && b.status !== 'completed')
    const doneBatches = batches.filter(b => b.status === 'funded' || b.status === 'completed')

    async function handleDelete(e: React.MouseEvent, id: string) {
        e.preventDefault() // Prevent navigation to detail page
        e.stopPropagation()

        if (confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
            await deleteBatchAction(id)
            // Ideally we should use optimistic updates or router.refresh() but the action calls revalidatePath
            // router.refresh() might be needed to see changes immediately if not using optimistic UI
        }
    }

    const BatchGrid = ({ items }: { items: any[] }) => (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((batch) => (
                <div key={batch.id} onClick={() => router.push(`/batch/detail/${batch.id}`)}>
                    <Card className="hover:bg-accent transition-colors cursor-pointer group relative">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium truncate pr-8">
                                {batch.name}
                            </CardTitle>
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <CloneBatchDialog batch={batch} accounts={accounts} webhookLinks={webhookLinks} />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                    onClick={(e) => handleDelete(e, batch.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(batch.created_at), 'PPP')}
                                    </p>
                                    {batch.status === 'funded' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            Funded
                                        </span>
                                    )}
                                </div>
                            </div>

                            {batch.display_link && (
                                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-blue-600" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    <a
                                        href={batch.display_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline truncate max-w-[200px]"
                                        title={batch.display_link}
                                    >
                                        {batch.sheet_name || batch.display_link}
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ))}
        </div >
    )

    if (mode === 'processing') {
        return (
            <div className="mt-4">
                {processingBatches.length > 0 ? (
                    <BatchGrid items={processingBatches} />
                ) : (
                    <div className="text-muted-foreground text-sm">No processing batches.</div>
                )}
            </div>
        )
    }

    if (mode === 'done') {
        return (
            <div className="mt-4">
                {doneBatches.length > 0 ? (
                    <BatchGrid items={doneBatches} />
                ) : (
                    <div className="text-muted-foreground text-sm">No completed batches.</div>
                )}
            </div>
        )
    }

    return (
        <Tabs defaultValue="processing" className="w-full">
            <TabsList>
                <TabsTrigger value="processing">Processing ({processingBatches.length})</TabsTrigger>
                <TabsTrigger value="done">Done ({doneBatches.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="processing" className="mt-4">
                {processingBatches.length > 0 ? (
                    <BatchGrid items={processingBatches} />
                ) : (
                    <div className="text-muted-foreground text-sm">No processing batches.</div>
                )}
            </TabsContent>
            <TabsContent value="done" className="mt-4">
                {doneBatches.length > 0 ? (
                    <BatchGrid items={doneBatches} />
                ) : (
                    <div className="text-muted-foreground text-sm">No completed batches.</div>
                )}
            </TabsContent>
        </Tabs>
    )
}
