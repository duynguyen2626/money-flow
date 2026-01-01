'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { importBatchItemsAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BatchImportDialogProps {
    batchId: string
    batchName: string
    bankType?: 'VIB' | 'MBB'
}

export function BatchImportDialog({ batchId, batchName, bankType = 'VIB' }: BatchImportDialogProps) {
    const [open, setOpen] = useState(false)
    const [excelData, setExcelData] = useState('')
    const [batchTag, setBatchTag] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    async function handleImport() {
        if (!excelData.trim()) return

        setIsSubmitting(true)
        try {
            const result = await importBatchItemsAction(batchId, excelData, batchTag)
            if (result.errors.length > 0) {
                toast.error(`Imported ${result.success} items with ${result.errors.length} errors`)
                console.error(result.errors)
            } else {
                toast.success(`Successfully imported ${result.success} items`)
            }
            setOpen(false)
            setExcelData('')
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('Failed to import items')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Auto-fill tag from batch name if possible (e.g. "CKL 2025-11" -> "2025-11")
    useEffect(() => {
        if (open && batchName) {
            const parts = batchName.split(' ')
            const lastPart = parts[parts.length - 1]
            if (lastPart.includes('-') || lastPart.match(/^[A-Z]+\d+$/)) {
                setBatchTag(lastPart)
            }
        }
    }, [open, batchName])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Import from Excel</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import Batch Items ({bankType})</DialogTitle>
                    <DialogDescription>
                        Paste content from {bankType} Excel file here.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-600">
                        <p className="font-medium mb-2">Instructions:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Copy dữ liệu từ Excel (chọn các cột theo đúng thứ tự)</li>
                            <li>Paste vào ô bên dưới</li>
                            {bankType === 'MBB' ? (
                                <>
                                    <li>Cột 1: STT (Có thể có hoặc không)</li>
                                    <li>Cột 2: Số tài khoản</li>
                                    <li>Cột 3: Tên người thụ hưởng</li>
                                    <li>Cột 4: Ngân hàng thụ hưởng - VD: Agribank (VBA)</li>
                                    <li>Cột 5: Số tiền</li>
                                    <li>Cột 6: Nội dung</li>
                                </>
                            ) : (
                                <>
                                    <li>Cột 1: STT (số thứ tự)</li>
                                    <li>Format 1 (Mới): STT | Số TK | Tên người thụ hưởng | Ngân hàng | Số tiền | Nội dung</li>
                                    <li>Format 2 (Cũ): STT | Tên người hưởng | Số TK | Ngân hàng | Số tiền | Nội dung</li>
                                </>
                            )}
                            <li>Hệ thống sẽ tự động tìm mã ngân hàng và tạo batch items</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Batch Tag (Suffix for Notes)</label>
                        <Input
                            placeholder="e.g. 2025-11"
                            value={batchTag}
                            onChange={(e) => setBatchTag(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Will be appended to notes: [Bank]-[Name]-[Tag]
                        </p>
                    </div>

                    <Textarea
                        placeholder="Paste Excel data here..."
                        className="h-64 font-mono text-xs whitespace-pre"
                        value={excelData}
                        onChange={(e) => setExcelData(e.target.value)}
                    />
                    <Button onClick={handleImport} disabled={isSubmitting || !excelData.trim()} className="w-full">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            'Import Items'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
