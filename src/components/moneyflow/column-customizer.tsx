"use client";

import React, { useState } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GripVertical, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type ColumnKey = string;

interface ColumnItem {
    id: ColumnKey;
    label: string;
    frozen?: boolean; // Cannot move or hide
}

interface ColumnCustomizerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: ColumnItem[]; // All columns in current order
    visibleColumns: Record<ColumnKey, boolean>;
    onVisibilityChange: (key: ColumnKey, visible: boolean) => void;
    onOrderChange: (newOrder: ColumnKey[]) => void;
    widths: Record<ColumnKey, number>;
    onWidthChange: (key: ColumnKey, width: number) => void;
}

function SortableItem({
    id,
    label,
    visible,
    frozen,
    width,
    onToggle,
    onWidthChange
}: {
    id: string,
    label: string,
    visible: boolean,
    frozen?: boolean,
    width: number,
    onToggle: (checked: boolean) => void,
    onWidthChange: (width: number) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled: frozen });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : "auto",
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center justify-between p-3 bg-card border rounded-md mb-2",
                isDragging && "shadow-lg bg-accent"
            )}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {frozen ? (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                    <div {...attributes} {...listeners} className="cursor-grab hover:text-primary active:cursor-grabbing shrink-0">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                )}
                <span className="font-medium text-sm truncate mr-2">{label}</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                    <span className="text-xs text-muted-foreground">px</span>
                    <input
                        type="number"
                        className="w-12 h-6 text-xs bg-transparent border-none focus:outline-none text-right"
                        value={width}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) onWidthChange(val);
                        }}
                    />
                </div>

                <Switch
                    checked={visible}
                    onCheckedChange={onToggle}
                    disabled={frozen}
                />
            </div>
        </div>
    );
}

export function ColumnCustomizer({
    open,
    onOpenChange,
    columns,
    visibleColumns,
    onVisibilityChange,
    onOrderChange,
    widths,
    onWidthChange
}: ColumnCustomizerProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = columns.findIndex((col) => col.id === active.id);
            const newIndex = columns.findIndex((col) => col.id === over.id);

            const newOrder = arrayMove(columns, oldIndex, newIndex).map(c => c.id);
            onOrderChange(newOrder);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Customize Columns</DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={columns.map((c) => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {columns.map((col) => (
                                <SortableItem
                                    key={col.id}
                                    id={col.id}
                                    label={col.label}
                                    visible={visibleColumns[col.id]}
                                    frozen={col.frozen}
                                    width={widths[col.id] || 100}
                                    onToggle={(checked) => onVisibilityChange(col.id, checked)}
                                    onWidthChange={(w) => onWidthChange(col.id, w)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </DialogContent>
        </Dialog>
    );
}
