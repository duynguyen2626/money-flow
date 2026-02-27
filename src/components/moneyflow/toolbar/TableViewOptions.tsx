"use client"

import { useState } from "react"
import { SlidersHorizontal, GripVertical, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
// Import types and columns
import { ColumnKey, defaultColumns } from "@/components/app/table/transactionColumns"

interface TableViewOptionsProps {
    visibleColumns: Record<ColumnKey, boolean>
    onVisibilityChange: (cols: Record<ColumnKey, boolean>) => void
    columnOrder: ColumnKey[]
    onOrderChange: (order: ColumnKey[]) => void
}

export function TableViewOptions({
    visibleColumns,
    onVisibilityChange,
    columnOrder,
    onOrderChange,
}: TableViewOptionsProps) {
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    const toggleColumn = (key: ColumnKey) => {
        onVisibilityChange({
            ...visibleColumns,
            [key]: !visibleColumns[key]
        })
    }

    const resetColumns = () => {
        onOrderChange(defaultColumns.map(c => c.key));
        // Reset visibility to all true? Optional. 
        // For now, reset order is primary request.
    }

    // Ensure order sync and filter out 'people'
    const fullOrder = columnOrder.length > 0 ? columnOrder : defaultColumns.map(c => c.key)
    const effectiveOrder = fullOrder

    const handleDragStart = (e: React.DragEvent, index: number) => {
        // Prevent Date dragging
        if (effectiveOrder[index] === 'date') {
            e.preventDefault();
            return;
        }
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Firefox requires setData
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow drop
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const fromIndex = draggingIndex;
        if (fromIndex === null || fromIndex === targetIndex) return;

        // Cannot drop ON date (index 0 usually, or just check key)
        if (effectiveOrder[targetIndex] === 'date') return;

        const newOrder = [...effectiveOrder];
        const [moved] = newOrder.splice(fromIndex, 1);
        newOrder.splice(targetIndex, 0, moved);
        onOrderChange(newOrder);
        setDraggingIndex(null);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2 p-2 px-3 rounded-md border text-sm font-medium shadow-sm transition-colors whitespace-nowrap",
                        "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    )}
                    title="Customize Columns"
                >
                    <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                    <span className="hidden md:inline">Columns</span>
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[280px] p-2 shadow-xl border-slate-200">
                <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2 px-2 py-1 border-b border-slate-100 pb-2">
                        <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Display & Order</h4>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-slate-600 transition-colors"
                            onClick={resetColumns}
                            title="Reset Order"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto px-1 space-y-1">
                        {effectiveOrder.map((key, index) => {
                            const colConfig = defaultColumns.find(c => c.key === key)
                            if (!colConfig) return null

                            const isVisible = visibleColumns[key] !== false
                            const isFrozen = key === 'date';
                            const isDragging = draggingIndex === index;

                            return (
                                <div
                                    key={key}
                                    draggable={!isFrozen}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => !isFrozen && handleDragOver(e, index)}
                                    onDrop={(e) => !isFrozen && handleDrop(e, index)}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-md group transition-colors border border-transparent",
                                        isDragging ? "opacity-50 bg-slate-100 border-slate-200 dashed" : "hover:bg-slate-50 hover:border-slate-100"
                                    )}
                                >
                                    {/* Drag Handle */}
                                    {!isFrozen ? (
                                        <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1">
                                            <GripVertical className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="w-6" /> // Spacer matched to p-1 + icon size
                                    )}

                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Checkbox
                                            id={`col-toggle-${key}`}
                                            checked={isVisible}
                                            onCheckedChange={() => toggleColumn(key)}
                                            disabled={isFrozen} // Lock visibility for Date
                                            className="border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 shrink-0 disabled:opacity-50"
                                        />
                                        <label
                                            htmlFor={`col-toggle-${key}`}
                                            className="text-sm font-medium text-slate-600 group-hover:text-slate-900 cursor-pointer flex-1 select-none truncate"
                                        >
                                            {colConfig.label}
                                        </label>
                                    </div>
                                    {isFrozen && <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-medium">FIXED</span>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
