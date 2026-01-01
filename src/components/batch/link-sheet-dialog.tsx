"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Link as LinkIcon } from "lucide-react"
import { updateBatchAction } from "@/actions/batch.actions"

interface LinkSheetDialogProps {
    isOpen: boolean
    onClose: () => void
    batchId: string
    initialLink?: string | null
    initialName?: string | null
    onSuccess: (link: string, name: string) => void
}

export function LinkSheetDialog({ isOpen, onClose, batchId, initialLink, initialName, onSuccess }: LinkSheetDialogProps) {
    const [link, setLink] = useState(initialLink || "")
    const [name, setName] = useState(initialName || "")
    const [isSaving, setIsSaving] = useState(false)
    const [isAutoMapping, setIsAutoMapping] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setLink(initialLink || "")
            setName(initialName || "")
        }
    }, [isOpen, initialLink, initialName])

    const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLink = e.target.value
        setLink(newLink)

        // Auto Map Logic
        if (newLink && !name) {
            if (newLink.includes("script.google.com")) {
                setName("Google Apps Script")
            } else if (newLink.includes("docs.google.com/spreadsheets")) {
                // Try to extract name from URL if possible, or just default
                // Real fetching would require a server action to avoid CORS, 
                // but for now let's just set a default if empty.
                setName("Google Sheet")
            }
        }
    }

    const handleSave = async () => {
        if (!link) return

        try {
            setIsSaving(true)

            // Update batch in DB
            await updateBatchAction(batchId, {
                display_link: link,
                display_name: name || "Sheet Link"
            })

            onSuccess(link, name || "Sheet Link")
            onClose()
        } catch (error) {
            console.error("Failed to save sheet link", error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Link to Sheet</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="link">Sheet URL</Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                id="link"
                                value={link}
                                onChange={handleLinkChange}
                                placeholder="https://docs.google.com/spreadsheets/..."
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Google Sheet"
                        />
                        <p className="text-[11px] text-slate-500">
                            This name will be displayed on the badge.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!link || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
