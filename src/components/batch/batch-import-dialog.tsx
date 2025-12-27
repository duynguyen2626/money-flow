'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { importBatchItemsAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface BatchImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    batchId: string
    onSuccess?: () => void
}

export function BatchImportDialog({ open, onOpenChange, batchId, onSuccess }: BatchImportDialogProps) {
    const [excelData, setExcelData] = useState('')
    const [batchTag, setBatchTag] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleImport = async () => {
        if (!excelData.trim()) {
            toast.error('Vui lòng paste dữ liệu từ Excel')
            return
        }

        setIsLoading(true)
        try {
            const result = await importBatchItemsAction(batchId, excelData, batchTag)

            if (result.success > 0) {
                toast.success(`Đã import thành công ${result.success} dòng`)
            }

            if (result.errors.length > 0) {
                toast.error(`Có ${result.errors.length} lỗi khi import`, {
                    description: result.errors.slice(0, 3).join('\n')
                })
            }

            if (result.success > 0) {
                setExcelData('')
                setBatchTag('')
                onSuccess?.()
                onOpenChange(false)
            }
        } catch (error: any) {
            toast.error('Lỗi khi import', {
                description: error.message
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import từ Excel</DialogTitle>
                    <DialogDescription>
                        Paste dữ liệu từ Excel với định dạng: STT | Mã NH - Tên NH ngắn | Tên Ngân hàng đầy đủ
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="batch-tag">Batch Tag (VD: 2025-11)</Label>
                        <Input
                            id="batch-tag"
                            placeholder="2025-11"
                            value={batchTag}
                            onChange={(e) => setBatchTag(e.target.value.toUpperCase())}
                        />
                        <p className="text-xs text-muted-foreground">
                            Tag này sẽ được dùng để tạo Note tự động (VD: VCB 2025-11)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="excel-data">Dữ liệu Excel</Label>
                        <Textarea
                            id="excel-data"
                            placeholder={'Paste dữ liệu từ Excel vào đây...\n\nVD:\n1\t314 - NH Quốc tế VIB\tNH TMCP Quốc tế Việt Nam\n2\t203 - Vietcombank\tVCB - Ngoại Thương (Vietcombank)'}
                            value={excelData}
                            onChange={(e) => setExcelData(e.target.value)}
                            className="min-h-[300px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Mỗi dòng là một ngân hàng. Các cột cách nhau bằng Tab.
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Hướng dẫn:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            <li>Copy dữ liệu từ Excel (chọn 3 cột theo đúng thứ tự)</li>
                            <li>Paste vào ô bên trên</li>
                            <li>Cột 1: STT (số thứ tự)</li>
                            <li>Cột 2: Mã NH - Tên ngân hàng (VD: 314 - NH Quốc tế VIB)</li>
                            <li>Cột 3: Tên ngân hàng đầy đủ (VD: NH TMCP Quốc tế Việt Nam)</li>
                            <li>Hệ thống sẽ tự động tìm mã ngân hàng và tạo batch items</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Hủy
                    </Button>
                    <Button onClick={handleImport} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
