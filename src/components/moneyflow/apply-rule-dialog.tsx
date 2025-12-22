import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Copy } from "lucide-react"
import { cn } from "@/lib/utils"

type ApplyRuleDialogProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: (targetLevelIds: string[], mode: 'cat_only' | 'cat_rate') => void
    levels: { id: string; name: string }[]
    ruleSummary: string
    currentLevelId: string
    currentLevelName: string
}

export function ApplyRuleDialog({
    isOpen,
    onClose,
    onConfirm,
    levels,
    ruleSummary,
    currentLevelId,
    currentLevelName
}: ApplyRuleDialogProps) {
    const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([])
    const [mode, setMode] = useState<'cat_only' | 'cat_rate'>('cat_only')

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedLevelIds([])
            setMode('cat_only')
        }
    }, [isOpen])

    const handleConfirm = () => {
        onConfirm(selectedLevelIds, mode)
        onClose()
    }

    const toggleLevel = (id: string) => {
        setSelectedLevelIds(prev =>
            prev.includes(id)
                ? prev.filter(l => l !== id)
                : [...prev, id]
        )
    }

    const selectAll = () => {
        if (selectedLevelIds.length === levels.length) {
            setSelectedLevelIds([])
        } else {
            setSelectedLevelIds(levels.map(l => l.id))
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Copy className="h-5 w-5 text-blue-600" />
                        Apply Rule to Other Levels
                    </DialogTitle>
                    <DialogDescription>
                        Copy this rule to other cashback levels.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Source Summary */}
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm">
                        <span className="text-slate-500 font-medium text-xs uppercase tracking-wide block mb-1">Source Rule</span>
                        <div className="flex items-center text-slate-700 font-medium">
                            <span className="truncate">{ruleSummary}</span>
                        </div>
                    </div>

                    {/* Target Levels */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Target Levels</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={selectAll}
                                className="h-auto px-2 py-0.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                                {selectedLevelIds.length === levels.length + 1 ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 border rounded-md p-2 max-h-[160px] overflow-y-auto">
                            {/* Current Level Option */}
                            <div className="flex items-center space-x-2 rounded p-1.5 bg-blue-50/30 border border-blue-100">
                                <Checkbox
                                    id={`level-${currentLevelId}`}
                                    checked={selectedLevelIds.includes(currentLevelId)}
                                    onCheckedChange={() => toggleLevel(currentLevelId)}
                                />
                                <label
                                    htmlFor={`level-${currentLevelId}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                >
                                    {currentLevelName || 'Current Level'} <span className="text-xs text-blue-600">(duplicate in same level)</span>
                                </label>
                            </div>

                            {/* Other Levels */}
                            {levels.length === 0 ? (
                                <p className="text-sm text-slate-400 italic p-2">No other levels available.</p>
                            ) : (
                                levels.map(level => (
                                    <div key={level.id} className="flex items-center space-x-2 rounded p-1.5 hover:bg-slate-50 transition-colors">
                                        <Checkbox
                                            id={`level-${level.id}`}
                                            checked={selectedLevelIds.includes(level.id)}
                                            onCheckedChange={() => toggleLevel(level.id)}
                                        />
                                        <label
                                            htmlFor={`level-${level.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                        >
                                            {level.name || `Level ${level.id.replace('lvl_', '')}`}
                                        </label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Copy Mode */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Copy Mode</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setMode('cat_only')}
                                className={cn(
                                    "flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                                    mode === 'cat_only' ? "border-blue-600 bg-blue-50/50" : "border-muted"
                                )}
                            >
                                <span className="text-sm font-semibold mb-1">Categories Only</span>
                                <span className="text-[10px] text-slate-500 text-center leading-tight">
                                    Inherit 0% rate. Use targeted level's defaults manually later.
                                </span>
                            </div>

                            <div
                                onClick={() => setMode('cat_rate')}
                                className={cn(
                                    "flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                                    mode === 'cat_rate' ? "border-blue-600 bg-blue-50/50" : "border-muted"
                                )}
                            >
                                <span className="text-sm font-semibold mb-1">Clone All</span>
                                <span className="text-[10px] text-slate-500 text-center leading-tight">
                                    Copy Categories, Rate (%) and Max Reward settings exactly.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={selectedLevelIds.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Apply to {selectedLevelIds.length} Level{selectedLevelIds.length !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
