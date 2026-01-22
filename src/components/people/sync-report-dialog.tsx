'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, ExternalLink, AlertTriangle, FileSpreadsheet, ListChecks, ShieldCheck } from 'lucide-react'

interface SyncStats {
    syncedCount?: number
    manualPreserved?: number
    totalRows?: number
    sheetUrl?: string | null
}

interface SyncReportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    stats: SyncStats | null
    cycleTag: string
}

export function SyncReportDialog({ open, onOpenChange, stats, cycleTag }: SyncReportDialogProps) {
    if (!stats) return null

    const manualCount = stats.manualPreserved ?? 0
    const syncedCount = stats.syncedCount ?? 0
    const totalRows = stats.totalRows ?? 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="h-5 w-5" />
                        Sync Completed
                    </DialogTitle>
                    <DialogDescription>
                        Summary for <strong>{cycleTag}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Synced Card */}
                        <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <ListChecks className="h-6 w-6 text-emerald-600 mb-2" />
                            <div className="text-2xl font-bold text-emerald-700">{syncedCount}</div>
                            <div className="text-xs font-medium text-emerald-600 uppercase">Synced</div>
                        </div>

                        {/* Manual Preserved Card */}
                        <div className={manualCount > 0 ? "flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-100" : "flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-100 opacity-70"}>
                            <ShieldCheck className={manualCount > 0 ? "h-6 w-6 text-blue-600 mb-2" : "h-6 w-6 text-slate-400 mb-2"} />
                            <div className={manualCount > 0 ? "text-2xl font-bold text-blue-700" : "text-2xl font-bold text-slate-500"}>{manualCount}</div>
                            <div className={manualCount > 0 ? "text-xs font-medium text-blue-600 uppercase" : "text-xs font-medium text-slate-500 uppercase"}>Manual Preserved</div>
                        </div>
                    </div>

                    {/* Total Rows Info */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FileSpreadsheet className="h-4 w-4" />
                            <span>Total Rows in Sheet:</span>
                        </div>
                        <span className="font-bold text-slate-900">{totalRows}</span>
                    </div>

                    {stats.sheetUrl && (
                        <div className="flex justify-center mt-2">
                            <Button
                                variant="outline"
                                className="w-full border-dashed border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                                onClick={() => window.open(stats.sheetUrl!, '_blank')}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Sheet to Verify
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <p className="text-[10px] text-slate-400 self-center">
                        Upsert Strategy v6.3
                    </p>
                    <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
