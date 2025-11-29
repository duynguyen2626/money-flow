'use client'

import { useEffect, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Trash2, Link2 } from 'lucide-react'
import { createSheetWebhookLinkAction, deleteSheetWebhookLinkAction } from '@/actions/webhook-link.actions'
import { toast } from 'sonner'

type SheetWebhookLink = {
    id: string
    name: string
    url: string
    created_at?: string
}

export function SheetWebhookLinkManager({ initialLinks, onChange }: { initialLinks: SheetWebhookLink[]; onChange?: (links: SheetWebhookLink[]) => void }) {
    const [links, setLinks] = useState<SheetWebhookLink[]>(initialLinks || [])
    const [name, setName] = useState('')
    const [url, setUrl] = useState('')
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        setLinks(initialLinks || [])
    }, [initialLinks])

    useEffect(() => {
        if (onChange) {
            onChange(links)
        }
    }, [links, onChange])

    const handleCreate = () => {
        if (!name.trim() || !url.trim()) {
            toast.error('Please provide both name and URL')
            return
        }

        startTransition(async () => {
            try {
                const newLink = await createSheetWebhookLinkAction({ name: name.trim(), url: url.trim() })
                setLinks(prev => [newLink, ...prev])
                setName('')
                setUrl('')
                toast.success('Webhook link saved')
            } catch (e: any) {
                console.error(e)
                toast.error('Failed to save webhook link')
            }
        })
    }

    const handleDelete = (id: string) => {
        startTransition(async () => {
            try {
                await deleteSheetWebhookLinkAction(id)
                setLinks(prev => prev.filter(l => l.id !== id))
                toast.success('Deleted')
            } catch (e: any) {
                console.error(e)
                toast.error('Failed to delete link')
            }
        })
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Add Webhook Link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Label</label>
                            <Input
                                placeholder="e.g., CKL Sheet Hook"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Webhook URL</label>
                            <Input
                                placeholder="https://script.google.com/..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button onClick={handleCreate} disabled={isPending}>
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {links.map(link => (
                    <Card key={link.id} className="relative">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-slate-500" />
                                {link.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-blue-600 underline break-all"
                            >
                                {link.url}
                            </a>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-slate-500 hover:text-red-600"
                                onClick={() => handleDelete(link.id)}
                                disabled={isPending}
                                title="Delete webhook link"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {links.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                        No webhook links yet. Add one above to reuse when creating batches.
                    </div>
                )}
            </div>
        </div>
    )
}
