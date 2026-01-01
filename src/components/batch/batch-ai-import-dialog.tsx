'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { importBatchItemsAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { Loader2, Sparkles, Upload, FileImage, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface BatchAIImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    batchId: string
    onSuccess?: () => void
}

export function BatchAIImportDialog({ open, onOpenChange, batchId, onSuccess }: BatchAIImportDialogProps) {
    const [text, setText] = useState('')
    const [image, setImage] = useState<string | null>(null)
    const [batchTag, setBatchTag] = useState('')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [parsedItems, setParsedItems] = useState<{
        account_number: string | null;
        receiver_name: string | null;
        bank_name: string | null;
        amount: number | null;
        note: string | null;
    }[]>([])
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            setImage(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const clearImage = () => {
        setImage(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleAnalyze = async () => {
        if (!text && !image) {
            toast.error('Please provide text or an image')
            return
        }

        setIsAnalyzing(true)
        setParsedItems([])

        try {
            const response = await fetch('/api/ai/parse-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, image })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to analyze')

            if (data.result && Array.isArray(data.result) && data.result.length > 0) {
                setParsedItems(data.result)
                toast.success(`Found ${data.result.length} items!`)
            } else {
                toast.warning('AI could not find any transactions.')
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Analysis failed', { description: msg })
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleImport = async () => {
        if (parsedItems.length === 0) return

        setIsImporting(true)
        try {
            // Convert parsed items to TSV format for the existing action
            // Format: STT | Account No | Beneficiary | Bank | Amount | Note
            const tsvData = parsedItems.map((item, index) => {
                const stt = index + 1
                const accNo = item.account_number || ''
                const beneName = item.receiver_name || ''
                const bank = item.bank_name || ''
                const amount = item.amount || 0
                const note = item.note || ''
                return `${stt}\t${accNo}\t${beneName}\t${bank}\t${amount}\t${note}`
            }).join('\n')

            const result = await importBatchItemsAction(batchId, tsvData, batchTag)

            if (result.success > 0) {
                toast.success(`Successfully imported ${result.success} items`)
                setParsedItems([])
                setText('')
                setImage(null)
                onSuccess?.()
                onOpenChange(false)
            } else if (result.errors.length > 0) {
                toast.error(`Import failed with ${result.errors.length} errors`)
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Import failed', { description: msg })
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        AI Batch Import
                    </DialogTitle>
                    <DialogDescription>
                        Paste text or upload an image of the transaction list. AI will extract and format it.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Batch Tag (Note Suffix)</Label>
                        <Input
                            placeholder="e.g. JAN26"
                            value={batchTag}
                            onChange={(e) => setBatchTag(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Text Input</Label>
                            <Textarea
                                placeholder="Paste list text here..."
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="min-h-[150px] font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Image Input</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[150px] bg-slate-50 relative">
                                {image ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img src={image} alt="Preview" className="max-h-[140px] object-contain rounded" />
                                        <button
                                            onClick={clearImage}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <FileImage className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Image
                                        </Button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || (!text && !image)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing with Gemini...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Analyze
                            </>
                        )}
                    </Button>

                    {parsedItems.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-green-600 font-semibold">
                                    Analysis Result ({parsedItems.length} items)
                                </Label>
                            </div>

                            <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">Account</th>
                                            <th className="p-2 text-left">Name</th>
                                            <th className="p-2 text-left">Bank</th>
                                            <th className="p-2 text-right">Amount</th>
                                            <th className="p-2 text-left">Note</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedItems.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono">{item.account_number}</td>
                                                <td className="p-2">{item.receiver_name}</td>
                                                <td className="p-2">{item.bank_name}</td>
                                                <td className="p-2 text-right font-bold">
                                                    {new Intl.NumberFormat('vi-VN').format(item.amount || 0)}
                                                </td>
                                                <td className="p-2 text-slate-500 truncate max-w-[150px]">{item.note}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={parsedItems.length === 0 || isImporting}>
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import {parsedItems.length} Items
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
