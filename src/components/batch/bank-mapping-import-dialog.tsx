'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface BankMappingImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function BankMappingImportDialog({ open, onOpenChange, onSuccess }: BankMappingImportDialogProps) {
    const [excelData, setExcelData] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [bankType, setBankType] = useState<'VIB' | 'MBB'>('VIB')

    const handleImport = async () => {
        if (!excelData.trim()) {
            toast.error('Please paste data from Excel')
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch('/api/bank-mappings/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ excelData, bankType })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Import failed')
            }

            if (result.success > 0) {
                toast.success(`Successfully imported ${result.success} bank mappings`)
            }

            if (result.errors && result.errors.length > 0) {
                toast.error(`${result.errors.length} errors occurred during import`, {
                    description: result.errors.slice(0, 3).join('\n')
                })
            }

            if (result.success > 0) {
                setExcelData('')
                onSuccess?.()
                onOpenChange(false)
            }
        } catch (error: any) {
            toast.error('Import error', {
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
                    <DialogTitle>Import Bank Mappings ({bankType})</DialogTitle>
                    <DialogDescription>
                        Paste data from Excel.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <Label>Format Type:</Label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="radio"
                                id="vib"
                                name="bankType"
                                value="VIB"
                                checked={bankType === 'VIB'}
                                onChange={() => setBankType('VIB')}
                                className="cursor-pointer"
                            />
                            <Label htmlFor="vib" className="cursor-pointer">VIB (Code - Name)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="radio"
                                id="mbb"
                                name="bankType"
                                value="MBB"
                                checked={bankType === 'MBB'}
                                onChange={() => setBankType('MBB')}
                                className="cursor-pointer"
                            />
                            <Label htmlFor="mbb" className="cursor-pointer">MBB (Name (Code))</Label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="excel-data">Excel Data</Label>
                        <Textarea
                            id="excel-data"
                            placeholder={bankType === 'VIB'
                                ? 'Example:\n1\t314 - NH Quốc tế VIB\tNH TMCP Quốc tế Việt Nam'
                                : 'Example:\n1\tNông nghiệp... (VBA)\tNH NN&PTNT Việt Nam'
                            }
                            value={excelData}
                            onChange={(e) => setExcelData(e.target.value)}
                            className="min-h-[300px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Each line represents one bank. Columns are separated by Tab.
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Instructions ({bankType}):</h4>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            <li>Copy data from Excel (select columns)</li>
                            <li>Paste into the box above</li>
                            {bankType === 'VIB' ? (
                                <>
                                    <li>Column 1: STT (optional)</li>
                                    <li>Column 2: Bank Code - Short Name (e.g., 314 - NH Quốc tế VIB)</li>
                                    <li>Column 3: Full Bank Name</li>
                                </>
                            ) : (
                                <>
                                    <li>Column 1: Bank Name with Code in parens - e.g. &quot;Agribank (VBA)&quot;</li>
                                    <li>(Optional) Column 2: Full Bank Name</li>
                                </>
                            )}
                            <li>System will extract Code "314" (VIB) or "VBA" (MBB).</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
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
